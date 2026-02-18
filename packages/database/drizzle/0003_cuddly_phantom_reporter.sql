CREATE TABLE IF NOT EXISTS "loot_table_entries" (
	"table_id" varchar(100) NOT NULL,
	"item_id" varchar(100) NOT NULL,
	"min_amount" integer DEFAULT 1 NOT NULL,
	"max_amount" integer DEFAULT 1 NOT NULL,
	"chance" real DEFAULT 1 NOT NULL,
	CONSTRAINT "loot_table_entries_table_id_item_id_pk" PRIMARY KEY("table_id","item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loot_tables" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"description" varchar(255)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loot_table_entries" ADD CONSTRAINT "loot_table_entries_table_id_loot_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."loot_tables"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
