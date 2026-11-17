CREATE TABLE "forum_votes" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"target_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forum_votes_user_id_kind_target_id_pk" PRIMARY KEY("user_id","kind","target_id")
);
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_threads" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_votes_target_idx" ON "forum_votes" USING btree ("kind","target_id");--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_parent_id_forum_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_posts_parent_idx" ON "forum_posts" USING btree ("parent_id");