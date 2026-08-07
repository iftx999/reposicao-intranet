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
        muted: "#8A919A",
        // Alias para os primitivos shadcn, que usam `text-muted-foreground`.
        // Sem isso a classe nao existe e o texto herda branco.
        "muted-foreground": "#8A919A",
        subtle: "#6B727A",
        "badge-neutral": "#A8B0B8",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted2: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        panel: "0 24px 70px rgba(22, 25, 29, 0.16)",
        dialog: "0 12px 32px rgba(22, 25, 29, 0.14)",
        soft: "0 1px 2px rgba(22, 25, 29, 0.04), 0 8px 20px rgba(22, 25, 29, 0.06)"
      },
      keyframes: {
        "page-enter": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "dialog-overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "dialog-overlay-out": {
          from: { opacity: "1" },
          to: { opacity: "0" }
        },
        "dialog-content-in": {
          from: { opacity: "0", transform: "translate(-50%, -50%) scale(0.95)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" }
        },
        "dialog-content-out": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, -50%) scale(0.95)" }
        },
        "select-content-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "select-content-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" }
        }
      },
      animation: {
        "page-enter": "page-enter 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "dialog-overlay-in": "dialog-overlay-in 160ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "dialog-overlay-out": "dialog-overlay-out 120ms cubic-bezier(0.7, 0, 0.84, 0) both",
        "dialog-content-in": "dialog-content-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "dialog-content-out": "dialog-content-out 120ms cubic-bezier(0.7, 0, 0.84, 0) both",
        "select-content-in": "select-content-in 160ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "select-content-out": "select-content-out 120ms cubic-bezier(0.7, 0, 0.84, 0) both"
      }
    }
  },
  plugins: []
};

export default config;
