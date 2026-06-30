CREATE TABLE "user_list_films" (
	"list_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_list_films_list_id_tmdb_id_pk" PRIMARY KEY("list_id","tmdb_id")
);
--> statement-breakpoint
CREATE TABLE "user_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_list_films" ADD CONSTRAINT "user_list_films_list_id_user_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."user_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lists" ADD CONSTRAINT "user_lists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;