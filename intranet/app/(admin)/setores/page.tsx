"use client";

import { Edit3, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { SectorModal } from "@/components/SectorModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import type { Sector, SectorCreateValues, SectorUpdateValues } from "@/lib/types";

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
          <h1 className="mt-2 text-3xl font-black text-graphite">Setores</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-charcoal hover:bg-charcoal">
              {["Nome", "Ativo", "Acoes"].map((heading) => (
                <TableHead className="font-black text-white" key={heading}>{heading}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-muted" colSpan={3}>Carregando setores...</TableCell></TableRow>
            ) : sectors.length === 0 ? (
              <TableRow><TableCell className="text-muted" colSpan={3}>Nenhum setor encontrado.</TableCell></TableRow>
            ) : (
              sectors.map((sector) => (
                <TableRow className="hover:bg-ice" key={sector.id}>
                  <TableCell className="font-bold text-graphite">{sector.name}</TableCell>
                  <TableCell>
                    <Badge variant={sector.active ? "success" : "destructive"}>
                      {sector.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      aria-label={`Editar ${sector.name}`}
                      onClick={() => {
                        setEditing(sector);
                        setModalOpen(true);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
