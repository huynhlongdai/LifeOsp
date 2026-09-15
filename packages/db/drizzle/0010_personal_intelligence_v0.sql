CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pattern_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"confidence_class" text NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"evidence_summary" jsonb NOT NULL,
	"proposed_preference" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "insights_confidence_class_check" CHECK ("insights"."confidence_class" in ('strong_pattern', 'possible_pattern', 'suggestion')),
	CONSTRAINT "insights_status_check" CHECK ("insights"."status" in ('candidate', 'shown', 'confirmed', 'corrected', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "operating_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source_insight_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operating_preferences_source_check" CHECK ("operating_preferences"."source" in ('explicit_user', 'confirmed_insight', 'system_default')),
	CONSTRAINT "operating_preferences_status_check" CHECK ("operating_preferences"."status" in ('active', 'disabled'))
);
--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_preferences" ADD CONSTRAINT "operating_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_preferences" ADD CONSTRAINT "operating_preferences_source_insight_id_insights_id_fk" FOREIGN KEY ("source_insight_id") REFERENCES "public"."insights"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "insights_user_pattern_key_uidx" ON "insights" USING btree ("user_id","pattern_key");--> statement-breakpoint
CREATE INDEX "insights_user_status_idx" ON "insights" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "operating_preferences_user_key_uidx" ON "operating_preferences" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "operating_preferences_user_status_idx" ON "operating_preferences" USING btree ("user_id","status");