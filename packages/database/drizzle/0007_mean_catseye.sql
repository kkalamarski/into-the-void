CREATE TABLE IF NOT EXISTS "discovered_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"rarity" varchar(20) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"zone_id" varchar(100) NOT NULL,
	"world_x" integer NOT NULL,
	"world_y" integer NOT NULL,
	"resource_id" varchar(100) NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gathering_proficiency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"proficiency" jsonb DEFAULT '{"mining":{"xp":0,"level":1},"herbalism":{"xp":0,"level":1},"archaeology":{"xp":0,"level":1}}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gathering_proficiency_character_id_unique" UNIQUE("character_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collected_lore" (
	"character_id" uuid NOT NULL,
	"lore_id" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	CONSTRAINT "collected_lore_character_id_lore_id_pk" PRIMARY KEY("character_id","lore_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "zone_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"biome" varchar(50) NOT NULL,
	"tier" varchar(10) NOT NULL,
	"objectives" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "unique_character_biome_tier" UNIQUE("character_id","biome","tier")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "character_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"reward_type" varchar(20) NOT NULL,
	"reward_id" varchar(100) NOT NULL,
	"source" varchar(100) NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_character_reward" UNIQUE("character_id","reward_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discovered_resources" ADD CONSTRAINT "discovered_resources_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gathering_proficiency" ADD CONSTRAINT "gathering_proficiency_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collected_lore" ADD CONSTRAINT "collected_lore_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "zone_mastery" ADD CONSTRAINT "zone_mastery_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character_rewards" ADD CONSTRAINT "character_rewards_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
