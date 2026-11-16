CREATE TABLE "newsletter_sends" (
	"issue" text NOT NULL,
	"user_id" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_sends_issue_user_id_pk" PRIMARY KEY("issue","user_id")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "news_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;