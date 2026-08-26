CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"outcome_id" uuid,
	"title" text NOT NULL,
	"done_condition" text,
	"estimated_minutes" integer,
	"status" text DEFAULT 'candidate' NOT NULL,
	"priority" integer,
	"blocked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "actions_title_non_blank_check" CHECK (length(btrim("actions"."title")) > 0),
	CONSTRAINT "actions_status_check" CHECK ("actions"."status" in ('candidate', 'ready', 'active', 'completed', 'partial', 'postponed', 'blocked', 'dropped')),
	CONSTRAINT "actions_estimated_minutes_check" CHECK ("actions"."estimated_minutes" is null or ("actions"."estimated_minutes" >= 1 and "actions"."estimated_minutes" <= 480))
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actions_user_status_idx" ON "actions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "actions_user_outcome_status_idx" ON "actions" USING btree ("user_id","outcome_id","status");--> statement-breakpoint
CREATE INDEX "actions_user_project_status_idx" ON "actions" USING btree ("user_id","project_id","status");