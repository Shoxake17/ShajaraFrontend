import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F3F6F0',
          100: '#E7EDE2',
          200: '#CBD9C4',
          300: '#A3BD9A',
          400: '#729670',
          500: '#4C7552',
          600: '#37593F',
          700: '#2C4A38',
          800: '#213A2B',
          900: '#17291E',
          950: '#0F1D15',
        },
        link: '#2E7D4F',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 40px -12px rgb(23 41 30 / 0.18)',
      },
      borderRadius: {
        field: '14px',
      },
    },
  },
  plugins: [],
} satisfies Config;
