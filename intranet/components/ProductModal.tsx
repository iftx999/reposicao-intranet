"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { supabase } from "@/lib/supabase";
import type { Product, ProductFormValues, Sector } from "@/lib/types";

const emptyValues: ProductFormValues = {
  name: "",
  category: "",
  sector_id: "",
  unit: "",
  active: true,
  favorite: false,
  min_quantity: 0
};

const fieldClassName =
  "mt-2 h-auto w-full rounded-full border border-white/10 bg-graphite px-4 py-2.5 text-sm text-ice outline-none placeholder:text-subtle transition focus-visible:border-soda/60 focus-visible:ring-2 focus-visible:ring-soda/25";

const selectContentClassName =
  "rounded-[28px] border border-white/[0.08] bg-charcoal p-2 text-ice shadow-dialog ring-0";

const selectItemClassName = "rounded-full px-3 py-2 text-sm text-ice focus:bg-white/10 focus:text-white";

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
  const [sectors, setSectors] = useState<Sector[]>([]);
  const nameId = useId();
  const categoryId = useId();
  const sectorLabelId = useId();
  const unitId = useId();
  const minQuantityId = useId();
  const activeLabelId = useId();
  const favoriteLabelId = useId();

  useEffect(() => {
    supabase
      .from("sectors")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setSectors((data || []) as Sector[]));
  }, []);

  useEffect(() => {
    if (!product) {
      setValues(emptyValues);
      return;
    }

    const { quantity: _quantity, company_id: _companyId, id: _id, ...editableProduct } = product;
    setValues(editableProduct);
  }, [product]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onSave(values);
    setSaving(false);
  }

  return (
    <DialogPrimitive.Root
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[28px] border border-white/[0.08] bg-charcoal p-6 text-sm text-ice shadow-dialog outline-none sm:max-w-2xl">
          <form onSubmit={submit}>
            <div className="flex flex-col gap-2">
              <DialogPrimitive.Title className="text-lg font-black text-white">
                {product ? "Editar produto" : "Adicionar produto"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted">
                Dados compartilhados com o app BAR.
              </DialogPrimitive.Description>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-bold text-muted" htmlFor={nameId}>Nome</Label>
                <Input
                  className={fieldClassName}
                  id={nameId}
                  onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                  required
                  value={values.name}
                />
              </div>
              <div>
                <Label className="text-sm font-bold text-muted" htmlFor={categoryId}>Categoria</Label>
                <Input
                  className={fieldClassName}
                  id={categoryId}
                  onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
                  required
                  value={values.category}
                />
              </div>
              <div>
                <Label className="text-sm font-bold text-muted" id={sectorLabelId}>Setor</Label>
                <Select
                  onValueChange={(value) => setValues((current) => ({ ...current, sector_id: value }))}
                  value={values.sector_id}
                >
                  <SelectTrigger aria-labelledby={sectorLabelId} className={fieldClassName}>
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {sectors.map((sector) => (
                      <SelectItem className={selectItemClassName} key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-bold text-muted" htmlFor={unitId}>Unidade</Label>
                <Input
                  className={fieldClassName}
                  id={unitId}
                  onChange={(event) => setValues((current) => ({ ...current, unit: event.target.value }))}
                  required
                  value={values.unit}
                />
              </div>
              <div>
                <Label className="text-sm font-bold text-muted" htmlFor={minQuantityId}>Quantidade mínima</Label>
                <Input
                  className={fieldClassName}
                  id={minQuantityId}
                  min={0}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, min_quantity: Number(event.target.value) }))
                  }
                  required
                  type="number"
                  value={values.min_quantity}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <ToggleSwitch
                aria-labelledby={activeLabelId}
                checked={values.active}
                label={<span id={activeLabelId}>Ativo</span>}
                onClick={() => setValues((current) => ({ ...current, active: !current.active }))}
                tone="lime"
              />
              <ToggleSwitch
                aria-labelledby={favoriteLabelId}
                checked={values.favorite}
                label={<span id={favoriteLabelId}>Favorito</span>}
                onClick={() => setValues((current) => ({ ...current, favorite: !current.favorite }))}
                tone="lime"
              />
            </div>

            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                className="h-auto rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-ice transition hover:bg-white/10"
                onClick={onClose}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                className="h-auto rounded-full bg-lime px-5 py-3 text-sm font-semibold text-graphite shadow-[0_16px_38px_rgba(182,232,95,0.2)] transition hover:brightness-95 active:scale-[0.98]"
                disabled={saving}
                type="submit"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
