/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html", // Scans all .html files in the public folder and subfolders
    "./public/**/*.js", // Scans all .js files in the public folder and subfolders
    "./public/*.html" 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}