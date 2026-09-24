/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF5722',
          darkOrange: '#F4511E',
          deepOrange: '#BF360C',
          amber: '#FF9800',
          yellow: '#FFC107',
          dark: '#0E0E0E',
          card: '#161616',
          border: '#262626'
        }
      }
    },
  },
  plugins: [],
}
