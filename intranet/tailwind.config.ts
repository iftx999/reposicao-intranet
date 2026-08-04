import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#16191D",
        charcoal: "#24282E",
        ice: "#F7F8FA",
        lime: "#B6E85F",
        coral: "#FF5A4F",
        amber: "#F6B44B",
        soda: "#48A9F8",
        muted: "#6B727A"
      },
      boxShadow: {
        panel: "0 24px 70px rgba(22, 25, 29, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
