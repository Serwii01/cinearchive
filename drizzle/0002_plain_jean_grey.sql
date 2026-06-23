CREATE TABLE "watch_cache" (
	"tmdb_id" integer NOT NULL,
	"region" text NOT NULL,
	"data" jsonb,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watch_cache_tmdb_id_region_pk" PRIMARY KEY("tmdb_id","region")
);
