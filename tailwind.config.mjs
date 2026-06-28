/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    // Design system "Cinematic Archival Brutalism" mapeado a variables CSS, para
    // que el modo oscuro se active cambiando las variables en [data-theme="dark"].
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ink: 'var(--c-ink)',
      charcoal: 'var(--c-charcoal)',
      ochre: 'var(--c-ochre)',
      'ochre-dim': 'var(--c-ochre-dim)',
      'on-accent': 'var(--c-on-accent)',
      background: 'var(--c-background)',
      surface: 'var(--c-surface)',
      'film-white': 'var(--c-film-white)',
      'surface-dim': 'var(--c-surface-dim)',
      outline: 'var(--c-outline)',
      'outline-variant': 'var(--c-outline-variant)',
      muted: 'var(--c-muted)',
      white: 'var(--c-white)',
      error: 'var(--c-error)',
    },
    extend: {
      fontFamily: {
        display: ['"EB Garamond Variable"', 'EB Garamond', 'serif'],
        body: ['"Geist Sans"', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      // Escala tipográfica fluida (clamp): el máximo conserva el tamaño exacto del
      // design md en escritorio, y encoge de forma proporcional en móvil para que
      // ningún titular se desborde en pantallas estrechas.
      fontSize: {
        'display-lg': ['clamp(2.625rem, 4.5vw + 1.25rem, 5.25rem)', { lineHeight: '1.07', letterSpacing: '-0.04em', fontWeight: '600' }],
        'display-mobile': ['clamp(2rem, 5vw + 0.75rem, 3rem)', { lineHeight: '1.08', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['clamp(1.875rem, 2.5vw + 1rem, 2.625rem)', { lineHeight: '1.14', fontWeight: '500' }],
        'headline-md': ['clamp(1.5rem, 1.5vw + 0.9rem, 2rem)', { lineHeight: '1.19', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.1em', fontWeight: '500' }],
        'meta-data': ['13px', { lineHeight: '18px', fontWeight: '500' }],
      },
      maxWidth: {
        frame: '1440px',
      },
      spacing: {
        gutter: '24px',
      },
      borderRadius: {
        // Brutalismo: todo recto.
        none: '0',
      },
    },
  },
  plugins: [],
};
