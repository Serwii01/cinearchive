CREATE TABLE "stream_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"region" text NOT NULL,
	"provider_id" integer NOT NULL,
	"provider_name" text NOT NULL,
	"provider_logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"seen_at" timestamp,
	"emailed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_goals" (
	"user_id" text NOT NULL,
	"year" integer NOT NULL,
	"target" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_goals_user_id_year_pk" PRIMARY KEY("user_id","year")
);
--> statement-breakpoint
CREATE TABLE "watch_snapshot" (
	"tmdb_id" integer NOT NULL,
	"region" text NOT NULL,
	"provider_ids" integer[] DEFAULT '{}' NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watch_snapshot_tmdb_id_region_pk" PRIMARY KEY("tmdb_id","region")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "watch_region" text DEFAULT 'ES' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "watch_providers" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "alerts_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stream_alerts" ADD CONSTRAINT "stream_alerts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stream_alerts_uq" ON "stream_alerts" USING btree ("user_id","tmdb_id","region","provider_id");--> statement-breakpoint
CREATE INDEX "stream_alerts_user_idx" ON "stream_alerts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "watch_snapshot_checked_idx" ON "watch_snapshot" USING btree ("checked_at");--> statement-breakpoint
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_target_check" CHECK ("target" BETWEEN 1 AND 3650);