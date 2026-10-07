import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "tg-black": "#0f0f0f",
        "tg-dark": "#1a1a1a",
        "tg-darker": "#121212",
        "tg-orange": "#ff6b35",
        "tg-orange-light": "#ff8555",
        "tg-gray": "#2d2d2d",
        "tg-text": "#e0e0e0",
        "tg-text-secondary": "#a0a0a0",
        "tg-border": "#333333",
        "tg-success": "#10b981",
        "tg-danger": "#ef4444",
      },
    },
  },
  plugins: [],
};
export default config;
