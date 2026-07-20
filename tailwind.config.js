/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cosmo: {
          gold: '#B39C4D',
          'gold-light': '#C9B672',
          'gold-dark': '#9A8340',
          anthracite: '#1B212E',
          'anthracite-light': '#2A3242',
          ink: '#0F131C',
        },
      },
      fontFamily: {
        sans: ['Quicksand', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
