CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"work_start_minute" integer DEFAULT 480 NOT NULL,
	"work_end_minute" integer DEFAULT 1080 NOT NULL,
	"work_days" text DEFAULT '1,2,3,4,5' NOT NULL,
	"focus_minutes" integer DEFAULT 40 NOT NULL,
	"break_minutes" integer DEFAULT 10 NOT NULL,
	"ai_suggests_actions" boolean DEFAULT true NOT NULL,
	"ai_daily_summary" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_work_window_check" CHECK ("user_preferences"."work_start_minute" >= 0 and "user_preferences"."work_end_minute" <= 1440 and "user_preferences"."work_start_minute" < "user_preferences"."work_end_minute"),
	CONSTRAINT "user_preferences_focus_minutes_check" CHECK ("user_preferences"."focus_minutes" between 5 and 240),
	CONSTRAINT "user_preferences_break_minutes_check" CHECK ("user_preferences"."break_minutes" between 0 and 120)
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;