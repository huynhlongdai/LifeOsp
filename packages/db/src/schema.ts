import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
});

export const captures = pgTable(
  "captures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    rawText: text("raw_text").notNull(),
    processingStatus: text("processing_status").default("unprocessed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("captures_user_created_idx").on(table.userId, table.createdAt),
    check(
      "captures_kind_check",
      sql`${table.kind} in ('text', 'voice_transcript', 'quick_note', 'distraction')`
    ),
    check(
      "captures_processing_status_check",
      sql`${table.processingStatus} in ('unprocessed', 'interpreted', 'corrected', 'promoted', 'archived')`
    ),
    check("captures_raw_text_non_blank_check", sql`length(btrim(${table.rawText})) > 0`)
  ]
);

export const captureInterpretations = pgTable(
  "capture_interpretations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    captureId: uuid("capture_id")
      .notNull()
      .references(() => captures.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    contractId: text("contract_id").notNull(),
    contractVersion: integer("contract_version").notNull(),
    author: text("author").notNull(),
    content: jsonb("content").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("capture_interpretations_capture_version_uidx").on(table.captureId, table.version),
    index("capture_interpretations_user_capture_idx").on(table.userId, table.captureId),
    check("capture_interpretations_version_positive_check", sql`${table.version} > 0`),
    check("capture_interpretations_contract_version_positive_check", sql`${table.contractVersion} > 0`),
    check("capture_interpretations_contract_id_non_blank_check", sql`length(btrim(${table.contractId})) > 0`),
    check("capture_interpretations_author_check", sql`${table.author} in ('ai', 'user')`)
  ]
);

export const directions = pgTable(
  "directions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("draft").notNull(),
    sourceCaptureId: uuid("source_capture_id").references(() => captures.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("directions_user_status_idx").on(table.userId, table.status),
    check("directions_title_non_blank_check", sql`length(btrim(${table.title})) > 0`),
    check("directions_status_check", sql`${table.status} in ('draft', 'active', 'inactive')`)
  ]
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    directionId: uuid("direction_id").references(() => directions.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    purpose: text("purpose").notNull(),
    startsOn: date("starts_on"),
    targetEndsOn: date("target_ends_on"),
    status: text("status").default("draft").notNull(),
    primaryFocusText: text("primary_focus_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("seasons_user_status_idx").on(table.userId, table.status),
    uniqueIndex("seasons_one_active_per_user_uidx").on(table.userId).where(sql`${table.status} = 'active'`),
    check("seasons_title_non_blank_check", sql`length(btrim(${table.title})) > 0`),
    check("seasons_purpose_non_blank_check", sql`length(btrim(${table.purpose})) > 0`),
    check("seasons_status_check", sql`${table.status} in ('draft', 'active', 'paused', 'completed', 'abandoned')`)
  ]
);

export const outcomes = pgTable(
  "outcomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    successDefinition: text("success_definition"),
    status: text("status").default("active").notNull(),
    priority: integer("priority"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("outcomes_user_season_status_idx").on(table.userId, table.seasonId, table.status),
    check("outcomes_title_non_blank_check", sql`length(btrim(${table.title})) > 0`),
    check("outcomes_status_check", sql`${table.status} in ('active', 'achieved', 'paused', 'dropped')`)
  ]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    outcomeId: uuid("outcome_id").references(() => outcomes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("active").notNull(),
    priority: integer("priority"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("projects_user_outcome_status_idx").on(table.userId, table.outcomeId, table.status),
    check("projects_title_non_blank_check", sql`length(btrim(${table.title})) > 0`),
    check("projects_status_check", sql`${table.status} in ('candidate', 'active', 'paused', 'completed', 'dropped')`)
  ]
);

export const actions = pgTable(
  "actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    outcomeId: uuid("outcome_id").references(() => outcomes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    doneCondition: text("done_condition"),
    estimatedMinutes: integer("estimated_minutes"),
    status: text("status").default("candidate").notNull(),
    priority: integer("priority"),
    blockedReason: text("blocked_reason"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    index("actions_user_status_idx").on(table.userId, table.status),
    index("actions_user_outcome_status_idx").on(table.userId, table.outcomeId, table.status),
    index("actions_user_project_status_idx").on(table.userId, table.projectId, table.status),
    check("actions_title_non_blank_check", sql`length(btrim(${table.title})) > 0`),
    check(
      "actions_status_check",
      sql`${table.status} in ('candidate', 'ready', 'active', 'completed', 'partial', 'postponed', 'blocked', 'dropped')`
    ),
    check(
      "actions_estimated_minutes_check",
      sql`${table.estimatedMinutes} is null or (${table.estimatedMinutes} >= 1 and ${table.estimatedMinutes} <= 480)`
    )
  ]
);

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "cascade" }),
    recommendationId: uuid("recommendation_id").references(() => recommendations.id, { onDelete: "set null" }),
    plannedMinutes: integer("planned_minutes"),
    status: text("status").default("active").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("focus_sessions_user_started_idx").on(table.userId, table.startedAt),
    index("focus_sessions_user_action_idx").on(table.userId, table.actionId),
    uniqueIndex("focus_sessions_one_active_per_user_uidx").on(table.userId).where(sql`${table.status} = 'active'`),
    check("focus_sessions_status_check", sql`${table.status} in ('active', 'completed', 'interrupted', 'abandoned')`),
    check(
      "focus_sessions_planned_minutes_check",
      sql`${table.plannedMinutes} is null or (${table.plannedMinutes} >= 1 and ${table.plannedMinutes} <= 480)`
    ),
    check(
      "focus_sessions_ended_at_check",
      sql`(${table.status} = 'active' and ${table.endedAt} is null) or (${table.status} <> 'active' and ${table.endedAt} is not null)`
    )
  ]
);

export const incubatorItems = pgTable(
  "incubator_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceCaptureId: uuid("source_capture_id").references(() => captures.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    notes: text("notes"),
    kind: text("kind").notNull(),
    status: text("status").default("incubated").notNull(),
    revisitOn: date("revisit_on"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("incubator_items_user_status_idx").on(table.userId, table.status),
    check("incubator_items_title_non_blank_check", sql`length(btrim(${table.title})) > 0`),
    check("incubator_items_kind_check", sql`${table.kind} in ('idea', 'project_candidate', 'someday', 'reference')`),
    check("incubator_items_status_check", sql`${table.status} in ('incubated', 'promoted', 'archived')`)
  ]
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    rationale: text("rationale").notNull(),
    confidenceClass: text("confidence_class").notNull(),
    status: text("status").default("draft").notNull(),
    proposedEntityType: text("proposed_entity_type"),
    proposedEntityPayload: jsonb("proposed_entity_payload").$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    shownAt: timestamp("shown_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
  },
  (table) => [
    index("recommendations_user_status_idx").on(table.userId, table.status),
    check("recommendations_title_non_blank_check", sql`length(btrim(${table.title})) > 0`),
    check("recommendations_rationale_non_blank_check", sql`length(btrim(${table.rationale})) > 0`),
    check(
      "recommendations_kind_check",
      sql`${table.kind} in ('next_action', 'direction', 'friction_intervention', 'weekly_adjustment')`
    ),
    check(
      "recommendations_confidence_check",
      sql`${table.confidenceClass} in ('direct', 'strong_pattern', 'possible_pattern', 'suggestion')`
    ),
    check(
      "recommendations_status_check",
      sql`${table.status} in ('draft', 'shown', 'accepted', 'edited', 'rejected', 'not_now', 'wrong_assumption')`
    )
  ]
);

export const recommendationEvidence = pgTable(
  "recommendation_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    evidenceType: text("evidence_type").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    label: text("label").notNull(),
    valueJson: jsonb("value_json").$type<unknown>().notNull(),
    strength: text("strength").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("recommendation_evidence_recommendation_idx").on(table.recommendationId),
    check("recommendation_evidence_label_non_blank_check", sql`length(btrim(${table.label})) > 0`),
    check(
      "recommendation_evidence_strength_check",
      sql`${table.strength} in ('direct', 'strong', 'supporting', 'tentative')`
    )
  ]
);

export const lifeEvents = pgTable(
  "life_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    source: text("source").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    payload: jsonb("payload").$type<unknown>().notNull(),
    correlationId: uuid("correlation_id"),
    causationId: uuid("causation_id")
  },
  (table) => [
    index("life_events_user_occurred_idx").on(table.userId, table.occurredAt),
    index("life_events_user_type_idx").on(table.userId, table.type),
    check("life_events_source_check", sql`${table.source} in ('user', 'system', 'ai', 'import')`)
  ]
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type CaptureRow = typeof captures.$inferSelect;
export type NewCaptureRow = typeof captures.$inferInsert;
export type CaptureInterpretationRow = typeof captureInterpretations.$inferSelect;
export type NewCaptureInterpretationRow = typeof captureInterpretations.$inferInsert;
export type DirectionRow = typeof directions.$inferSelect;
export type NewDirectionRow = typeof directions.$inferInsert;
export type SeasonRow = typeof seasons.$inferSelect;
export type NewSeasonRow = typeof seasons.$inferInsert;
export type OutcomeRow = typeof outcomes.$inferSelect;
export type NewOutcomeRow = typeof outcomes.$inferInsert;
export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type ActionRow = typeof actions.$inferSelect;
export type NewActionRow = typeof actions.$inferInsert;
export type FocusSessionRow = typeof focusSessions.$inferSelect;
export type NewFocusSessionRow = typeof focusSessions.$inferInsert;
export type IncubatorItemRow = typeof incubatorItems.$inferSelect;
export type NewIncubatorItemRow = typeof incubatorItems.$inferInsert;
export type RecommendationRow = typeof recommendations.$inferSelect;
export type NewRecommendationRow = typeof recommendations.$inferInsert;
export type RecommendationEvidenceRow = typeof recommendationEvidence.$inferSelect;
export type NewRecommendationEvidenceRow = typeof recommendationEvidence.$inferInsert;
export type LifeEventRow = typeof lifeEvents.$inferSelect;
export type NewLifeEventRow = typeof lifeEvents.$inferInsert;
