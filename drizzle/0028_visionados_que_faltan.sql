-- Visionados que faltan (16-11-2026). La regla pasa a ser una sola: una película
-- vista (o favorita) tiene al menos un visionado con fecha, que es lo que leen
-- el diario, «Últimos visionados» del perfil, el resumen del año y el reto.
-- Hasta ahora, marcar como vista sin puntuar no lo apuntaba, y lo puntuado
-- antes del 30-10-2026 tampoco. Aquí se completan: el día de «Cuándo la viste»
-- (o de la reseña) si lo hay, y si no, el de la última vez que se tocó la
-- película. Van con source = 'auto' para poder reconocerlos (y quitarlos) si
-- alguno no encaja, por ejemplo una lista de vistas importada sin diario.
INSERT INTO "user_viewings" ("user_id", "tmdb_id", "watched_on", "rewatch", "rating", "source")
SELECT uf."user_id",
       uf."tmdb_id",
       (COALESCE(uf."reviewed_at", uf."updated_at"))::date,
       false,
       uf."rating",
       'auto'
FROM "user_films" uf
WHERE uf."status" <> 'want'
  AND NOT EXISTS (
    SELECT 1 FROM "user_viewings" v
    WHERE v."user_id" = uf."user_id" AND v."tmdb_id" = uf."tmdb_id"
  )
ON CONFLICT DO NOTHING;
