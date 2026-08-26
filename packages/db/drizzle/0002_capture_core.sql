CREATE TABLE "captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"raw_text" text NOT NULL,
	"processing_status" text DEFAULT 'unprocessed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "captures_kind_check" CHECK ("captures"."kind" in ('text', 'voice_transcript', 'quick_note', 'distraction')),
	CONSTRAINT "captures_processing_status_check" CHECK ("captures"."processing_status" in ('unprocessed', 'interpreted', 'corrected', 'promoted', 'archived')),
	CONSTRAINT "captures_raw_text_non_blank_check" CHECK (length(btrim("captures"."raw_text")) > 0)
);
--> statement-breakpoint
ALTER TABLE "captures" ADD CONSTRAINT "captures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "captures_user_created_idx" ON "captures" USING btree ("user_id","created_at");