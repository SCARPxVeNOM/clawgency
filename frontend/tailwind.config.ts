import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#eef0ff",
        text: "#1a1a2e",
        border: "rgba(0,0,0,0.06)",
        main: "#6366f1",

        "brand-blue": "#6366f1",
        "creator-green": "#10b981",
        "admin-gold": "#f59e0b",
      },
      fontFamily: {
        heading: ['"Clash Display"', 'system-ui', 'sans-serif'],
        body: ['"Satoshi"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.04)',
        'glass-hover': '0 20px 40px rgba(0, 0, 0, 0.08)',
        'glow-indigo': '0 4px 14px rgba(99, 102, 241, 0.3)',
        'glow-indigo-lg': '0 8px 25px rgba(99, 102, 241, 0.45)',
      },
      animation: {
        "gradient-shift": "gradient-shift 15s ease infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
      },
    },
  },
  darkMode: "class",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [heroui() as any],
};

export default config;
