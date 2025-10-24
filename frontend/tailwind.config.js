/** @type {import('tailwindcss').Config} */
import plugin from "tailwindcss/plugin";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#D4AF37",
          navy: "#1A1F36",
          ivory: "#F9F9F6",
          charcoal: "#3A3A3A",
          emerald: "#50C878",
          royal: "#4B000F",
        },
      },
      fontFamily: {
        waterfall: ['"Waterfall"', 'cursive'],
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".perspective-1000": { perspective: "1000px" },
        ".transform-style-3d": { transformStyle: "preserve-3d" },
        ".backface-hidden": { backfaceVisibility: "hidden" },
        ".rotate-y-180": { transform: "rotateY(180deg)" },
        ".-rotate-y-180": { transform: "rotateY(-180deg)" },
      });
    }),
  ],
};
