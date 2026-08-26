import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseClient } from "@lifeos/db";
import { NEXT_ACTION_RULESET_VERSION } from "@lifeos/domain";
import { buildApp } from "./app.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./identity.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for B2 Next Action integration tests");

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
    "insert into directions (user_id, title, status, confirmed_at) values ($1, 'B2 direction', 'active', now()) returning id",
    [userId]
  );
  const directionId = direction.rows[0]?.id;
  assert.ok(directionId);

  const season = await database.pool.query<{ id: string }>(
    "insert into seasons (user_id, direction_id, title, purpose, status, primary_focus_text) values ($1, $2, 'B2 season', 'Choose one explainable next Action.', 'active', 'Ship deterministic execution') returning id",
    [userId, directionId]
  );
  const seasonId = season.rows[0]?.id;
  assert.ok(seasonId);

  const outcome = await database.pool.query<{ id: string }>(
    "insert into outcomes (user_id, season_id, title, success_definition, status) values ($1, $2, 'Deterministic recommendation', 'One traceable shown recommendation exists.', 'active') returning id",
    [userId, seasonId]
  );
  const outcomeId = outcome.rows[0]?.id;
  assert.ok(outcomeId);

  const project = await database.pool.query<{ id: string }>(
    "insert into projects (user_id, outcome_id, title, description, status) values ($1, $2, 'Next Action Engine', 'Rank only eligible ready Actions.', 'active') returning id",
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
  values: {
    title: string;
    status: string;
    priority?: number;
    estimatedMinutes?: number;
    scheduledFor?: string;
    createdAt?: string;
  }
): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    `insert into actions
      (user_id, outcome_id, project_id, title, done_condition, estimated_minutes, status, priority, scheduled_for, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, coalesce($10::timestamptz, now()), now())
     returning id`,
    [
      userId,
      ids.outcomeId,
      ids.projectId,
      values.title,
      `${values.title} is observably finished.`,
      values.estimatedMinutes ?? null,
      values.status,
      values.priority ?? null,
      values.scheduledFor ?? null,
      values.createdAt ?? null
    ]
  );
  const id = result.rows[0]?.id;
  assert.ok(id);
  return id;
}

async function deleteUsers(database: Database, userIds: Set<string>) {
  for (const userId of userIds) await database.pool.query("delete from users where id = $1", [userId]);
}

test("B2 ranks deterministically, stores explainable evidence, refreshes one shown recommendation and withdraws stale state", async () => {
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

    const priorityActionId = await insertAction(database, ownerUserId, ids, {
      title: "Prepare launch checklist",
      status: "ready",
      priority: 2,
      estimatedMinutes: 45,
      createdAt: "2026-08-25T08:00:00.000Z"
    });
    const urgentActionId = await insertAction(database, ownerUserId, ids, {
      title: "Confirm first test product",
      status: "ready",
      priority: 1,
      estimatedMinutes: 30,
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      createdAt: "2026-08-25T09:00:00.000Z"
    });
    const blockedActionId = await insertAction(database, ownerUserId, ids, {
      title: "Blocked but artificially high score",
      status: "blocked",
      priority: 999,
      estimatedMinutes: 10,
      scheduledFor: "2026-01-01T00:00:00.000Z"
    });

    const strangerGenerate = await app.inject({
      method: "POST",
      url: "/v1/recommendations/next-action",
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerGenerate.statusCode, 409);
    assert.equal(strangerGenerate.json().error, "no_active_season");

    const generated = await app.inject({
      method: "POST",
      url: "/v1/recommendations/next-action",
      headers: { cookie: owner.header }
    });
    assert.equal(generated.statusCode, 200);
    const first = generated.json();
    assert.equal(first.rulesetVersion, NEXT_ACTION_RULESET_VERSION);
    assert.equal(first.actionId, urgentActionId);
    assert.notEqual(first.actionId, blockedActionId, "hard-invalid Action must never win");
    assert.equal(first.seasonId, ids.seasonId);
    assert.equal(first.outcomeId, ids.outcomeId);
    assert.equal(first.projectId, ids.projectId);
    assert.ok(first.factors.some((factor: { key: string }) => factor.key === "urgency"));
    const recommendationId = first.recommendationId as string;
    assert.ok(recommendationId);

    const storedEvidence = await database.pool.query<{
      evidence_type: string;
      entity_id: string | null;
      value_json: { score?: number; rulesetVersion?: string };
    }>(
      "select evidence_type, entity_id, value_json from recommendation_evidence where recommendation_id = $1 order by evidence_type",
      [recommendationId]
    );
    assert.ok(storedEvidence.rowCount && storedEvidence.rowCount >= 4);
    assert.equal(storedEvidence.rows.every((row) => row.entity_id === urgentActionId), true);
    assert.equal(storedEvidence.rows.every((row) => row.value_json.rulesetVersion === NEXT_ACTION_RULESET_VERSION), true);
    assert.equal(storedEvidence.rows.every((row) => typeof row.value_json.score === "number"), true);

    const strangerRead = await app.inject({
      method: "GET",
      url: "/v1/recommendations/next-action",
      headers: { cookie: stranger.header }
    });
    assert.equal(strangerRead.statusCode, 404, "recommendations stay session-owned");

    await database.pool.query(
      "update actions set priority = 20, scheduled_for = now(), updated_at = now() where id = $1",
      [priorityActionId]
    );
    await database.pool.query(
      "update actions set scheduled_for = now() + interval '14 days', updated_at = now() where id = $1",
      [urgentActionId]
    );

    const rerun = await app.inject({
      method: "POST",
      url: "/v1/recommendations/next-action",
      headers: { cookie: owner.header }
    });
    assert.equal(rerun.statusCode, 200);
    const refreshed = rerun.json();
    assert.equal(refreshed.actionId, priorityActionId);
    assert.equal(refreshed.recommendationId, recommendationId, "rerun refreshes the one shown recommendation");

    const shownCount = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from recommendations where user_id = $1 and kind = 'next_action' and status = 'shown'",
      [ownerUserId]
    );
    assert.equal(shownCount.rows[0]?.count, "1");

    const shownEvents = await database.pool.query<{
      payload: { actionId?: string; refreshed?: boolean; factors?: Array<{ key?: string; score?: number }> };
    }>(
      "select payload from life_events where user_id = $1 and type = 'recommendation.shown' and entity_id = $2 order by occurred_at",
      [ownerUserId, recommendationId]
    );
    assert.equal(shownEvents.rowCount, 2);
    assert.equal(shownEvents.rows[0]?.payload.actionId, urgentActionId);
    assert.equal(shownEvents.rows[0]?.payload.refreshed, false);
    assert.ok(shownEvents.rows[0]?.payload.factors?.some((factor) => factor.key === "urgency"));
    assert.equal(shownEvents.rows[1]?.payload.actionId, priorityActionId);
    assert.equal(shownEvents.rows[1]?.payload.refreshed, true);

    await app.close();
    app = buildApp({ databaseUrl });
    const restored = await app.inject({
      method: "GET",
      url: "/v1/recommendations/next-action",
      headers: { cookie: owner.header }
    });
    assert.equal(restored.statusCode, 200);
    assert.equal(restored.json().recommendationId, recommendationId);
    assert.equal(restored.json().actionId, priorityActionId);
    assert.equal(restored.json().rulesetVersion, NEXT_ACTION_RULESET_VERSION);

    await database.pool.query(
      "update actions set status = case when id = $1 then 'blocked' else 'completed' end, updated_at = now() where id = any($2::uuid[])",
      [priorityActionId, [priorityActionId, urgentActionId]]
    );
    const noEligible = await app.inject({
      method: "POST",
      url: "/v1/recommendations/next-action",
      headers: { cookie: owner.header }
    });
    assert.equal(noEligible.statusCode, 409);
    assert.equal(noEligible.json().error, "no_eligible_actions");

    const staleRead = await app.inject({
      method: "GET",
      url: "/v1/recommendations/next-action",
      headers: { cookie: owner.header }
    });
    assert.equal(staleRead.statusCode, 404, "stale shown recommendation is withdrawn");

    const withdrawn = await database.pool.query<{ payload: { reason?: string } }>(
      "select payload from life_events where user_id = $1 and type = 'recommendation.withdrawn' and entity_id = $2",
      [ownerUserId, recommendationId]
    );
    assert.equal(withdrawn.rowCount, 1);
    assert.equal(withdrawn.rows[0]?.payload.reason, "no_eligible_actions");
  } finally {
    if (app) await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});

test("B2 recommendation, evidence and LifeEvent roll back atomically when audit write fails", async () => {
  const app = buildApp({ databaseUrl });
  const database = createDatabaseClient(databaseUrl);
  const createdUserIds = new Set<string>();
  let triggerCreated = false;

  try {
    const owner = await bootstrap(app);
    const ownerUserId = await userIdForToken(database, owner.token);
    createdUserIds.add(ownerUserId);
    const ids = await setupExecutionContext(database, ownerUserId);
    await insertAction(database, ownerUserId, ids, {
      title: "Atomic recommendation candidate",
      status: "ready",
      priority: 5,
      estimatedMinutes: 30
    });

    await database.pool.query(`
      create or replace function b2_fail_recommendation_event() returns trigger as $$
      begin
        if new.type = 'recommendation.shown' and new.user_id = '${ownerUserId}'::uuid then
          raise exception 'forced B2 recommendation audit failure';
        end if;
        return new;
      end;
      $$ language plpgsql;
    `);
    await database.pool.query(`
      create trigger b2_fail_recommendation_event_trigger
      before insert on life_events
      for each row execute function b2_fail_recommendation_event();
    `);
    triggerCreated = true;

    const failed = await app.inject({
      method: "POST",
      url: "/v1/recommendations/next-action",
      headers: { cookie: owner.header }
    });
    assert.equal(failed.statusCode, 500);

    const recommendationCount = await database.pool.query<{ count: string }>(
      "select count(*)::text as count from recommendations where user_id = $1 and kind = 'next_action'",
      [ownerUserId]
    );
    assert.equal(recommendationCount.rows[0]?.count, "0", "recommendation insert must roll back");

    const evidenceCount = await database.pool.query<{ count: string }>(
      `select count(*)::text as count
       from recommendation_evidence e
       join recommendations r on r.id = e.recommendation_id
       where r.user_id = $1 and r.kind = 'next_action'`,
      [ownerUserId]
    );
    assert.equal(evidenceCount.rows[0]?.count, "0", "evidence insert must roll back");
  } finally {
    if (triggerCreated) await database.pool.query("drop trigger if exists b2_fail_recommendation_event_trigger on life_events");
    await database.pool.query("drop function if exists b2_fail_recommendation_event()");
    await app.close();
    await deleteUsers(database, createdUserIds);
    await database.pool.end();
  }
});
