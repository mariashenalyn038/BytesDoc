import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1a1a1a',
        accent: '#2a2a2a',
        surface: {
          DEFAULT: '#f5f5f5',
          dark: '#0d0d0d',
        },
        'border-subtle': '#e5e5e5',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
        elevated: '0 12px 32px -12px rgba(0, 0, 0, 0.35)',
        lift: '0 4px 12px -4px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}
export default config
