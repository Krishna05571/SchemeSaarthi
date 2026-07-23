/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1F1C",
        jade: "#0E4F3F",
        emerald: "#17876B",
        mint: "#A8D5C4",
        gold: "#C9A24B",
        goldSoft: "#E6D29A",
        sand: "#F3EEE3",
        paper: "#FBF9F3",
        mist: "#E7EDE9",
        muted: "#5C6B67",
        coral: "#E63946",
        card: "#FFFFFF",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ['"IBM Plex Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
