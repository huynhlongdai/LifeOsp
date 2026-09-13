CREATE TABLE "action_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"result_type" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "focus_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"focus_session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"result_type" text NOT NULL,
	"actual_minutes" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "daily_closes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "action_results" ADD CONSTRAINT "action_results_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE cascade;
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "focus_results" ADD CONSTRAINT "focus_results_focus_session_id_focus_sessions_id_fk" FOREIGN KEY ("focus_session_id") REFERENCES "focus_sessions"("id") ON DELETE cascade;
ALTER TABLE "focus_results" ADD CONSTRAINT "focus_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;

CREATE INDEX "action_results_action_idx" ON "action_results" USING btree ("action_id");
CREATE INDEX "action_results_user_created_idx" ON "action_results" USING btree ("user_id","created_at");
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_result_type_check" CHECK ("result_type" in ('completed', 'partial', 'postponed', 'blocked', 'dropped'));

CREATE INDEX "focus_results_focus_session_idx" ON "focus_results" USING btree ("focus_session_id");
CREATE INDEX "focus_results_user_created_idx" ON "focus_results" USING btree ("user_id","created_at");
ALTER TABLE "focus_results" ADD CONSTRAINT "focus_results_result_type_check" CHECK ("result_type" in ('completed', 'interrupted', 'abandoned'));
ALTER TABLE "focus_results" ADD CONSTRAINT "focus_results_actual_minutes_check" CHECK ("actual_minutes" is null or ("actual_minutes" >= 1 and "actual_minutes" <= 1440));

CREATE UNIQUE INDEX "daily_closes_user_date_uidx" ON "daily_closes" USING btree ("user_id","date");
CREATE INDEX "daily_closes_user_created_idx" ON "daily_closes" USING btree ("user_id","created_at");
