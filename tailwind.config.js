/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5D259F',
          50: '#F3EBFC',
          100: '#E7D7F9',
          200: '#CFAFF3',
          300: '#B787ED',
          400: '#9F5FE7',
          500: '#5D259F',
          600: '#4B1E80',
          700: '#391660',
          800: '#270F40',
          900: '#150720',
        },
        gray: {
          DEFAULT: '#3C3C3C',
          50: '#F5F5F5',
          100: '#E6E6E6',
          200: '#CCCCCC',
          300: '#B3B3B3',
          400: '#999999',
          500: '#3C3C3C',
          600: '#303030',
          700: '#242424',
          800: '#181818',
          900: '#0C0C0C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};