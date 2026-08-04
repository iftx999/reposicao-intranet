"use client";

import { Expand, LayoutDashboard, LogOut, PackageSearch, Settings, ClipboardList, LucideIcon, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type NavItem = { href: string; label: string; icon?: LucideIcon };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Pesquisa/Produtos", icon: PackageSearch },
  { href: "/solicitacoes", label: "Solicitações", icon: ClipboardList },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/administrativo", label: "Administrativo", icon: Settings }
];

const extraItems: NavItem[] = [
  { href: "/agenda", label: "Agenda" },
  { href: "/deb", label: "DEB" },
  { href: "/gbb", label: "GBB" },
  { href: "/marketing", label: "Marketing" },
  { href: "/bbb360-adm", label: "BBB360 ADM" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, router, session]);

  if (loading || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-ice text-muted">
        <span className="text-sm font-semibold">Carregando painel...</span>
      </main>
    );
  }

  const initials = session.user.email?.slice(0, 2).toUpperCase() || "AD";

  return (
    <div className="min-h-screen bg-ice">
      <header className="sticky top-0 z-30 border-b border-charcoal/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {[...navItems, ...extraItems].map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  className={`focus-ring inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
                    active ? "bg-graphite text-white" : "text-muted hover:bg-charcoal/5 hover:text-graphite"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              aria-label="Expandir"
              className="focus-ring grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-charcoal/5 hover:text-graphite"
              type="button"
            >
              <Expand className="h-5 w-5" />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-charcoal text-xs font-black text-white">
              {initials}
            </div>
            <button
              aria-label="Sair"
              className="focus-ring grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-coral/10 hover:text-coral"
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
              type="button"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
