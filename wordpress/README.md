# Blog de Cine Archive (blog.cinearchive.es)

Los artículos se escriben y se leen en un WordPress en `blog.cinearchive.es`.
La web (`cinearchive.es`) los lista en **Artículos** y en la portada, y cada
tarjeta lleva al blog. Dentro de un artículo, cada película enlaza a su ficha
en la web.

```
cinearchive.es/articles  ──tarjeta──▶  blog.cinearchive.es/emmy-2026/
                                         │
                                         └─ película ──▶ cinearchive.es/film/1370191
cinearchive.es/en/articles/emmy-2026  ──301──▶  blog.cinearchive.es/en/emmy-2026-en/
```

Aquí hay dos piezas:

| Carpeta | Qué es |
|---|---|
| `cinearchive-blog/` | **Plugin.** Campos del artículo, `[pelicula]`, datos de TMDB, el endpoint que lee la web, la redirección de las URLs antiguas y el importador de los artículos que ya había. |
| `cinearchive-theme/` | **Tema.** El aspecto de la web: tipografías, colores, retícula, modo oscuro y los cinco idiomas. |

Para generar los `.zip` que se suben a WordPress:

```
npm run wp:build      # → wordpress/dist/cinearchive-theme.zip y cinearchive-blog.zip
```

Los textos de la interfaz del tema salen de `src/i18n/ui.ts`: si cambias uno en
la web, vuelve a generar el zip y súbelo otra vez.

---

## Puesta en marcha (una vez)

> **Orden importante.** Monta y comprueba el blog **antes** de juntar en `main`
> los cambios de la web: en cuanto se despliegan, `/articles` lee del blog y las
> URLs antiguas de los artículos redirigen allí.

### 1. El subdominio

1. En el panel del hosting de WordPress, añade `blog.cinearchive.es` como
   dominio del hosting y activa el certificado SSL (Let's Encrypt).
2. En la zona DNS de `cinearchive.es`, crea el registro que te indique el
   hosting para `blog` (normalmente un `A` a la IP del hosting o un `CNAME`).
   **No toques** los registros de `cinearchive.es` ni de `www`, que apuntan al
   VPS.
3. Espera a que `https://blog.cinearchive.es` abra el WordPress con candado.

### 2. Ajustes de WordPress

- **Ajustes → Generales:** título `Cine Archive`; las dos direcciones,
  `https://blog.cinearchive.es`; idioma Español; zona horaria `Madrid`.
- **Ajustes → Enlaces permanentes:** «Nombre de la entrada».
- **Ajustes → Comentarios:** desactívalos si no los quieres (la web no tiene).
- Borra la entrada «¡Hola, mundo!» y la página de ejemplo.

### 3. Polylang (los cinco idiomas)

1. **Plugins → Añadir nuevo:** instala y activa **Polylang** (gratis).
2. **Idiomas:** da de alta, con estos códigos exactos:

   | Idioma | Código |
   |---|---|
   | Español (predeterminado) | `es` |
   | English | `en` |
   | Galego | `gl` |
   | Euskara | `eu` |
   | Català | `ca` |

3. **Idiomas → Ajustes → Modificaciones de URL:** «El idioma se establece a
   partir del nombre del directorio» y marca «Ocultar la información del idioma
   en la URL para el idioma predeterminado». Así queda igual que la web:
   castellano sin prefijo y `/en/`, `/gl/`… para los demás.

### 4. Plugin y tema

1. **Plugins → Añadir nuevo → Subir plugin:** `cinearchive-blog.zip` → Activar.
2. **Ajustes → Cine Archive:** pega la clave de TMDB (la misma que
   `TMDB_API_KEY` del `.env` del VPS). Mejor aún, ponla en `wp-config.php`:
   `define( 'CINEARCHIVE_TMDB_KEY', '…' );`
3. **Apariencia → Temas → Añadir nuevo → Subir tema:** `cinearchive-theme.zip`
   → Activar.

### 5. Traer los artículos que ya había

**Herramientas → Importar artículos de Cine Archive → Importar.** Crea los 15
artículos en los cinco idiomas (75 entradas), con sus fechas, campos y
traducciones enlazadas. Se puede pulsar más de una vez: lo ya importado se
salta.

### 6. Comprobar y desplegar la web

1. `https://blog.cinearchive.es/wp-json/cinearchive/v1/posts?lang=en` debe
   devolver los artículos en inglés.
2. `https://blog.cinearchive.es/?ca_articulo=emmy-2026&lang=en` debe llevar al
   artículo de los Emmy en inglés.
3. Si el blog no está en `https://blog.cinearchive.es`, pon `BLOG_URL` en el
   `.env` del VPS y cambia también el `img-src` de la CSP en el `Caddyfile`.
4. Junta los cambios de la web en `main`.

---

## Escribir un artículo

1. **Entradas → Añadir nueva.** Escribe el titular y el texto en el editor.
   Los subtítulos, con el bloque «Encabezado» (H2).
2. **Extracto** (panel lateral): es la entradilla, la que sale bajo el titular
   y en las tarjetas.
3. **Cine Archive — datos del artículo** (debajo del editor):
   - **Antetítulo:** «Festivales», «Premios», «Industria»…
   - **Portada:** el id de TMDB de una película o serie; se usa su imagen de
     fondo. Si pones una «Imagen destacada», manda la imagen destacada.
   - **Cifras clave:** una por línea, `14 | Emmy para «The Studio»`.
   - **Películas del artículo:** ids de TMDB separados por comas. Salen al pie
     con su cartel y enlazan a su ficha en la web.
   - **Galería de carteles:** una por línea, `id | pie`. Para series o
     películas que no van en la lista anterior.
   - **Fuentes:** una por línea, `Variety · Crítica | https://…`.
4. **Enlazar una película en el texto:** `[pelicula id="1370191"]La bola negra[/pelicula]`.
   Sin texto dentro (`[pelicula id="1370191"]`) pone el título de TMDB. Con
   `tipo="serie"` solo la pone en cursiva (las series no tienen ficha).
5. **El id de TMDB** es el número al final de la dirección de la ficha en la
   web (`cinearchive.es/film/la-bola-negra-1370191`) o en themoviedb.org.
6. **Traducciones:** en el panel «Idiomas», el «+» de cada idioma crea la
   traducción enlazada. Los campos de Cine Archive se rellenan en cada una.
7. **Publicar.** La web lo enseña en unos minutos (guarda la lista de artículos
   cinco minutos).
