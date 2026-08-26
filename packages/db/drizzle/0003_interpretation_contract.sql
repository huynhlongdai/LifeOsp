CREATE TABLE "capture_interpretations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"capture_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"contract_version" text DEFAULT 'capture_interpretation.v1' NOT NULL,
	"source" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capture_interpretations_version_check" CHECK ("capture_interpretations"."version" > 0),
	CONSTRAINT "capture_interpretations_contract_version_check" CHECK ("capture_interpretations"."contract_version" = 'capture_interpretation.v1'),
	CONSTRAINT "capture_interpretations_source_check" CHECK ("capture_interpretations"."source" in ('ai', 'user'))
);
--> statement-breakpoint
ALTER TABLE "capture_interpretations" ADD CONSTRAINT "capture_interpretations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_interpretations" ADD CONSTRAINT "capture_interpretations_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "capture_interpretations_capture_version_uidx" ON "capture_interpretations" USING btree ("capture_id","version");--> statement-breakpoint
CREATE INDEX "capture_interpretations_user_capture_version_idx" ON "capture_interpretations" USING btree ("user_id","capture_id","version");