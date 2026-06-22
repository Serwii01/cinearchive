/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    // Paleta cerrada del design system "Cinematic Archival Brutalism".
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ink: '#000000',
      charcoal: '#1A1A1A',
      ochre: '#EAB308',
      'ochre-dim': '#604700',
      background: '#FAFAFA',
      surface: '#F9F9F9',
      'film-white': '#F4F4F4',
      'surface-dim': '#DADADA',
      outline: '#817660',
      'outline-variant': '#D3C5AC',
      muted: '#4F4633',
      white: '#FFFFFF',
      error: '#BA1A1A',
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
