CREATE TABLE "list_likes" (
	"user_id" text NOT NULL,
	"list_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "list_likes_user_id_list_id_pk" PRIMARY KEY("user_id","list_id")
);
--> statement-breakpoint
CREATE TABLE "review_likes" (
	"user_id" text NOT NULL,
	"author_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_likes_user_id_author_id_tmdb_id_pk" PRIMARY KEY("user_id","author_id","tmdb_id")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "follow_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_list_id_user_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."user_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_likes_list_idx" ON "list_likes" USING btree ("list_id","created_at");--> statement-breakpoint
CREATE INDEX "review_likes_target_idx" ON "review_likes" USING btree ("author_id","tmdb_id");--> statement-breakpoint
CREATE INDEX "review_likes_author_date_idx" ON "review_likes" USING btree ("author_id","created_at");