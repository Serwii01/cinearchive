import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    lang: z.enum(['es', 'en']),
    // slug compartido para emparejar versiones ES/EN del mismo artículo
    pair: z.string(),
    excerpt: z.string(),
    director: z.string(),
    year: z.number().int(),
    runtime: z.string(), // p.ej. "131 min"
    country: z.string(),
    category: z.string(),
    pubDate: z.coerce.date(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
