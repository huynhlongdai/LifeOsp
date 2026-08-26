import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
export type LifeEventRow = typeof lifeEvents.$inferSelect;
export type NewLifeEventRow = typeof lifeEvents.$inferInsert;
