CREATE INDEX "films_cache_fetched_idx" ON "films_cache" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX "user_films_user_updated_idx" ON "user_films" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "user_films_user_reviewed_idx" ON "user_films" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "user_list_films_list_added_idx" ON "user_list_films" USING btree ("list_id","added_at");--> statement-breakpoint
CREATE INDEX "user_lists_user_idx" ON "user_lists" USING btree ("user_id","created_at");