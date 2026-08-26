CREATE TABLE "life_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"payload" jsonb NOT NULL,
	"correlation_id" uuid,
	"causation_id" uuid,
	CONSTRAINT "life_events_source_check" CHECK ("life_events"."source" in ('user', 'system', 'ai', 'import'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_events" ADD CONSTRAINT "life_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "life_events_user_occurred_idx" ON "life_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "life_events_user_type_idx" ON "life_events" USING btree ("user_id","type");