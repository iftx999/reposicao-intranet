"use client";

import { Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, router, session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setSubmitting(false);
      setError(signInError.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("active")
      .eq("id", data.user.id)
      .maybeSingle();

    setSubmitting(false);

    if (profile && profile.active === false) {
      await supabase.auth.signOut();
      setError("Usuário desativado. Fale com um administrador.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-ice lg:grid-cols-[minmax(420px,0.92fr)_1.08fr]">
      <section className="flex items-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo />
          <div className="mt-12">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-muted">BAR Intranet</p>
            <h1 className="mt-3 text-5xl font-black text-graphite">Acesso</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Entre com seu email e senha para administrar produtos e solicitações de reposição.
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <div className="mt-8 rounded-lg border border-amber/50 bg-amber/10 p-4 text-sm font-semibold text-graphite">
              Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local para autenticar.
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="text-sm font-bold text-graphite">Email</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-charcoal/10 bg-white px-4">
                <Mail className="h-5 w-5 text-muted" />
                <input
                  className="h-full flex-1 bg-transparent text-sm text-graphite outline-none"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-graphite">Senha</span>
              <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-charcoal/10 bg-white px-4">
                <Lock className="h-5 w-5 text-muted" />
                <input
                  className="h-full flex-1 bg-transparent text-sm text-graphite outline-none"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </span>
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-muted">
              <input
                checked={remember}
                className="h-4 w-4 rounded border-charcoal/20 text-graphite"
                onChange={(event) => setRemember(event.target.checked)}
                type="checkbox"
              />
              Lembrar de mim
            </label>
            {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p> : null}
            <button
              className="focus-ring h-13 w-full rounded-xl bg-graphite px-6 py-4 text-sm font-black text-white shadow-panel transition hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-graphite p-12 text-white lg:block">
        <div className="absolute inset-y-16 right-0 w-28 rounded-l-full bg-lime/90" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <Logo dark />
          <div className="max-w-xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-lime">operação conectada</p>
            <h2 className="mt-6 text-6xl font-black leading-[0.95] tracking-normal text-white">
              Reposição sem ruído entre salão, bar e estoque.
            </h2>
            <p className="mt-6 text-lg leading-8 text-ice/75">
              Cadastre produtos, acompanhe solicitações e mantenha o mesmo Supabase alimentando o app Android BAR.
            </p>
            <div className="mt-10 flex items-center">
              {["MC", "BR", "OP", "AD"].map((avatar, index) => (
                <div
                  className="-ml-3 grid h-14 w-14 place-items-center rounded-full border-4 border-graphite bg-charcoal text-sm font-black first:ml-0"
                  key={avatar}
                  style={{ transform: `translateY(${index % 2 === 0 ? 0 : 10}px)` }}
                >
                  {avatar}
                </div>
              ))}
              <div className="ml-5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-ice">Equipe online</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm text-ice/70">
            <div className="border-t border-white/15 pt-4">Produtos ativos</div>
            <div className="border-t border-white/15 pt-4">Status rastreável</div>
            <div className="border-t border-white/15 pt-4">Mobile sync</div>
          </div>
        </div>
      </section>
    </main>
  );
}
