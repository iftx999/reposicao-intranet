"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{product ? "Editar produto" : "Adicionar produto"}</DialogTitle>
            <DialogDescription>Dados compartilhados com o app BAR.</DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                required
                value={values.name}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
                required
                value={values.category}
              />
            </div>
            <div>
              <Label>Setor</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, sector_id: event.target.value }))}
                required
                value={values.sector_id}
              />
            </div>
            <div>
              <Label>Unidade</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, unit: event.target.value }))}
                required
                value={values.unit}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Label className="flex items-center gap-3 rounded-lg border border-charcoal/10 px-4 py-3 text-sm font-bold text-graphite">
              <Checkbox
                checked={values.active}
                onCheckedChange={(checked) => setValues((current) => ({ ...current, active: checked === true }))}
              />
              Ativo
            </Label>
            <Label className="flex items-center gap-3 rounded-lg border border-charcoal/10 px-4 py-3 text-sm font-bold text-graphite">
              <Checkbox
                checked={values.favorite}
                onCheckedChange={(checked) => setValues((current) => ({ ...current, favorite: checked === true }))}
              />
              Favorito
            </Label>
          </div>

          <DialogFooter className="mt-8">
            <Button onClick={onClose} type="button" variant="outline">Cancelar</Button>
            <Button disabled={saving} type="submit">{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
