import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "sans-serif"
        ]
      },
      colors: {
        status: {
          agree: "#34d399",
          rumeur: "#fbbf24",
          confirme: "#f87171"
        }
      },
      borderRadius: {
        "4xl": "28px"
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.12)",
        hero: "0 30px 80px -20px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
