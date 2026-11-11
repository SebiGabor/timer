/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      keyframes: {
        overtimeGlow: {
          '0%, 100%': { boxShadow: 'inset 0 0 0 3px rgba(239, 68, 68, 0.85), 0 0 28px rgba(239, 68, 68, 0.25)' },
          '50%': { boxShadow: 'inset 0 0 0 3px rgba(239, 68, 68, 0.2), 0 0 8px rgba(239, 68, 68, 0.05)' },
        },
      },
      animation: {
        'overtime-glow': 'overtimeGlow 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
