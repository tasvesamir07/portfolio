/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        accent: {
          primary: '#0B3B75', // Brand Deep Blue
          secondary: '#CEB079', // Brand Gold
        }

      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
