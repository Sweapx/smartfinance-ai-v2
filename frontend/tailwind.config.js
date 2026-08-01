/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#01696f",
        "primary-hover": "#0c4e54",
      },
    },
  },
  plugins: [],
};
