"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { EmpresaModal } from "@/components/EmpresaModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Company, CompanyCreateValues } from "@/lib/types";

const primaryButtonClassName =
  "h-auto rounded-full bg-lime px-5 py-3 text-sm font-semibold text-graphite shadow-[0_16px_38px_rgba(182,232,95,0.2)] transition hover:brightness-95 active:scale-[0.98]";

const badgeClassName = "h-auto px-2.5 py-1 text-[11px] font-semibold";

const companyGridTemplateColumns = "minmax(220px,2fr) minmax(110px,0.8fr) minmax(180px,1fr)";

const companyColumnLabels = ["Nome", "Ativa", "Criada em"];

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function loadCompanies() {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("companies").select("*").order("name");

    if (loadError) {
      setError(loadError.message);
    } else {
      setCompanies((data || []) as Company[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  async function createCompany(values: CompanyCreateValues) {
    setError("");
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const response = await fetch("/api/empresas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Erro ao criar empresa.");
      return;
    }

    setModalOpen(false);
    await loadCompanies();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Plataforma</p>
          <h1 className="mt-2 text-3xl font-black text-white">Empresas</h1>
        </div>
        <Button className={primaryButtonClassName} onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-[28px] border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
          {error}
        </p>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-charcoal shadow-panel">
        <div
          className="hidden border-b border-white/[0.06] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted md:grid md:items-center md:gap-4"
          style={{ gridTemplateColumns: companyGridTemplateColumns }}
        >
          {companyColumnLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-muted">Carregando empresas...</p>
        ) : companies.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">Nenhuma empresa encontrada.</p>
        ) : (
          companies.map((company) => <CompanyListRow company={company} key={company.id} />)
        )}
      </section>

      {modalOpen ? <EmpresaModal onClose={() => setModalOpen(false)} onCreate={createCompany} /> : null}
    </main>
  );
}

function CompanyListRow({ company }: { company: Company }) {
  return (
    <div
      className="border-b border-white/[0.06] px-5 py-4 transition hover:bg-white/[0.04] last:border-b-0 md:grid md:items-center md:gap-4"
      style={{ gridTemplateColumns: companyGridTemplateColumns }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soda/15 text-sm font-bold text-soda">
          {company.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{company.name}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Nome</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Ativa</span>
        <Badge className={badgeClassName} variant={company.active ? "success" : "neutral"}>
          {company.active ? "Ativa" : "Inativa"}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Criada em</span>
        <span className="text-sm text-muted">{new Date(company.created_at).toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}
