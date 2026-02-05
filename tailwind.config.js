/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)' },
          '50%': { opacity: '0.9', boxShadow: '0 0 0 4px rgba(99, 102, 241, 0)' },
        },
        'sparkle-float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '50%': { transform: 'translateY(-3px) rotate(10deg)', opacity: '0.8' },
        },
        'text-shimmer': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'highlight-flash': {
          '0%': { backgroundColor: 'rgb(243 232 255 / 0)' },
          '15%': { backgroundColor: 'rgb(243 232 255 / 1)' },
          '100%': { backgroundColor: 'rgb(243 232 255 / 0)' },
        },
        'border-glow': {
          '0%': { borderColor: 'rgb(216 180 254 / 0)', boxShadow: '0 0 0 0 rgb(147 51 234 / 0)' },
          '15%': { borderColor: 'rgb(216 180 254 / 1)', boxShadow: '0 0 12px 2px rgb(147 51 234 / 0.3)' },
          '100%': { borderColor: 'rgb(229 231 235 / 1)', boxShadow: '0 0 0 0 rgb(147 51 234 / 0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'sparkle-float': 'sparkle-float 1.5s ease-in-out infinite',
        'text-shimmer': 'text-shimmer 3s ease infinite',
        'highlight-flash': 'highlight-flash 2s ease-out forwards',
        'border-glow': 'border-glow 2s ease-out forwards',
      },
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