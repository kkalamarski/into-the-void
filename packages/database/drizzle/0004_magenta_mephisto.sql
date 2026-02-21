CREATE TABLE IF NOT EXISTS "quest_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"quest_id" varchar(100) NOT NULL,
	"state" varchar(20) DEFAULT 'active' NOT NULL,
	"objectives" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "unique_character_quest" UNIQUE("character_id","quest_id")
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "credits" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "last_world_position" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
