/** @type {import('tailwindcss').Config} */

/*
 * Colors resolve to CSS custom properties in src/styles/tokens.css. Utilities point at var() so
 * Tailwind's opacity modifiers (bg-accent/10, border-status-bad/25, …) keep working — see tokens.css's
 * header comment for why the values are stored as space-separated RGB, not hex.
 *
 * RULE: every color/radius a component needs must come from this token layer. No component should
 * reach for an arbitrary Tailwind value (bg-blue-500, rounded-xl, etc.) — that's exactly the kind of
 * drift this rebuild exists to eliminate. If a value isn't here, it isn't in the mockups; check
 * design-reference/design-brief.md before inventing one.
 */

const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        canvas: c('--canvas'),
        surface: {
          DEFAULT: c('--surface'),
          2: c('--surface-2'),
          3: c('--surface-3'),
        },
        hairline: {
          DEFAULT: c('--border'),
          strong: c('--border-strong'),
        },
        content: {
          DEFAULT: c('--text'),
          secondary: c('--text-2'),
          muted: c('--text-3'),
        },
        accent: {
          DEFAULT: c('--accent'),
          fg: c('--accent-fg'),
        },
        status: {
          good: c('--good'),
          warn: c('--warn'),
          bad: c('--bad'),
          info: c('--info'),
        },
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      fontFamily: {
        sans: ['"Space Grotesk Variable"', '"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
