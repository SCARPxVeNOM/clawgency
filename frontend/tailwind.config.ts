import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./context/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101723",
        steel: "#31455f",
        mist: "#e8eef6",
        mint: "#38d39f",
        coral: "#ff6f61"
      }
    }
  },
  plugins: []
};

export default config;
