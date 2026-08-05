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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Product, ProductFormValues, Sector } from "@/lib/types";

const emptyValues: ProductFormValues = {
  name: "",
  category: "",
  sector_id: "",
  unit: "",
  active: true,
  favorite: false,
  quantity: 0,
  min_quantity: 0
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
  const [sectors, setSectors] = useState<Sector[]>([]);

  useEffect(() => {
    supabase
      .from("sectors")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setSectors((data || []) as Sector[]));
  }, []);

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
              <Select
                onValueChange={(value) => setValues((current) => ({ ...current, sector_id: value }))}
                value={values.sector_id}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div>
              <Label>Quantidade</Label>
              <Input
                className="mt-2"
                min={0}
                onChange={(event) => setValues((current) => ({ ...current, quantity: Number(event.target.value) }))}
                required
                type="number"
                value={values.quantity}
              />
            </div>
            <div>
              <Label>Quantidade mínima</Label>
              <Input
                className="mt-2"
                min={0}
                onChange={(event) => setValues((current) => ({ ...current, min_quantity: Number(event.target.value) }))}
                required
                type="number"
                value={values.min_quantity}
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
