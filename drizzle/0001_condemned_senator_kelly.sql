ALTER TABLE "films_cache" ADD COLUMN "watchmode" jsonb;--> statement-breakpoint
ALTER TABLE "films_cache" ADD COLUMN "watchmode_fetched_at" timestamp;