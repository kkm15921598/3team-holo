/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        holo: {
          purple: "#B77CFF",
          "purple-deep": "#8B5CF6",
          "purple-light": "#E9D5FF",
        },
      },
      fontFamily: {
        fredoka: ['"Fredoka"', "system-ui", "sans-serif"],
        paperlogy: [
          '"Paperlogy"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          '"Open Sans"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
      backgroundImage: {
        "holo-gradient":
          "linear-gradient(90deg, #B77CFF 0%, #FF7AC3 100%)",
      },
    },
  },
  plugins: [],
};
