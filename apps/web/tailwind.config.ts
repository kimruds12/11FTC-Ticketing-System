import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#B91C1C",
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          950: "#450A0A",
        },
        surface: "#F9FAFB",
        sidebar: {
          DEFAULT: "#FFFFFF",
          active: "#FEF2F2",
          hover: "#F9FAFB",
          border: "#F3F4F6",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        sidebar: "2px 0 8px 0 rgba(0, 0, 0, 0.04)",
        dropdown: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06)",
        header: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
      },
      zIndex: {
        sidebar: "40",
        header: "30",
        overlay: "50",
        dropdown: "60",
        modal: "70",
        tooltip: "80",
      },
      animation: {
        "sidebar-expand": "sidebarExpand 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "sidebar-collapse": "sidebarCollapse 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "fade-in": "fadeIn 200ms ease-out forwards",
        "fade-out": "fadeOut 150ms ease-in forwards",
        "slide-down": "slideDown 200ms ease-out forwards",
        "slide-up": "slideUp 200ms ease-out forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        sidebarExpand: {
          "0%": { width: "72px" },
          "100%": { width: "240px" },
        },
        sidebarCollapse: {
          "0%": { width: "240px" },
          "100%": { width: "72px" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      transitionProperty: {
        width: "width",
        spacing: "margin, padding",
      },
    },
  },
  plugins: [],
};

export default config;
