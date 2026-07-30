/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#173B5E",
        navyDark: "#0f2c47",
        gold: "#C9A227",
      },
    },
  },
  plugins: [],
};
