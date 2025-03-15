/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx}',
      './src/components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        colors: {
          dark: '#222923',
          light: '#c7e0e5',
          'light-alt': '#c0dbe3',
          primary: '#f59c1a',
          'primary-dark': '#e07d00',
          'primary-light': '#ffb74c',
          secondary: '#2d82b7',
          'secondary-dark': '#1a6a9e',
          'secondary-light': '#52a2d7',
          accent: '#732a00',
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        },
        fontSize: {
          'xxs': '.65rem',
        },
        boxShadow: {
          card: '0 4px 6px rgba(0, 0, 0, 0.1)',
          'card-hover': '0 10px 15px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    plugins: [],
  };