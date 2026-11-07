// Tailwind 3 entra por PostCSS, que Vite (y por tanto Astro) aplica solo.
// Antes lo hacía la integración @astrojs/tailwind, que no admite Astro 6 ni 7.
// Sus estilos base no se inyectan: los @tailwind van en el CSS global, igual
// que con applyBaseStyles: false.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
