CREATE TABLE IF NOT EXISTS "ability_cooldowns" (
	"character_id" uuid NOT NULL,
	"ability_id" varchar(50) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ability_cooldowns_character_id_ability_id_pk" PRIMARY KEY("character_id","ability_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ability_cooldowns" ADD CONSTRAINT "ability_cooldowns_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ability_cooldowns_expires_at_idx" ON "ability_cooldowns" ("expires_at");