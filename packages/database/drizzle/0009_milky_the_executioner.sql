CREATE TABLE IF NOT EXISTS "player_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"blocked_character_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_blocks_unique" UNIQUE("character_id","blocked_character_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_mutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"muted_character_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_mutes_unique" UNIQUE("character_id","muted_character_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deployables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployable_type" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" jsonb NOT NULL,
	"owner_id" uuid NOT NULL,
	"durability" integer DEFAULT 100 NOT NULL,
	"max_durability" integer DEFAULT 100 NOT NULL,
	"fuel_remaining" integer DEFAULT 0 NOT NULL,
	"max_fuel" integer DEFAULT 100 NOT NULL,
	"accumulated_resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"deployed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"last_tick_at" timestamp with time zone DEFAULT now() NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crafting_proficiency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"proficiency" jsonb DEFAULT '{"equipment":{"xp":0,"level":1},"consumables":{"xp":0,"level":1},"reagents":{"xp":0,"level":1}}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crafting_proficiency_character_id_unique" UNIQUE("character_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipe_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"recipe_id" varchar(100) NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_character_recipe" UNIQUE("character_id","recipe_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_blocks" ADD CONSTRAINT "player_blocks_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_blocks" ADD CONSTRAINT "player_blocks_blocked_character_id_characters_id_fk" FOREIGN KEY ("blocked_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_mutes" ADD CONSTRAINT "player_mutes_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_mutes" ADD CONSTRAINT "player_mutes_muted_character_id_characters_id_fk" FOREIGN KEY ("muted_character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deployables" ADD CONSTRAINT "deployables_owner_id_characters_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crafting_proficiency" ADD CONSTRAINT "crafting_proficiency_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipe_unlocks" ADD CONSTRAINT "recipe_unlocks_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
