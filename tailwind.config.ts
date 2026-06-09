import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk / neon palette
        ink: {
          950: "#05060a",
          900: "#0a0c14",
          800: "#0f1320",
          700: "#141a2b",
          600: "#1b2238",
        },
        neon: {
          green: "#39ff8a",
          red: "#ff2e63",
          cyan: "#22e9ff",
          violet: "#a26bff",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "neon-green":
          "0 0 8px rgba(57,255,138,0.55), 0 0 24px rgba(57,255,138,0.35), 0 0 48px rgba(57,255,138,0.18)",
        "neon-red":
          "0 0 8px rgba(255,46,99,0.6), 0 0 24px rgba(255,46,99,0.4), 0 0 48px rgba(255,46,99,0.22)",
        "neon-cyan":
          "0 0 12px rgba(34,233,255,0.35), 0 0 36px rgba(34,233,255,0.18)",
        "glass":
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 60px -20px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": {
            boxShadow:
              "0 0 6px rgba(255,46,99,0.55), 0 0 18px rgba(255,46,99,0.4), 0 0 36px rgba(255,46,99,0.22)",
          },
          "50%": {
            boxShadow:
              "0 0 14px rgba(255,46,99,0.85), 0 0 38px rgba(255,46,99,0.6), 0 0 72px rgba(255,46,99,0.35)",
          },
        },
        "pulse-soft-green": {
          "0%, 100%": {
            boxShadow:
              "0 0 6px rgba(57,255,138,0.45), 0 0 18px rgba(57,255,138,0.28)",
          },
          "50%": {
            boxShadow:
              "0 0 12px rgba(57,255,138,0.7), 0 0 30px rgba(57,255,138,0.4)",
          },
        },
        "grid-drift": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "60px 60px" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-red": "pulse-red 1.6s ease-in-out infinite",
        "pulse-soft-green": "pulse-soft-green 3.2s ease-in-out infinite",
        "grid-drift": "grid-drift 18s linear infinite",
        "scan-line": "scan-line 6s linear infinite",
        "fade-up": "fade-up 600ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
