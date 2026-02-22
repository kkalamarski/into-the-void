ALTER TABLE "quest_progress" ADD COLUMN "last_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD COLUMN "completed_count" integer DEFAULT 0 NOT NULL;