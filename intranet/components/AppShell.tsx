"use client";

import { BarChart3, Boxes, Building2, Expand, LayoutDashboard, Layers, LogOut, Menu, PackageSearch, Settings, ClipboardList, LucideIcon, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";

type NavItem = { href: string; label: string; icon?: LucideIcon };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Pesquisa/Produtos", icon: PackageSearch },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/setores", label: "Setores", icon: Layers },
  { href: "/solicitacoes", label: "Solicitações", icon: ClipboardList },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/administrativo", label: "Administrativo", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, router, session]);

  // Navegar fecha o menu; sem isso ele fica aberto por cima da tela nova.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (loading || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-graphite text-muted">
        <div className="flex flex-col items-center gap-4 text-center">
          <Spinner size="lg" />
          <span className="text-sm font-semibold">Carregando painel...</span>
        </div>
      </main>
    );
  }

  const initials = session.user.email?.slice(0, 2).toUpperCase() || "AD";
  const visibleItems = profile?.is_super_admin
    ? [...navItems, { href: "/empresas", label: "Empresas", icon: Building2 }]
    : navItems;

  return (
    <div className="min-h-screen bg-graphite text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-charcoal">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-6">
          <Logo dark />
          {/*
            Com todos os rotulos visiveis a nav mede ~1191px e o container so
            oferece 1232px, que precisam acomodar tambem logo e controles. Por
            isso inativos ficam so com icone; o item ativo mantem o rotulo para
            a tela sempre dizer onde voce esta.
          */}
          <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
            {visibleItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={`focus-ring inline-flex h-11 items-center gap-2 rounded-full text-sm font-bold transition ${
                    active
                      ? "bg-lime px-4 text-graphite shadow-[0_16px_38px_rgba(182,232,95,0.2)]"
                      : "px-3 text-muted hover:bg-white/5 hover:text-ice"
                  }`}
                  href={item.href}
                  key={item.href}
                  title={item.label}
                >
                  {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
                  {active ? <span className="whitespace-nowrap">{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              aria-controls="menu-mobile"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className="focus-ring grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-ice lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button
              aria-label="Expandir"
              className="focus-ring hidden h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-ice sm:grid"
              type="button"
            >
              <Expand className="h-5 w-5" />
            </button>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-soda/15 text-xs font-black text-soda">
              {initials}
            </div>
            <button
              aria-label="Sair"
              className="focus-ring grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-coral/10 hover:text-coral"
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

        {menuOpen ? (
          <nav
            aria-label="Navegação principal"
            className="border-t border-white/[0.08] bg-charcoal lg:hidden"
            id="menu-mobile"
          >
            <div className="mx-auto grid max-w-7xl gap-1 px-6 py-4 sm:grid-cols-2">
              {visibleItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`focus-ring inline-flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                      active ? "bg-lime text-graphite" : "text-muted hover:bg-white/5 hover:text-ice"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </header>
      {children}
    </div>
  );
}
