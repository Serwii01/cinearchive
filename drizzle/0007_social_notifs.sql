ALTER TABLE "profile" ADD COLUMN "notifications_seen_at" timestamp;--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id","status");--> statement-breakpoint
CREATE INDEX "follows_follower_idx" ON "follows" USING btree ("follower_id","status");