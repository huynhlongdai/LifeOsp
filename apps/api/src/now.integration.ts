import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for B3 NOW integration tests");

type App = ReturnType<typeof buildApp>;
type Database = ReturnType<typeof createDatabaseClient>;
type SessionCookie = { header: string; token: string };

type ExecutionIds = { seasonId: string; outcomeId: string; projectId: string };

function sessionCookieFromResponse(setCookieHeader: string | string[] | undefined): SessionCookie {
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(setCookie);
  const match = new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match?.[1]);
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
  assert.ok(userId);
  return userId;
}

async function setupExecutionContext(database: Database, userId: string): Promise<ExecutionIds> {
  const direction = await database.pool.query<{ id: string }>(
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'B3 direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'Build independent income', 'Ship one real outcome.', 'active', 'Affiliate experiment') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, success_definition, status) values ($1, $2, 'First test published', 'One real test is live.', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);

  const project = await database.pool.query<{ id: string }>(
    "insert into projects (user_id, outcome_id, title, status) values ($1, $2, 'Affiliate test', 'active') returning id",
    [userId, outcomeId]
  );
  const projectId = project.rows[0]?.id;
  assert.ok(projectId);

  return { seasonId, outcomeId, projectId };
}

async function insertAction(
  database: Database,
  userId: string,
  ids: ExecutionIds,
  title: string,
  status: "ready" | "blocked"
): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    `insert into actions
      (user_id, outcome_id, project_id, title, done_condition, estimated_minutes, status, priority, created_at, updated_at)
     values ($1, $2, $3, $4, $5, 40, $6, 4, now(), now()) returning id`,
    [userId, ids.outcomeId, ids.projectId, title, `${title} is observably finished.`, status]
  );
  const id = result.rows[0]?.id;
  assert.ok(id);
  return id;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("B3 NOW is server-derived and user controls persist without mutating execution state", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const stranger = await bootstrap(app);
    createdUserIds.add(await userIdForToken(database, stranger.token));

    const noDirection = await app.inject({ method: "GET", url: "/v1/now", headers: { cookie: owner.header } });
    assert.equal(noDirection.statusCode, 200);
    assert.equal(noDirection.json().state, "no_direction");

    const ids = await setupExecutionContext(database, ownerUserId);
    const actionId = await insertAction(database, ownerUserId, ids, "Chọn 3 sản phẩm đầu tiên để test", "ready");
    await insertAction(database, ownerUserId, ids, "Action đang chờ dependency", "blocked");

    const beforeRefresh = await app.inject({ method: "GET", url: "/v1/now", headers: { cookie: owner.header } });
    assert.equal(beforeRefresh.statusCode, 200);
    assert.equal(beforeRefresh.json().state, "no_ready_action");
    assert.equal(beforeRefresh.json().reason, "recommendation_missing");
    assert.equal(beforeRefresh.json().readyActionCount, 1);

    const refreshed = await app.inject({ method: "POST", url: "/v1/now/refresh", headers: { cookie: owner.header } });
    assert.equal(refreshed.statusCode, 200);
    const ready = refreshed.json();
    assert.equal(ready.state, "ready");
    assert.equal(ready.action.id, actionId);
    assert.equal(ready.recommendation.status, "shown");
    assert.ok(ready.recommendation.evidence.length >= 4);
    assert.equal(ready.season.id, ids.seasonId);
    const recommendationId = ready.recommendation.id as string;

    const strangerResolve = await app.inject({
      method: "POST",
      url: `/v1/now/recommendations/${recommendationId}/resolve`,
      headers: { cookie: stranger.header },
      payload: { resolution: "accepted" }
    });
    assert.equal(strangerResolve.statusCode, 404, "NOW controls remain session-owned");

    const edited = await app.inject({
      method: "POST",
      url: `/v1/now/recommendations/${recommendationId}/resolve`,
      headers: { cookie: owner.header },
      payload: {
        resolution: "edited",
        action: {
          title: "Lưu 3 sản phẩm affiliate đầu tiên để test",
          doneCondition: "Ba URL sản phẩm đã được lưu.",
          estimatedMinutes: 25
        }
      }
    });
    assert.equal(edited.statusCode, 200);
    assert.equal(edited.json().state, "ready");
    assert.equal(edited.json().recommendation.status, "edited");
    assert.equal(edited.json().action.title, "Lưu 3 sản phẩm affiliate đầu tiên để test");
    assert.equal(edited.json().action.estimatedMinutes, 25);

    const afterEdit = await database.pool.query<{ status: string; title: string }>(
      "select status, title from actions where id = $1",
      [actionId]
    );
    assert.equal(afterEdit.rows[0]?.status, "ready", "Edit must not start or postpone the Action");
    assert.equal(afterEdit.rows[0]?.title, "Lưu 3 sản phẩm affiliate đầu tiên để test");

    const wrongAssumption = await app.inject({
      method: "POST",
      url: `/v1/now/recommendations/${recommendationId}/resolve`,
      headers: { cookie: owner.header },
      payload: { resolution: "wrong_assumption" }
    });
    assert.equal(wrongAssumption.statusCode, 200);
    assert.equal(wrongAssumption.json().state, "no_ready_action");
    assert.equal(wrongAssumption.json().reason, "recommendation_resolved");

    const unchanged = await database.pool.query<{ status: string }>("select status from actions where id = $1", [actionId]);
    assert.equal(unchanged.rows[0]?.status, "ready", "Wrong assumption must not mutate Action execution status");

    const explicitRefresh = await app.inject({ method: "POST", url: "/v1/now/refresh", headers: { cookie: owner.header } });
    assert.equal(explicitRefresh.statusCode, 200);
    assert.equal(explicitRefresh.json().state, "ready");
    const secondRecommendationId = explicitRefresh.json().recommendation.id as string;
    assert.notEqual(secondRecommendationId, recommendationId);

    const accepted = await app.inject({
      method: "POST",
      url: `/v1/now/recommendations/${secondRecommendationId}/resolve`,
      headers: { cookie: owner.header },
      payload: { resolution: "accepted" }
    });
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.json().state, "ready");
    assert.equal(accepted.json().recommendation.status, "accepted");

    const afterAccept = await database.pool.query<{ status: string }>("select status from actions where id = $1", [actionId]);
    assert.equal(afterAccept.rows[0]?.status, "ready", "Accept must not create B4 execution semantics");

    const events = await database.pool.query<{ type: string; payload: { actionId?: string } }>(
      `select type, payload from life_events
       where user_id = $1 and entity_type = 'recommendation'
         and type in ('recommendation.edited', 'recommendation.wrong_assumption', 'recommendation.accepted')
       order by occurred_at`,
      [ownerUserId]
    );
    assert.deepEqual(events.rows.map((row) => row.type), [
      "recommendation.edited",
      "recommendation.wrong_assumption",
      "recommendation.accepted"
    ]);
    assert.equal(events.rows.every((row) => row.payload.actionId === actionId), true);

    await database.pool.query("update actions set status = 'blocked', blocked_reason = 'Waiting for source data' where id = $1", [actionId]);
    const blocked = await app.inject({ method: "GET", url: "/v1/now", headers: { cookie: owner.header } });
    assert.equal(blocked.statusCode, 200);
    assert.equal(blocked.json().state, "blocked");
    assert.equal(blocked.json().blockedActionCount, 2);
  } finally {
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B3 edit and recommendation resolution roll back atomically if audit event fails", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();
  let triggerCreated = false;

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);
    const actionId = await insertAction(database, ownerUserId, ids, "Atomic NOW edit", "ready");

    const refreshed = await app.inject({ method: "POST", url: "/v1/now/refresh", headers: { cookie: owner.header } });
    assert.equal(refreshed.statusCode, 200);
    const recommendationId = refreshed.json().recommendation.id as string;

    await database.pool.query(`
      create or replace function b3_fail_resolution_event() returns trigger as $$
      begin
        if new.type = 'recommendation.edited' and new.user_id = '${ownerUserId}'::uuid then
          raise exception 'forced B3 recommendation audit failure';
        end if;
        return new;
      end;
      $$ language plpgsql;
    `);
    await database.pool.query(`
      create trigger b3_fail_resolution_event_trigger
      before insert on life_events
      for each row execute function b3_fail_resolution_event();
    `);
    triggerCreated = true;

    const failed = await app.inject({
      method: "POST",
      url: `/v1/now/recommendations/${recommendationId}/resolve`,
      headers: { cookie: owner.header },
      payload: { resolution: "edited", action: { title: "This must roll back" } }
    });
    assert.equal(failed.statusCode, 500);

    const action = await database.pool.query<{ title: string; status: string }>(
      "select title, status from actions where id = $1",
      [actionId]
    );
    assert.equal(action.rows[0]?.title, "Atomic NOW edit");
    assert.equal(action.rows[0]?.status, "ready");

    const recommendation = await database.pool.query<{ status: string }>(
      "select status from recommendations where id = $1",
      [recommendationId]
    );
    assert.equal(recommendation.rows[0]?.status, "shown");
  } finally {
    if (triggerCreated) await database.pool.query("drop trigger if exists b3_fail_resolution_event_trigger on life_events");
    await database.pool.query("drop function if exists b3_fail_resolution_event()");
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
