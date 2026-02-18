CREATE TABLE IF NOT EXISTS "player_storage" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_slots" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_lifecycle" (
	"entity_id" varchar(200) PRIMARY KEY NOT NULL,
	"zone_id" varchar(50) NOT NULL,
	"killed_at" timestamp with time zone NOT NULL,
	"respawn_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "stats" SET DEFAULT '{"durability":100,"toughness":50,"power":50,"haste":50,"vigor":80,"recovery":30,"perception":40,"resilience":30}'::jsonb;--> statement-breakpoint
ALTER TABLE "inventories" ALTER COLUMN "equipment" SET DEFAULT '{"modules":[]}'::jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_storage" ADD CONSTRAINT "player_storage_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
