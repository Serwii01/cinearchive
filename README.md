# Cine Archive — Editorial bilingüe de cine

Publicación editorial y archivo digital de cine (ES/EN) con estética *Cinematic
Archival Brutalism*. Sitio 100% estático, sin películas: solo ensayos, reseñas y
metadatos. Construido con **Astro + Tailwind CSS** y pensado para alojarse gratis
en **Cloudflare Pages**.

## Stack

- **Astro 5** — generación estática + i18n nativo (`/es`, `/en`).
- **Tailwind CSS** — el design system vive en `tailwind.config.mjs`.
- **Content Collections** — artículos en Markdown (`src/content/articles/{es,en}`).
- **Fuentes auto-alojadas** — EB Garamond, Geist, Space Mono (sin Google Fonts).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:4321  (redirige a /es)
npm run build      # genera dist/
npm run preview    # sirve dist/ localmente
```

## Estructura

```
src/
  i18n/ui.ts                 # diccionario de strings de interfaz + helpers
  content/config.ts          # esquema (zod) de los artículos
  content/articles/es|en/    # ensayos en Markdown (mismo "pair" empareja idiomas)
  layouts/BaseLayout.astro   # <head> SEO + hreflang, Header, Footer, Ticker
  components/                # Header, Footer, Ticker, IndexCard, ArticleMeta, ...
  pages/
    index.astro              # raíz -> /es
    [lang]/index.astro       # portada
    [lang]/about.astro       # manifiesto
    [lang]/archive/index.astro   # listado de archivo
    [lang]/archive/[slug].astro  # artículo individual
```

## Añadir un artículo

1. Crea `src/content/articles/es/mi-slug.md` y `src/content/articles/en/mi-slug.md`.
2. Usa el **mismo valor `pair`** en ambos para que el conmutador de idioma los enlace.
3. Rellena el frontmatter (ver artículos existentes): `title, lang, pair, excerpt,
   director, year, runtime, country, category, pubDate`, y opcional `cover`, `featured`.

## Despliegue en Cloudflare Pages

1. Sube este repositorio a GitHub.
2. En Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
3. Configuración de build:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Tras el primer deploy, actualiza la constante `SITE` en `astro.config.mjs` y la
   URL del sitemap en `public/robots.txt` con tu dominio real `*.pages.dev`.
