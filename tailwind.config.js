/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: {
          DEFAULT: token('surface'),
          raised: token('surface-raised'),
          sunken: token('surface-sunken'),
        },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), faint: token('ink-faint'), inverse: token('ink-inverse') },
        accent: { DEFAULT: token('accent'), soft: token('accent-soft') },
        positive: { DEFAULT: token('positive'), soft: token('positive-soft') },
        negative: { DEFAULT: token('negative'), soft: token('negative-soft') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 1px rgb(0 0 0 / 0.02)',
        lg: '0 12px 32px -8px rgb(0 0 0 / 0.18), 0 2px 6px rgb(0 0 0 / 0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'translateY(8px) scale(0.98)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'scale-in': 'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in': 'slide-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        toast: 'scale-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
