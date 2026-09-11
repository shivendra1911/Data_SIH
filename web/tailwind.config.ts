import type { Config } from "tailwindcss";

const config: Config = {
  // We removed darkMode class toggle — now white-first
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Rabto Design System Tokens — modern-startup-design skill
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Menlo", "monospace"],
      },
      colors: {
        // Override defaults with Rabto white-first palette
        background: "#ffffff",
        surface: "#f8f9fa",
        "surface-raised": "#f1f3f5",
        "surface-border": "#e5e7eb",
        // Rabto accent tokens
        rabto: {
          purple: "#7C3AED",
          indigo: "#6366F1",
          "purple-light": "#ede9fe",
        },
        // NeerNetra semantic tokens
        neer: {
          blue: "#0284c7",
          emerald: "#16a34a",
          amber: "#d97706",
          red: "#dc2626",
          violet: "#7C3AED",
          "red-light": "#fee2e2",
          "amber-light": "#fef3c7",
          "emerald-light": "#dcfce7",
          "blue-light": "#e0f2fe",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        // Rabto card shadows
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)",
        "card-hover": "0 10px 25px -5px rgba(124,58,237,0.10), 0 4px 6px -2px rgba(0,0,0,0.05)",
        "violet-glow": "0 0 24px rgba(124,58,237,0.25)",
        "red-glow": "0 0 24px rgba(220,38,38,0.25)",
      },
      keyframes: {
        radar: {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0%)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        radar: "radar 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
