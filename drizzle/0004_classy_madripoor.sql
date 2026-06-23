ALTER TABLE "films_cache" ADD COLUMN "wikidata" jsonb;--> statement-breakpoint
ALTER TABLE "films_cache" ADD COLUMN "wikidata_fetched_at" timestamp;