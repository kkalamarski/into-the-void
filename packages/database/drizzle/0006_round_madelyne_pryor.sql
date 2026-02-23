CREATE TABLE IF NOT EXISTS "discovered_pois" (
	"character_id" uuid NOT NULL,
	"poi_id" varchar(100) NOT NULL,
	"poi_type" varchar(20) NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovered_pois_character_id_poi_id_pk" PRIMARY KEY("character_id","poi_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discovered_pois" ADD CONSTRAINT "discovered_pois_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
