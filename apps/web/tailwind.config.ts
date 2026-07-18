import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#C0001A",
          50:  "#fff1f2",
          100: "#ffe0e3",
          200: "#ffc6cb",
          300: "#ff99a3",
          400: "#ff5c6e",
          500: "#f82b42",
          600: "#e50d26",
          700: "#C0001A",
          800: "#9e0016",
          900: "#830315",
          950: "#480009",
        },
        sidebar: {
          bg: "#FFFFFF",
          border: "#E5E7EB",
          active: "#C0001A",
          text: "#374151",
          hover: "#F9FAFB",
        },
        surface: "#F8F9FA",
        muted: "#6B7280",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        sidebar: "1px 0 0 0 #E5E7EB",
        header: "0 1px 0 0 #E5E7EB",
      },
    },
  },
  plugins: [],
};

export default config;
