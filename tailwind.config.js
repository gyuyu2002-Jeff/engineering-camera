/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: {
          400: '#b7e854',
          500: '#9ed23a',
          600: '#83b327'
        },
        dark: {
          900: '#0b1112',
          800: '#141c1b',
          700: '#192421',
          600: '#27302e'
        }
      }
    },
  },
  plugins: [],
}
