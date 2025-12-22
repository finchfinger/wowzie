/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        wowzie: {
          page: "#F4F4F5", // bg
          surface: "#FFFFFF",
          surfaceSubtle: "#F9FAFB",
          borderSubtle: "#E4E4E7",
          text: {
            primary: "#111827",
            muted: "#4B5563",
            subtle: "#6B7280",
            onAccent: "#FFFFFF",
          },
          accent: {
            primary: "#6D28D9",
            primarySoft: "#DDD6FE",
            primaryHover: "#5B21B6",
          },
          state: {
            success: "#16A34A",
            warning: "#D97706",
            error: "#DC2626",
            info: "#2563EB",
          },
        },
      },
      fontSize: {
        display: ["2rem", { lineHeight: "2.5rem" }],    // 32/40
        h1: ["1.5rem", { lineHeight: "2rem" }],         // 24/32
        h2: ["1.25rem", { lineHeight: "1.75rem" }],     // 20/28
        h3: ["1rem", { lineHeight: "1.5rem" }],         // 16/24
        body: ["0.875rem", { lineHeight: "1.375rem" }], // 14/22
        bodySm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13/20
        caption: ["0.75rem", { lineHeight: "1rem" }],   // 12/16
      },
      boxShadow: {
        card: "0 10px 30px rgba(15, 23, 42, 0.08)",
        overlay: "0 18px 45px rgba(15, 23, 42, 0.18)",
      },
      borderRadius: {
        lg: "0.75rem",   // 12
        xl: "1rem",      // 16
        "2xl": "1.25rem" // 20 (cards)
      },
    },
  },
  plugins: [],
};
