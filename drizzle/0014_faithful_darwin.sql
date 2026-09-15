DROP TABLE "watch_cache" CASCADE;--> statement-breakpoint
ALTER TABLE "films_cache" DROP COLUMN "watchmode";--> statement-breakpoint
ALTER TABLE "films_cache" DROP COLUMN "watchmode_fetched_at";