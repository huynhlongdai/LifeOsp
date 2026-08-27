CREATE TABLE "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"recommendation_id" uuid,
	"planned_minutes" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "focus_sessions_status_check" CHECK ("focus_sessions"."status" in ('active', 'completed', 'interrupted', 'abandoned')),
	CONSTRAINT "focus_sessions_planned_minutes_check" CHECK ("focus_sessions"."planned_minutes" is null or ("focus_sessions"."planned_minutes" >= 1 and "focus_sessions"."planned_minutes" <= 480)),
	CONSTRAINT "focus_sessions_ended_at_check" CHECK (("focus_sessions"."status" = 'active' and "focus_sessions"."ended_at" is null) or ("focus_sessions"."status" <> 'active' and "focus_sessions"."ended_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "focus_sessions_user_started_idx" ON "focus_sessions" USING btree ("user_id","started_at");
--> statement-breakpoint
CREATE INDEX "focus_sessions_user_action_idx" ON "focus_sessions" USING btree ("user_id","action_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "focus_sessions_one_active_per_user_uidx" ON "focus_sessions" USING btree ("user_id") WHERE "focus_sessions"."status" = 'active';