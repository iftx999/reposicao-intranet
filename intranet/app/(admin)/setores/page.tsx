"use client";

import { Edit3, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { SectorModal } from "@/components/SectorModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Sector, SectorCreateValues, SectorUpdateValues } from "@/lib/types";

const primaryButtonClassName =
  "h-auto rounded-full bg-lime px-5 py-3 text-sm font-semibold text-graphite shadow-[0_16px_38px_rgba(182,232,95,0.2)] transition hover:brightness-95 active:scale-[0.98]";

const badgeClassName = "h-auto px-2.5 py-1 text-[11px] font-semibold";

const sectorGridTemplateColumns = "minmax(220px,2fr) minmax(120px,0.8fr) minmax(84px,0.5fr)";

const sectorColumnLabels = ["Nome", "Ativo", "Acoes"];

export default function SetoresPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Sector | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadSectors() {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("sectors").select("*").order("name");

    if (loadError) {
      setError(loadError.message);
    } else {
      setSectors((data || []) as Sector[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadSectors();
  }, []);

  async function saveSector(values: SectorCreateValues | SectorUpdateValues) {
    setError("");

    if (editing) {
      const { error: updateError } = await supabase.from("sectors").update(values).eq("id", editing.id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("sectors").insert(values);
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    setModalOpen(false);
    setEditing(null);
    await loadSectors();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Cadastros</p>
          <h1 className="mt-2 text-3xl font-black text-white">Setores</h1>
        </div>
        <Button
          className={primaryButtonClassName}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
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
          style={{ gridTemplateColumns: sectorGridTemplateColumns }}
        >
          {sectorColumnLabels.map((label) => (
            <div className={label === "Acoes" ? "text-right" : undefined} key={label}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-muted">Carregando setores...</p>
        ) : sectors.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">Nenhum setor encontrado.</p>
        ) : (
          sectors.map((sector) => (
            <SectorListRow
              key={sector.id}
              onEdit={() => {
                setEditing(sector);
                setModalOpen(true);
              }}
              sector={sector}
            />
          ))
        )}
      </section>

      {modalOpen ? (
        <SectorModal
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={saveSector}
          sector={editing}
        />
      ) : null}
    </main>
  );
}

function SectorListRow({ onEdit, sector }: { onEdit: () => void; sector: Sector }) {
  return (
    <div
      className="border-b border-white/[0.06] px-5 py-4 transition hover:bg-white/[0.04] last:border-b-0 md:grid md:items-center md:gap-4"
      style={{ gridTemplateColumns: sectorGridTemplateColumns }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soda/15 text-sm font-bold text-soda">
          {sector.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{sector.name}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Nome</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Ativo</span>
        <Badge className={badgeClassName} variant={sector.active ? "success" : "neutral"}>
          {sector.active ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 md:mt-0 md:justify-end">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Acoes</span>
        <Button
          aria-label={`Editar ${sector.name}`}
          className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-soda"
          onClick={onEdit}
          size="icon"
          variant="ghost"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
