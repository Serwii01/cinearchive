-- Medias estrellas: las notas pasan de 1-5 enteras a 0,5-5 de medio en medio.
-- Las que ya había (enteras) se conservan tal cual al cambiar el tipo.
ALTER TABLE "user_films" ALTER COLUMN "rating" SET DATA TYPE real;
--> statement-breakpoint
-- La API ya lo valida, pero la base es la última barrera: que nunca entre un 3,7.
ALTER TABLE "user_films" ADD CONSTRAINT "user_films_rating_half_check" CHECK ("rating" IS NULL OR ("rating" >= 0.5 AND "rating" <= 5 AND "rating" * 2 = round("rating" * 2)));
