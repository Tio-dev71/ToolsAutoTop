/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0a0e1a',
        card: '#151b2b',
        hover: '#1e263c',
        muted: '#94a3b8',
        border: '#2e364f',
      }
    },
  },
  plugins: [],
}
