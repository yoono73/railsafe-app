import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4c1d95', foreground: '#ffffff' },
        secondary: { DEFAULT: '#f4f4f5', foreground: '#18181b' },
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
export default config;