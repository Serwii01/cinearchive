import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  smallint,
  jsonb,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ *
 * Tablas de Better Auth (email+contraseña y OAuth Google/GitHub).
 * Los nombres y columnas siguen el esquema por defecto de Better Auth.
 * ------------------------------------------------------------------ */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/* ------------------------------------------------------------------ *
 * Tablas de la aplicación.
 * ------------------------------------------------------------------ */

/** Cache server-side de las respuestas de TMDB/OMDb/Watchmode (nunca expone claves). */
export const filmsCache = pgTable('films_cache', {
  tmdbId: integer('tmdb_id').primaryKey(),
  tmdb: jsonb('tmdb').notNull(),
  omdb: jsonb('omdb'),
  watchmode: jsonb('watchmode'),
  watchmodeFetchedAt: timestamp('watchmode_fetched_at'),
  wikidata: jsonb('wikidata'),
  wikidataFetchedAt: timestamp('wikidata_fetched_at'),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
});

/** Cache de "dónde ver" por película y región (cuota Watchmode baja: 1000/mes). */
export const watchCache = pgTable(
  'watch_cache',
  {
    tmdbId: integer('tmdb_id').notNull(),
    region: text('region').notNull(),
    data: jsonb('data'),
    fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tmdbId, t.region] }),
  }),
);

/** Películas añadidas al catálogo de la filmoteca desde el panel de administración. */
export const extraFilms = pgTable('extra_films', {
  tmdbId: integer('tmdb_id').primaryKey(),
  title: text('title').notNull(),
  originalTitle: text('original_title').notNull().default(''),
  director: text('director'),
  year: integer('year'),
  country: text('country'),
  runtimeMin: integer('runtime_min'),
  language: text('language'),
  addedBy: text('added_by'),
  addedAt: timestamp('added_at').notNull().defaultNow(),
});

/** Estado de una película en la lista del usuario. */
export const filmStatus = pgEnum('film_status', ['want', 'seen', 'favorite']);

/** Watchlist + favoritos + valoraciones + notas (una fila por usuario y película). */
export const userFilms = pgTable(
  'user_films',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tmdbId: integer('tmdb_id').notNull(),
    status: filmStatus('status').notNull().default('want'),
    rating: smallint('rating'), // 1-5, nullable
    note: text('note'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.tmdbId] }),
  }),
);

/** Preferencias de perfil; alimentan las recomendaciones. */
export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull().default('es'),
  favoriteGenres: integer('favorite_genres').array().notNull().default([]),
  favoriteDirectors: text('favorite_directors').array().notNull().default([]),
  theme: text('theme').notNull().default('light'),
  privacy: jsonb('privacy').notNull().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof user.$inferSelect;
export type UserFilm = typeof userFilms.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type FilmCache = typeof filmsCache.$inferSelect;
export type WatchCache = typeof watchCache.$inferSelect;
export type ExtraFilm = typeof extraFilms.$inferSelect;
