/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "DM Sans",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: ["Instrument Sans", "DM Sans", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          50: "#f7f8fa",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#aeb8c9",
          400: "#8290a8",
          500: "#637289",
          600: "#4e5b70",
          700: "#404a5c",
          800: "#37404f",
          900: "#313845",
          950: "#1e222a",
        },
        accent: {
          DEFAULT: "#2563eb",
          muted: "#3b82f6",
          dark: "#1d4ed8",
        },
        signal: {
          high: "#059669",
          mid: "#ca8a04",
          low: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};
