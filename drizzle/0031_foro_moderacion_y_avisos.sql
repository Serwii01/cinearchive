CREATE TABLE "forum_bans" (
	"user_id" text PRIMARY KEY NOT NULL,
	"by_id" text,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_cites" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"post_id" integer,
	"kind" text NOT NULL,
	"ref" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"thread_id" integer NOT NULL,
	"post_id" integer,
	"actor_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_reads" (
	"user_id" text NOT NULL,
	"thread_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forum_reads_user_id_thread_id_pk" PRIMARY KEY("user_id","thread_id")
);
--> statement-breakpoint
CREATE TABLE "forum_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"kind" text NOT NULL,
	"target_id" integer NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution" text
);
--> statement-breakpoint
CREATE TABLE "forum_subscriptions" (
	"user_id" text NOT NULL,
	"thread_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forum_subscriptions_user_id_thread_id_pk" PRIMARY KEY("user_id","thread_id")
);
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "forum_threads" ADD COLUMN "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "forum_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_bans" ADD CONSTRAINT "forum_bans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_cites" ADD CONSTRAINT "forum_cites_thread_id_forum_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_cites" ADD CONSTRAINT "forum_cites_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_thread_id_forum_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reads" ADD CONSTRAINT "forum_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reads" ADD CONSTRAINT "forum_reads_thread_id_forum_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reports" ADD CONSTRAINT "forum_reports_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_subscriptions" ADD CONSTRAINT "forum_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_subscriptions" ADD CONSTRAINT "forum_subscriptions_thread_id_forum_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_cites_ref_idx" ON "forum_cites" USING btree ("kind","ref");--> statement-breakpoint
CREATE INDEX "forum_cites_thread_idx" ON "forum_cites" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "forum_notifications_user_idx" ON "forum_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_reports_unica" ON "forum_reports" USING btree ("reporter_id","kind","target_id");--> statement-breakpoint
CREATE INDEX "forum_reports_pending_idx" ON "forum_reports" USING btree ("resolved_at","created_at");--> statement-breakpoint
CREATE INDEX "forum_subscriptions_thread_idx" ON "forum_subscriptions" USING btree ("thread_id");--> statement-breakpoint
-- Lo que ya había en el foro: citas de cada mensaje (misma expresión que lib/forumbody.ts),
INSERT INTO "forum_cites" ("thread_id", "post_id", "kind", "ref")
SELECT t.id, NULL, m[1], m[2] FROM "forum_threads" t, regexp_matches(t.body, '\[\[(film|cinema|periodical|book|article|dossier|collection):([A-Za-z0-9._-]{1,120})\]\]', 'g') AS m;--> statement-breakpoint
INSERT INTO "forum_cites" ("thread_id", "post_id", "kind", "ref")
SELECT p.thread_id, p.id, m[1], m[2] FROM "forum_posts" p, regexp_matches(p.body, '\[\[(film|cinema|periodical|book|article|dossier|collection):([A-Za-z0-9._-]{1,120})\]\]', 'g') AS m;--> statement-breakpoint
-- hilos seguidos (quien lo abrió y quien respondió en él)
INSERT INTO "forum_subscriptions" ("user_id", "thread_id")
SELECT user_id, id FROM "forum_threads"
UNION SELECT user_id, thread_id FROM "forum_posts"
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- y los avisos de respuestas, que hasta ahora salían de una consulta.
INSERT INTO "forum_notifications" ("user_id", "kind", "thread_id", "post_id", "actor_id", "created_at")
SELECT COALESCE(padre.user_id, t.user_id), 'reply', r.thread_id, r.id, r.user_id, r.created_at
FROM "forum_posts" r
JOIN "forum_threads" t ON t.id = r.thread_id
LEFT JOIN "forum_posts" padre ON padre.id = r.parent_id
WHERE r.hidden = false AND COALESCE(padre.user_id, t.user_id) <> r.user_id;
