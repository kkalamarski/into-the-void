CREATE TABLE IF NOT EXISTS "ground_items" (
	"id" varchar(200) PRIMARY KEY NOT NULL,
	"zone_id" varchar(50) NOT NULL,
	"item_id" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"despawn_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
