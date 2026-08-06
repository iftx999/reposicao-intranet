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
      }
    }
  },
  plugins: []
};

export default config;
