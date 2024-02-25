module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  content: [
    "./index.html", // ✅ ajoutez cette ligne
    "./src/**/*.{js,jsx,ts,tsx}", // ✅ ajoutez cette ligne
  ],
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
