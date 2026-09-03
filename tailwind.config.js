/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: { bg: '#0a0e17', surface: '#111827', card: '#1a2235', border: '#1e293b' },
        neon: { green: '#00ff88', red: '#ff3366', blue: '#3b82f6', yellow: '#f59e0b' }
      }
    },
  },
  plugins: [],
};
