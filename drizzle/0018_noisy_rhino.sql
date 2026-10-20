CREATE TABLE "site_counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- El contador de visitas no empieza en cero: arranca con las 30.800 que traía la
-- analítica anterior, para que la cifra de la web no contradiga lo ya publicado.
-- ON CONFLICT para que volver a aplicar la migración no reinicie la cuenta.
INSERT INTO "site_counters" ("key", "value") VALUES ('visits', 30800) ON CONFLICT ("key") DO NOTHING;
