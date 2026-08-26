import assert from "node:assert/strict";
import test from "node:test";
import type { MissingNextActionProvider } from "@lifeos/ai";
import { createDatabaseClient } from "@lifeos/db";
import {
  MISSING_NEXT_ACTION_CONTRACT_ID,
  MISSING_NEXT_ACTION_CONTRACT_VERSION
} from "@lifeos/domain";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for B1 Action integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;
type SessionCookie = { header: string; token: string };
type ExecutionIds = { seasonId: string; outcomeId: string; projectId: string };

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): SessionCookie {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie, "expected Set-Cookie header");
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1], "expected LifeOS session cookie");
  const token = decodeURIComponent(match[1]);
  return { header: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, token };
}

async function bootstrap(app: App): Promise<SessionCookie> {
  const response = await app.inject({ method: "POST", url: "/v1/session/bootstrap" });
  assert.equal(response.statusCode, 201);
  return sessionCookieFromResponse(response.headers["set-cookie"]);
}

async function userIdForToken(database: Database, token: string): Promise<string> {
  const result = await database.pool.query<{ user_id: string }>(
    "select user_id from sessions where token_hash = $1",
    [hashSessionToken(token)]
  );
  const userId = result.rows[0]?.user_id;
  assert.ok(userId, "expected session-owned user");
  return userId;
}

async function setupExecutionContext(database: Database, userId: string): Promise<ExecutionIds> {
  const direction = await database.pool.query<{ id: string }>(
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'B1 direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'B1 season', 'Turn execution context into one concrete Action.', 'active', 'Ship the execution loop') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, success_definition, status) values ($1, $2, 'Usable execution loop', 'One user-confirmed Action can be started without another planning session.', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);

  const project = await database.pool.query<{ id: string }>(
    "insert into projects (user_id, outcome_id, title, description, status) values ($1, $2, 'Vertical Slice B', 'Build the bounded execution path.', 'active') returning id",
    [userId, outcomeId]
  );
  const projectId = project.rows[0]?.id;
  assert.ok(projectId);

  return { seasonId, outcomeId, projectId };
}

function manualPayload(ids: ExecutionIds) {
  return {
    outcomeId: ids.outcomeId,
    projectId: ids.projectId,
    title: "Select three products to test",
    doneCondition: "Three products are saved with a reason each.",
    estimatedMinutes: 30,
    priority: 1
  };
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("B1 manual Action candidate stays private, rechecks active context, confirms to ready and reloads", async () => {
  let app: App | null = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));
    const ids = await setupExecutionContext(database, ownerUserId);

    const ownershipInjection = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/manual",
      headers: { cookie: owner.header },
      payload: { ...manualPayload(ids), userId: ownerUserId }
    });
    assert.equal(ownershipInjection.statusCode, 400, "client must never choose Action ownership");

    const crossOwnerCreate = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/manual",
      headers: { cookie: stranger.header },
      payload: manualPayload(ids)
    });
    assert.equal(crossOwnerCreate.statusCode, 404);

    const created = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/manual",
      headers: { cookie: owner.header },
      payload: manualPayload(ids)
    });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().status, "candidate");
    assert.equal(created.json().outcomeId, ids.outcomeId);
    assert.equal(created.json().projectId, ids.projectId);
    const actionId = created.json().id as string;
    assert.ok(actionId);

    const strangerRead = await app.inject({
      method: "GET",
      url: `/v1/actions/${actionId}`,
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerRead.statusCode, 404);

    const strangerConfirm = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/confirm`,
      headers: { cookie: stranger.header },
      payload: {}
    });
    assert.equal(strangerConfirm.statusCode, 404);

    await database.pool.query("update seasons set status = 'paused', updated_at = now() where id = $1", [ids.seasonId]);
    const blockedConfirm = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/confirm`,
      headers: { cookie: owner.header },
      payload: {}
    });
    assert.equal(blockedConfirm.statusCode, 409, "candidate cannot become ready after its Season is paused");
    const stillCandidate = await database.pool.query<{ status: string }>("select status from actions where id = $1", [actionId]);
    assert.equal(stillCandidate.rows[0]?.status, "candidate");

    await database.pool.query("update seasons set status = 'active', updated_at = now() where id = $1", [ids.seasonId]);
    const confirmed = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/confirm`,
      headers: { cookie: owner.header },
      payload: {
        title: "Select and save three products to test",
        doneCondition: "Three test products are saved with demand signal, price and one reason each.",
        estimatedMinutes: 35
      }
    });
    assert.equal(confirmed.statusCode, 200);
    assert.equal(confirmed.json().status, "ready");
    assert.equal(confirmed.json().title, "Select and save three products to test");

    const events = await database.pool.query<{ type: string; source: string; entity_id: string | null }>(
      "select type, source, entity_id from life_events where user_id = $1 and entity_id = $2 and type in ('action.created', 'action.ready') order by type",
      [ownerUserId, actionId]
    );
    assert.deepEqual(
      events.rows.map((row) => ({ type: row.type, source: row.source, entityId: row.entity_id })),
      [
        { type: "action.created", source: "user", entityId: actionId },
        { type: "action.ready", source: "user", entityId: actionId }
      ]
    );

    await app.close();
    app = buildApp({ databaseUrl });
    const restored = await app.inject({
      method: "GET",
      url: `/v1/actions/${actionId}`,
      headers: { cookie: owner.header }
    });
    assert.equal(restored.statusCode, 200);
    assert.equal(restored.json().status, "ready");
    assert.equal(restored.json().outcomeId, ids.outcomeId);
    assert.equal(restored.json().projectId, ids.projectId);

    const duplicateConfirm = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/confirm`,
      headers: { cookie: owner.header },
      payload: {}
    });
    assert.equal(duplicateConfirm.statusCode, 409);
    assert.equal(duplicateConfirm.json().error, "invalid_status");
  } finally {
    if (app) await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B1 AI invalid/failure creates no Action state while valid proposal remains candidate until user confirmation", async () => {
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();
  let app: App | null = null;

  const invalidProvider: MissingNextActionProvider = {
    async propose() {
      return {
        output: {
          contractId: MISSING_NEXT_ACTION_CONTRACT_ID,
          contractVersion: MISSING_NEXT_ACTION_CONTRACT_VERSION,
          proposal: {
            title: "Unsafe provider output",
            doneCondition: "Should never persist",
            estimatedMinutes: 20,
            reason: "Invalid because it exposes an unknown field",
            assumptions: [],
            chainOfThought: "must be rejected"
          }
        }
      };
    }
  };

  const failingProvider: MissingNextActionProvider = {
    async propose() {
      throw new Error("fixture provider unavailable");
    }
  };

  try {
    app = buildApp({ databaseUrl, action: { provider: invalidProvider, timeoutMs: 500 } });
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);

    const invalid = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/propose",
      headers: { cookie: owner.header },
      payload: { outcomeId: ids.outcomeId, projectId: ids.projectId }
    });
    assert.equal(invalid.statusCode, 422);
    assert.equal(invalid.json().manualFallback, true);
    const afterInvalid = await database.pool.query<{ count: string }>("select count(*)::text as count from actions where user_id = $1", [ownerUserId]);
    assert.equal(afterInvalid.rows[0]?.count, "0", "invalid AI output must create zero Action rows");

    const manualFallback = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/manual",
      headers: { cookie: owner.header },
      payload: manualPayload(ids)
    });
    assert.equal(manualFallback.statusCode, 201, "manual path must remain usable after invalid AI output");

    await app.close();
    app = buildApp({ databaseUrl, action: { provider: failingProvider, timeoutMs: 500 } });
    const failed = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/propose",
      headers: { cookie: owner.header },
      payload: { outcomeId: ids.outcomeId, projectId: ids.projectId }
    });
    assert.equal(failed.statusCode, 503);
    assert.equal(failed.json().manualFallback, true);
    const afterFailure = await database.pool.query<{ count: string }>("select count(*)::text as count from actions where user_id = $1", [ownerUserId]);
    assert.equal(afterFailure.rows[0]?.count, "1", "provider failure must not create another Action row");

    let receivedContext = false;
    const validProvider: MissingNextActionProvider = {
      async propose(input) {
        receivedContext =
          input.season.id === ids.seasonId &&
          input.outcome.id === ids.outcomeId &&
          input.project?.id === ids.projectId &&
          input.contractId === MISSING_NEXT_ACTION_CONTRACT_ID;
        return {
          output: {
            contractId: MISSING_NEXT_ACTION_CONTRACT_ID,
            contractVersion: MISSING_NEXT_ACTION_CONTRACT_VERSION,
            proposal: {
              title: "Save five real product candidates",
              doneCondition: "Five products are saved with price and demand signal.",
              estimatedMinutes: 25,
              reason: "Real product inputs are the smallest evidence-producing next step.",
              assumptions: ["Marketplace access is available"]
            }
          },
          runtime: { provider: "fixture", model: "b1-valid", latencyMs: 1 }
        };
      }
    };

    await app.close();
    app = buildApp({ databaseUrl, action: { provider: validProvider, timeoutMs: 500 } });
    const proposed = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/propose",
      headers: { cookie: owner.header },
      payload: { outcomeId: ids.outcomeId, projectId: ids.projectId }
    });
    assert.equal(proposed.statusCode, 201);
    assert.equal(receivedContext, true, "provider must receive confirmed execution context, not arbitrary free text");
    assert.equal(proposed.json().action.status, "candidate", "AI must never silently create a ready Action");
    assert.equal(proposed.json().proposal.reason, "Real product inputs are the smallest evidence-producing next step.");
    const aiActionId = proposed.json().action.id as string;

    const aiCreatedEvent = await database.pool.query<{ source: string }>(
      "select source from life_events where user_id = $1 and entity_id = $2 and type = 'action.created'",
      [ownerUserId, aiActionId]
    );
    assert.equal(aiCreatedEvent.rows[0]?.source, "ai");

    const confirmed = await app.inject({
      method: "POST",
      url: `/v1/actions/${aiActionId}/confirm`,
      headers: { cookie: owner.header },
      payload: {}
    });
    assert.equal(confirmed.statusCode, 200);
    assert.equal(confirmed.json().status, "ready");
    const readyEvent = await database.pool.query<{ source: string }>(
      "select source from life_events where user_id = $1 and entity_id = $2 and type = 'action.ready'",
      [ownerUserId, aiActionId]
    );
    assert.equal(readyEvent.rows[0]?.source, "user", "only explicit user confirmation may create action.ready");
  } finally {
    if (app) await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B1 Action state and LifeEvents roll back together when audit persistence fails", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);

    await database.pool.query(`
      create or replace function test_fail_b1_action_event() returns trigger as $$
      begin
        if NEW.type = 'action.created' then
          raise exception 'forced B1 action.created failure';
        end if;
        return NEW;
      end;
      $$ language plpgsql;
      create trigger test_fail_b1_action_event_trigger
      before insert on life_events
      for each row execute function test_fail_b1_action_event();
    `);

    const failedCreate = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/manual",
      headers: { cookie: owner.header },
      payload: manualPayload(ids)
    });
    assert.equal(failedCreate.statusCode, 500);
    const afterFailedCreate = await database.pool.query<{ count: string }>("select count(*)::text as count from actions where user_id = $1", [ownerUserId]);
    assert.equal(afterFailedCreate.rows[0]?.count, "0", "candidate row must roll back with action.created failure");

    await database.pool.query("drop trigger test_fail_b1_action_event_trigger on life_events");
    await database.pool.query("drop function test_fail_b1_action_event()");

    const created = await app.inject({
      method: "POST",
      url: "/v1/actions/candidates/manual",
      headers: { cookie: owner.header },
      payload: manualPayload(ids)
    });
    assert.equal(created.statusCode, 201);
    const actionId = created.json().id as string;

    await database.pool.query(`
      create or replace function test_fail_b1_ready_event() returns trigger as $$
      begin
        if NEW.type = 'action.ready' then
          raise exception 'forced B1 action.ready failure';
        end if;
        return NEW;
      end;
      $$ language plpgsql;
      create trigger test_fail_b1_ready_event_trigger
      before insert on life_events
      for each row execute function test_fail_b1_ready_event();
    `);

    const failedConfirm = await app.inject({
      method: "POST",
      url: `/v1/actions/${actionId}/confirm`,
      headers: { cookie: owner.header },
      payload: {}
    });
    assert.equal(failedConfirm.statusCode, 500);
    const afterFailedConfirm = await database.pool.query<{ status: string }>("select status from actions where id = $1", [actionId]);
    assert.equal(afterFailedConfirm.rows[0]?.status, "candidate", "candidate must remain candidate when action.ready audit fails");
  } finally {
    await database.pool.query("drop trigger if exists test_fail_b1_action_event_trigger on life_events").catch(() => undefined);
    await database.pool.query("drop function if exists test_fail_b1_action_event()").catch(() => undefined);
    await database.pool.query("drop trigger if exists test_fail_b1_ready_event_trigger on life_events").catch(() => undefined);
    await database.pool.query("drop function if exists test_fail_b1_ready_event()").catch(() => undefined);
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
    await app.close();
  }
});
