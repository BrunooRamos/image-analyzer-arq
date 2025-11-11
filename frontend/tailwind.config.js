/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#071d32',
          dark: '#071d32',
        },
        secondary: {
          DEFAULT: '#154d82',
          dark: '#154d82',
        },
      },
    },
  },
  plugins: [],
}




