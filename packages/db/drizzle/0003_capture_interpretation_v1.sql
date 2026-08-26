CREATE TABLE "capture_interpretations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"capture_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"contract_id" text NOT NULL,
	"contract_version" integer NOT NULL,
	"author" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capture_interpretations_version_positive_check" CHECK ("capture_interpretations"."version" > 0),
	CONSTRAINT "capture_interpretations_contract_version_positive_check" CHECK ("capture_interpretations"."contract_version" > 0),
	CONSTRAINT "capture_interpretations_contract_id_non_blank_check" CHECK (length(btrim("capture_interpretations"."contract_id")) > 0),
	CONSTRAINT "capture_interpretations_author_check" CHECK ("capture_interpretations"."author" in ('ai', 'user'))
);
--> statement-breakpoint
ALTER TABLE "capture_interpretations" ADD CONSTRAINT "capture_interpretations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_interpretations" ADD CONSTRAINT "capture_interpretations_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "capture_interpretations_capture_version_uidx" ON "capture_interpretations" USING btree ("capture_id","version");--> statement-breakpoint
CREATE INDEX "capture_interpretations_user_capture_idx" ON "capture_interpretations" USING btree ("user_id","capture_id");