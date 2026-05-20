import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        card: "#13131a",
        border: "#2a2a3a",
        btnA: "#0066ff",
        btnB: "#00cc66",
        btnC: "#ff6600",
        btnD: "#888899",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      keyframes: {
        pulseGlow: {
          "0%": { boxShadow: "0 0 0 0 rgba(255,255,255,0.6)" },
          "100%": { boxShadow: "0 0 0 14px rgba(255,255,255,0)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 0.45s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
