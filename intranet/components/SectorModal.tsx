"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import type { Sector, SectorCreateValues, SectorUpdateValues } from "@/lib/types";

const emptyValues: SectorCreateValues = { name: "", active: true };

export function SectorModal({
  sector,
  onClose,
  onSave
}: {
  sector: Sector | null;
  onClose: () => void;
  onSave: (values: SectorCreateValues | SectorUpdateValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SectorCreateValues>(emptyValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(sector ? { name: sector.name, active: sector.active } : emptyValues);
  }, [sector]);

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
      <DialogContent className="max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{sector ? "Editar setor" : "Adicionar setor"}</DialogTitle>
            <DialogDescription>Setores organizam os produtos por area.</DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Label>Nome</Label>
            <Input
              className="mt-2"
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              required
              value={values.name}
            />
          </div>
          <div className="mt-6">
            <ToggleSwitch
              checked={values.active}
              label="Ativo"
              onClick={() => setValues((current) => ({ ...current, active: !current.active }))}
              tone="lime"
            />
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
