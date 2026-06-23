CREATE TABLE "extra_films" (
	"tmdb_id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"original_title" text DEFAULT '' NOT NULL,
	"director" text,
	"year" integer,
	"country" text,
	"runtime_min" integer,
	"language" text,
	"added_by" text,
	"added_at" timestamp DEFAULT now() NOT NULL
);
