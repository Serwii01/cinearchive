CREATE TABLE "person_names" (
	"person_id" integer PRIMARY KEY NOT NULL,
	"latin" text,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_films_tmdb_idx" ON "user_films" USING btree ("tmdb_id");--> statement-breakpoint
-- Los títulos por idioma se calculaban mal cuando en España se estrenó con el
-- título original (salía el de México). Se vacían y se recalculan solos: al
-- abrir la ficha, al listarla y desde el sitemap (backfillTitles en lib/films.ts).
UPDATE "films_cache" SET "titles" = NULL;