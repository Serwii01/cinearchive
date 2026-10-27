CREATE TABLE "user_viewings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"watched_on" date NOT NULL,
	"rewatch" boolean DEFAULT false NOT NULL,
	"rating" real,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_viewings" ADD CONSTRAINT "user_viewings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_viewings_user_film_day_uq" ON "user_viewings" USING btree ("user_id","tmdb_id","watched_on");--> statement-breakpoint
CREATE INDEX "user_viewings_user_day_idx" ON "user_viewings" USING btree ("user_id","watched_on");--> statement-breakpoint
-- Cada película ya marcada como vista y con fecha pasa a ser su primer
-- visionado, para que el diario no arranque vacío para nadie. La fecha se
-- guardó anclada a las 12:00 UTC, así que ::date da el día que eligió el usuario.
INSERT INTO "user_viewings" ("user_id", "tmdb_id", "watched_on", "rating", "source", "created_at")
SELECT "user_id", "tmdb_id", "reviewed_at"::date, "rating", 'manual', "reviewed_at"
FROM "user_films"
WHERE "status" IN ('seen', 'favorite') AND "reviewed_at" IS NOT NULL
ON CONFLICT DO NOTHING;
