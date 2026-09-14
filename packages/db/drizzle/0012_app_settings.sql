CREATE TABLE IF NOT EXISTS "app_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"ai_provider" text,
	"ai_model" text,
	"ai_key_ciphertext" text,
	"ai_key_hint" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_provider_check" CHECK ("ai_provider" is null or "ai_provider" in ('openai','anthropic'))
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
