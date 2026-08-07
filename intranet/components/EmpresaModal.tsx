"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyCreateValues } from "@/lib/types";

const emptyValues: CompanyCreateValues = {
  company_name: "",
  admin_full_name: "",
  admin_email: "",
  admin_password: ""
};

export function EmpresaModal({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (values: CompanyCreateValues) => Promise<void>;
}) {
  const [values, setValues] = useState<CompanyCreateValues>(emptyValues);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onCreate(values);
    setSaving(false);
  }

  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Adicionar empresa</DialogTitle>
            <DialogDescription>Cria a empresa e o primeiro usuario admin dela.</DialogDescription>
          </DialogHeader>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome da empresa</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, company_name: event.target.value }))}
                required
                value={values.company_name}
              />
            </div>
            <div>
              <Label>Nome do admin</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, admin_full_name: event.target.value }))}
                required
                value={values.admin_full_name}
              />
            </div>
            <div>
              <Label>Email do admin</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, admin_email: event.target.value }))}
                required
                type="email"
                value={values.admin_email}
              />
            </div>
            <div>
              <Label>Senha temporaria</Label>
              <Input
                className="mt-2"
                minLength={6}
                onChange={(event) => setValues((current) => ({ ...current, admin_password: event.target.value }))}
                required
                type="password"
                value={values.admin_password}
              />
            </div>
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
