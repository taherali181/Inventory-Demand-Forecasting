/** @type {import('tailwindcss').Config} */

/*
 * Colors resolve to CSS custom properties defined in src/styles/tokens.css.
 * Because the utilities point at var(), flipping [data-theme] on <html>
 * re-themes the whole app and NO `dark:` variant is needed in component code.
 *
 * Tokens are stored as space-separated RGB channels and consumed through
 * `rgb(var(--x) / <alpha-value>)` so Tailwind's opacity modifiers keep working.
 * This is load-bearing: the codebase already has 45 usages like
 * `bg-status-bad/10` and `border-status-good/25`. With a plain `var()` color
 * those silently render at full opacity — a subtle tinted badge becomes a solid
 * block, with no error to notice.
 *
 * RULE: tokens only. `dark:` is configured below purely as an escape hatch for
 * properties that genuinely cannot be tokenized (e.g. mix-blend-mode). Writing
 * `dark:bg-zinc-900` works but silently opts that element out of the token
 * layer — don't.
 */

const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: c('--canvas'),
        surface: {
          DEFAULT: c('--surface'),
          2: c('--surface-2'),
        },
        hairline: {
          DEFAULT: c('--border'),
          strong: c('--border-strong'),
        },
        content: {
          DEFAULT: c('--text'),
          secondary: c('--text-secondary'),
          muted: c('--text-muted'),
        },
        accent: {
          DEFAULT: c('--accent'),
          hover: c('--accent-hover'),
          active: c('--accent-active'),
          fg: c('--accent-fg'),
        },
        // Names preserved verbatim so all 107 existing `status-*` usages keep
        // working unchanged — only their values move onto the token layer.
        status: {
          good: c('--good'),
          warn: c('--warn'),
          bad: c('--bad'),
          info: c('--info'),
        },
      },
      borderColor: {
        DEFAULT: c('--border'),
      },
      // Redefines Tailwind's default 8px `rounded-lg` to the locked 12px card
      // radius, which snaps the 59 existing `rounded-lg` usages onto the scale
      // for free. `rounded-md` becomes the 8px control radius.
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
