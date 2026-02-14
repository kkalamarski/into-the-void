CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"faction_id" varchar(50) NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"health" integer DEFAULT 100 NOT NULL,
	"max_health" integer DEFAULT 100 NOT NULL,
	"position" jsonb DEFAULT '{"x":32,"y":32,"zoneId":"z_0_0"}'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{"strength":10,"agility":10,"endurance":10,"intelligence":10,"perception":10}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_played_at" timestamp with time zone,
	CONSTRAINT "characters_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventories" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_slots" integer DEFAULT 20 NOT NULL,
	"equipment" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "factions" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"bonuses" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "species" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"biome" varchar(50) NOT NULL,
	"behavior_type" varchar(50) NOT NULL,
	"min_level" integer DEFAULT 1 NOT NULL,
	"max_level" integer DEFAULT 10 NOT NULL,
	"stats" jsonb NOT NULL,
	"base_xp" integer DEFAULT 10 NOT NULL,
	"loot_table_id" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "world_seeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seed" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "world_seeds_seed_unique" UNIQUE("seed")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"structure_type" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" jsonb NOT NULL,
	"owner_id" uuid,
	"durability" integer DEFAULT 100 NOT NULL,
	"max_durability" integer DEFAULT 100 NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discovered_species" (
	"character_id" uuid NOT NULL,
	"species_id" varchar(50) NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kill_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "discovered_species_character_id_species_id_pk" PRIMARY KEY("character_id","species_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "characters" ADD CONSTRAINT "characters_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "characters" ADD CONSTRAINT "characters_faction_id_factions_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."factions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventories" ADD CONSTRAINT "inventories_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structures" ADD CONSTRAINT "structures_owner_id_characters_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discovered_species" ADD CONSTRAINT "discovered_species_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discovered_species" ADD CONSTRAINT "discovered_species_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
