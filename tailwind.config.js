/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/renderer/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'SF Pro Display',
          'Segoe UI Variable',
          'Segoe UI',
          '-apple-system',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        usage: {
          green: '#4ade80',
          yellow: '#facc15',
          red: '#ef4444',
        },
      },
      backdropBlur: {
        glass: '24px',
      },
    },
  },
  plugins: [],
}
