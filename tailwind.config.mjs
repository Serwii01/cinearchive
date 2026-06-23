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
      // Escala tipográfica exacta del design md.
      fontSize: {
        'display-lg': ['84px', { lineHeight: '90px', letterSpacing: '-0.04em', fontWeight: '600' }],
        'display-mobile': ['48px', { lineHeight: '52px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['42px', { lineHeight: '48px', fontWeight: '500' }],
        'headline-md': ['32px', { lineHeight: '38px', fontWeight: '500' }],
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
