"use client";

import { X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { roleLabels } from "@/lib/profile";
import type { Profile, ProfileCreateValues, ProfileUpdateValues, UserRole } from "@/lib/types";

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
  const [saving, setSaving] = useState(false);

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-graphite/45 px-4">
      <form className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-panel" onSubmit={submit}>
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
          <div>
            <h2 className="text-xl font-black text-graphite">{profile ? "Editar usuário" : "Adicionar usuário"}</h2>
            <p className="text-sm text-muted">
              {profile ? "Atualize os dados operacionais do perfil." : "Cria auth.users e o profile vinculado."}
            </p>
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
          <Field label="Nome completo">
            <input
              className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setValues((current) => ({ ...current, full_name: event.target.value }))}
              required
              value={values.full_name}
            />
          </Field>
          <Field label="Email">
            <input
              className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda disabled:bg-ice disabled:text-muted"
              disabled={Boolean(profile)}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
              required
              type="email"
              value={values.email}
            />
          </Field>
          {!profile ? (
            <Field label="Senha temporária">
              <input
                className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
                minLength={6}
                onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={values.password}
              />
            </Field>
          ) : null}
          <Field label="Role">
            <select
              className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setValues((current) => ({ ...current, role: event.target.value as UserRole }))}
              value={values.role}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Setor">
            <input
              className="h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setValues((current) => ({ ...current, sector_id: event.target.value }))}
              placeholder="BAR"
              value={values.sector_id || ""}
            />
          </Field>
        </div>

        <div className="mt-6">
          <label className="inline-flex items-center gap-3 rounded-lg border border-charcoal/10 px-4 py-3 text-sm font-bold text-graphite">
            <input
              checked={values.active}
              onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))}
              type="checkbox"
            />
            Ativo
          </label>
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
