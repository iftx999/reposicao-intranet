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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { roleLabels } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import type { Profile, ProfileCreateValues, ProfileUpdateValues, Sector, UserRole } from "@/lib/types";

const roleOptions: UserRole[] = ["admin", "gestor", "operador"];

const emptyCreateValues: ProfileCreateValues = {
  full_name: "",
  email: "",
  password: "",
  role: "operador",
  sector_id: "",
  active: true
};

export function UserModal({
  profile,
  onClose,
  onCreate,
  onUpdate
}: {
  profile: Profile | null;
  onClose: () => void;
  onCreate: (values: ProfileCreateValues) => Promise<void>;
  onUpdate: (values: ProfileUpdateValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ProfileCreateValues>(emptyCreateValues);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("sectors")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data }) => setSectors((data || []) as Sector[]));
  }, []);

  useEffect(() => {
    setValues(
      profile
        ? {
            full_name: profile.full_name,
            email: profile.email,
            password: "",
            role: profile.role,
            sector_id: profile.sector_id || "",
            active: profile.active
          }
        : emptyCreateValues
    );
  }, [profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    if (profile) {
      await onUpdate({
        full_name: values.full_name,
        role: values.role,
        sector_id: values.sector_id?.trim() || null,
        active: values.active
      });
    } else {
      await onCreate({
        ...values,
        sector_id: values.sector_id?.trim() || null
      });
    }

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
            <DialogTitle>{profile ? "Editar usuário" : "Adicionar usuário"}</DialogTitle>
            <DialogDescription>
              {profile ? "Atualize os dados operacionais do perfil." : "Cria auth.users e o profile vinculado."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome completo</Label>
              <Input
                className="mt-2"
                onChange={(event) => setValues((current) => ({ ...current, full_name: event.target.value }))}
                required
                value={values.full_name}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-2"
                disabled={Boolean(profile)}
                onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                required
                type="email"
                value={values.email}
              />
            </div>
            {!profile ? (
              <div>
                <Label>Senha temporária</Label>
                <Input
                  className="mt-2"
                  minLength={6}
                  onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
                  required
                  type="password"
                  value={values.password}
                />
              </div>
            ) : null}
            <div>
              <Label>Role</Label>
              <Select
                onValueChange={(value) => setValues((current) => ({ ...current, role: value as UserRole }))}
                value={values.role}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor</Label>
              <Select
                onValueChange={(value) =>
                  setValues((current) => ({ ...current, sector_id: value === "__none__" ? null : value }))
                }
                value={values.sector_id || "__none__"}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem setor</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
