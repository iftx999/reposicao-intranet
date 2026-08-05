"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { EmpresaModal } from "@/components/EmpresaModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import type { Company, CompanyCreateValues } from "@/lib/types";

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
          <h1 className="mt-2 text-3xl font-black text-graphite">Empresas</h1>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-charcoal hover:bg-charcoal">
              {["Nome", "Ativa", "Criada em"].map((heading) => (
                <TableHead className="font-black text-white" key={heading}>{heading}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-muted" colSpan={3}>Carregando empresas...</TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell className="text-muted" colSpan={3}>Nenhuma empresa encontrada.</TableCell></TableRow>
            ) : (
              companies.map((company) => (
                <TableRow className="hover:bg-ice" key={company.id}>
                  <TableCell className="font-bold text-graphite">{company.name}</TableCell>
                  <TableCell>
                    <Badge variant={company.active ? "success" : "destructive"}>
                      {company.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted">{new Date(company.created_at).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {modalOpen ? <EmpresaModal onClose={() => setModalOpen(false)} onCreate={createCompany} /> : null}
    </main>
  );
}
