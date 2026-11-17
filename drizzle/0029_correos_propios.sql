CREATE TABLE "newsletter_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"copy" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
