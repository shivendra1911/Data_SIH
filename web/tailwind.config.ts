import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090d16",
        surface: "#0f172a",
        "surface-raised": "#1e293b",
        "surface-border": "#334155",
        neer: {
          blue: "#38bdf8",
          emerald: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
          violet: "#8b5cf6",
        }
      },
      keyframes: {
        radar: {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        }
      },
      animation: {
        radar: "radar 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      }
    },
  },
  plugins: [],
};

export default config;
