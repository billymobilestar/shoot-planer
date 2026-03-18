/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0f0f0f",
        "bg-card": "#1a1a1a",
        "bg-card-hover": "#222222",
        "bg-input": "#151515",
        border: "#252525",
        "border-light": "#333333",
        accent: "#c87040",
        "accent-hover": "#d4845a",
        "text-primary": "#e8e4df",
        "text-secondary": "#9a928a",
        "text-muted": "#6b6560",
        success: "#7cc49a",
        danger: "#e05252",
        warning: "#e8b84a",
      },
    },
  },
  plugins: [],
};
