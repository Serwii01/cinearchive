ALTER TABLE "user" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
-- Backfill: aproxima la última visita a partir de las sesiones existentes
-- (la sesión más reciente de cada usuario). Los usuarios sin sesión viva quedan NULL.
UPDATE "user" u SET "last_seen_at" = s.last
FROM (
  SELECT "user_id", MAX(GREATEST("updated_at", "created_at")) AS last
  FROM "session" GROUP BY "user_id"
) s
WHERE s."user_id" = u."id";
