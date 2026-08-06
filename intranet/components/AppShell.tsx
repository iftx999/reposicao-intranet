"use client";

import { Building2, Expand, LayoutDashboard, Layers, LogOut, PackageSearch, Settings, ClipboardList, LucideIcon, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";

type NavItem = { href: string; label: string; icon?: LucideIcon };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Pesquisa/Produtos", icon: PackageSearch },
  { href: "/setores", label: "Setores", icon: Layers },
  { href: "/solicitacoes", label: "Solicitações", icon: ClipboardList },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/administrativo", label: "Administrativo", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, router, session]);

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

  return (
    <div className="min-h-screen bg-graphite text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-charcoal">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Logo dark />
          <nav className="hidden items-center gap-1 lg:flex">
            {(profile?.is_super_admin
              ? [...navItems, { href: "/empresas", label: "Empresas", icon: Building2 }]
              : navItems
            ).map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  className={`focus-ring inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${
                    active ? "bg-lime text-graphite shadow-[0_16px_38px_rgba(182,232,95,0.2)]" : "text-muted hover:bg-white/5 hover:text-ice"
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
              className="focus-ring grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-ice"
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
      </header>
      {children}
    </div>
  );
}
