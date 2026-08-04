"use client";

import { X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { Product, ProductFormValues } from "@/lib/types";

const emptyValues: ProductFormValues = {
  name: "",
  category: "",
  sector_id: "",
  unit: "",
  active: true,
  favorite: false
};

export function ProductModal({
  product,
  onClose,
  onSave
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (values: ProductFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ProductFormValues>(emptyValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(product ? { ...product } : emptyValues);
  }, [product]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onSave(values);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-graphite/45 px-4">
      <form className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-panel" onSubmit={submit}>
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
          <div>
            <h2 className="text-xl font-black text-graphite">{product ? "Editar produto" : "Adicionar produto"}</h2>
            <p className="text-sm text-muted">Dados compartilhados com o app BAR.</p>
          </div>
          <button
            aria-label="Fechar"
            className="focus-ring grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-charcoal/5"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <input
              className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              required
              value={values.name}
            />
          </Field>
          <Field label="Categoria">
            <input
              className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
              required
              value={values.category}
            />
          </Field>
          <Field label="Setor">
            <input
              className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setValues((current) => ({ ...current, sector_id: event.target.value }))}
              required
              value={values.sector_id}
            />
          </Field>
          <Field label="Unidade">
            <input
              className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setValues((current) => ({ ...current, unit: event.target.value }))}
              required
              value={values.unit}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <Toggle
            checked={values.active}
            label="Ativo"
            onChange={(checked) => setValues((current) => ({ ...current, active: checked }))}
          />
          <Toggle
            checked={values.favorite}
            label="Favorito"
            onChange={(checked) => setValues((current) => ({ ...current, favorite: checked }))}
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            className="focus-ring rounded-lg border border-charcoal/10 px-5 py-3 text-sm font-black text-muted hover:text-graphite"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="focus-ring rounded-lg bg-graphite px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-graphite">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-charcoal/10 px-4 py-3 text-sm font-bold text-graphite">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}
