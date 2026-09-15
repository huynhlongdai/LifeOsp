CREATE TABLE "action_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"focus_session_id" uuid,
	"recommendation_id" uuid,
	"result" text NOT NULL,
	"note" text,
	"blocked_reason" text,
	"remaining_text" text,
	"postpone_until" date,
	"planned_minutes" integer,
	"actual_focus_minutes" integer DEFAULT 0 NOT NULL,
	"focus_session_count" integer DEFAULT 0 NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_results_result_check" CHECK ("action_results"."result" in ('completed', 'partial', 'postponed', 'blocked', 'dropped')),
	CONSTRAINT "action_results_blocked_reason_check" CHECK ("action_results"."result" <> 'blocked' or length(btrim(coalesce("action_results"."blocked_reason", ''))) > 0),
	CONSTRAINT "action_results_actual_focus_minutes_check" CHECK ("action_results"."actual_focus_minutes" >= 0),
	CONSTRAINT "action_results_focus_session_count_check" CHECK ("action_results"."focus_session_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "daily_closes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"offset_minutes" integer NOT NULL,
	"meaningful_progress_text" text,
	"friction_code" text,
	"friction_note" text,
	"note" text,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_closes_offset_check" CHECK ("daily_closes"."offset_minutes" between -840 and 840),
	CONSTRAINT "daily_closes_friction_code_check" CHECK ("daily_closes"."friction_code" is null or "daily_closes"."friction_code" in ('unclear', 'too_big', 'low_energy', 'interrupted', 'waiting_on_others', 'new_idea_pulled', 'none', 'other'))
);
--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_focus_session_id_focus_sessions_id_fk" FOREIGN KEY ("focus_session_id") REFERENCES "public"."focus_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_results" ADD CONSTRAINT "action_results_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_results_user_recorded_idx" ON "action_results" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "action_results_user_action_idx" ON "action_results" USING btree ("user_id","action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closes_user_date_uidx" ON "daily_closes" USING btree ("user_id","date");