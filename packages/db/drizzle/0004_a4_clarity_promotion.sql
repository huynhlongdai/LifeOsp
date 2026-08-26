CREATE TABLE "directions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_capture_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "directions_title_non_blank_check" CHECK (length(btrim("directions"."title")) > 0),
	CONSTRAINT "directions_status_check" CHECK ("directions"."status" in ('draft', 'active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "incubator_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_capture_id" uuid,
	"title" text NOT NULL,
	"notes" text,
	"kind" text NOT NULL,
	"status" text DEFAULT 'incubated' NOT NULL,
	"revisit_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incubator_items_title_non_blank_check" CHECK (length(btrim("incubator_items"."title")) > 0),
	CONSTRAINT "incubator_items_kind_check" CHECK ("incubator_items"."kind" in ('idea', 'project_candidate', 'someday', 'reference')),
	CONSTRAINT "incubator_items_status_check" CHECK ("incubator_items"."status" in ('incubated', 'promoted', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "recommendation_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"evidence_type" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"label" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"strength" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recommendation_evidence_label_non_blank_check" CHECK (length(btrim("recommendation_evidence"."label")) > 0),
	CONSTRAINT "recommendation_evidence_strength_check" CHECK ("recommendation_evidence"."strength" in ('direct', 'strong', 'supporting', 'tentative'))
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"rationale" text NOT NULL,
	"confidence_class" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"proposed_entity_type" text,
	"proposed_entity_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shown_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "recommendations_title_non_blank_check" CHECK (length(btrim("recommendations"."title")) > 0),
	CONSTRAINT "recommendations_rationale_non_blank_check" CHECK (length(btrim("recommendations"."rationale")) > 0),
	CONSTRAINT "recommendations_kind_check" CHECK ("recommendations"."kind" in ('next_action', 'direction', 'friction_intervention', 'weekly_adjustment')),
	CONSTRAINT "recommendations_confidence_check" CHECK ("recommendations"."confidence_class" in ('direct', 'strong_pattern', 'possible_pattern', 'suggestion')),
	CONSTRAINT "recommendations_status_check" CHECK ("recommendations"."status" in ('draft', 'shown', 'accepted', 'edited', 'rejected', 'not_now', 'wrong_assumption'))
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"direction_id" uuid,
	"title" text NOT NULL,
	"purpose" text NOT NULL,
	"starts_on" date,
	"target_ends_on" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"primary_focus_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_title_non_blank_check" CHECK (length(btrim("seasons"."title")) > 0),
	CONSTRAINT "seasons_purpose_non_blank_check" CHECK (length(btrim("seasons"."purpose")) > 0),
	CONSTRAINT "seasons_status_check" CHECK ("seasons"."status" in ('draft', 'active', 'paused', 'completed', 'abandoned'))
);
--> statement-breakpoint
ALTER TABLE "directions" ADD CONSTRAINT "directions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directions" ADD CONSTRAINT "directions_source_capture_id_captures_id_fk" FOREIGN KEY ("source_capture_id") REFERENCES "public"."captures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incubator_items" ADD CONSTRAINT "incubator_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incubator_items" ADD CONSTRAINT "incubator_items_source_capture_id_captures_id_fk" FOREIGN KEY ("source_capture_id") REFERENCES "public"."captures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_evidence" ADD CONSTRAINT "recommendation_evidence_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_direction_id_directions_id_fk" FOREIGN KEY ("direction_id") REFERENCES "public"."directions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "directions_user_status_idx" ON "directions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "incubator_items_user_status_idx" ON "incubator_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "recommendation_evidence_recommendation_idx" ON "recommendation_evidence" USING btree ("recommendation_id");--> statement-breakpoint
CREATE INDEX "recommendations_user_status_idx" ON "recommendations" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "seasons_user_status_idx" ON "seasons" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_one_active_per_user_uidx" ON "seasons" USING btree ("user_id") WHERE "seasons"."status" = 'active';