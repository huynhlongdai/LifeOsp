CREATE TABLE "action_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"focus_session_id" uuid,
	"recommendation_id" uuid,
	"outcome" text NOT NULL,
	"previous_action_status" text NOT NULL,
	"note" text,
	"reason" text,
	"postponed_to" date,
	"focus_minutes" integer,
	"planned_minutes" integer,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_results_outcome_check" CHECK ("action_results"."outcome" in ('completed', 'partial', 'postponed', 'blocked', 'dropped')),
	CONSTRAINT "action_results_previous_status_check" CHECK ("action_results"."previous_action_status" in ('ready', 'active')),
	CONSTRAINT "action_results_reason_required_check" CHECK ("action_results"."outcome" <> 'blocked' or length(btrim(coalesce("action_results"."reason", ''))) > 0),
	CONSTRAINT "action_results_focus_minutes_check" CHECK ("action_results"."focus_minutes" is null or "action_results"."focus_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "daily_closes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"tz_offset_minutes" integer DEFAULT 0 NOT NULL,
	"note" text,
	"summary" jsonb NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_closes_tz_offset_check" CHECK ("daily_closes"."tz_offset_minutes" >= -840 and "daily_closes"."tz_offset_minutes" <= 840)
);
--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_focus_session_id_focus_sessions_id_fk" FOREIGN KEY ("focus_session_id") REFERENCES "public"."focus_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_results_user_recorded_idx" ON "action_results" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "action_results_one_per_action_uidx" ON "action_results" USING btree ("action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closes_user_local_date_uidx" ON "daily_closes" USING btree ("user_id","local_date");