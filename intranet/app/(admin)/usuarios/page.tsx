"use client";

import { Edit3, Plus, Search, UserX, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserModal } from "@/components/UserModal";
import { roleClasses, roleLabels } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import type { Profile, ProfileCreateValues, ProfileUpdateValues, UserRole } from "@/lib/types";

type ActiveFilter = "all" | "active" | "inactive";
type RoleFilter = "all" | UserRole;

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadProfiles() {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("profiles").select("*").order("full_name");

    if (loadError) {
      setError(loadError.message);
    } else {
      setProfiles((data || []) as Profile[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  const filtered = useMemo(
    () =>
      profiles.filter((profile) => {
        const normalizedQuery = query.toLowerCase();
        const matchesQuery =
          !normalizedQuery ||
          profile.full_name.toLowerCase().includes(normalizedQuery) ||
          profile.email.toLowerCase().includes(normalizedQuery);
        const matchesRole = role === "all" || profile.role === role;
        const matchesActive = active === "all" || profile.active === (active === "active");

        return matchesQuery && matchesRole && matchesActive;
      }),
    [active, profiles, query, role]
  );

  async function createProfile(values: ProfileCreateValues) {
    setError("");
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const response = await fetch("/api/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Erro ao criar usuário.");
      return;
    }

    setModalOpen(false);
    await loadProfiles();
  }

  async function updateProfile(values: ProfileUpdateValues) {
    if (!editing) {
      return;
    }

    setError("");
    const { error: updateError } = await supabase.from("profiles").update(values).eq("id", editing.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setModalOpen(false);
    setEditing(null);
    await loadProfiles();
  }

  async function deactivateProfile(profile: Profile) {
    setError("");
    const { error: updateError } = await supabase.from("profiles").update({ active: false }).eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadProfiles();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Administrativo</p>
          <h1 className="mt-2 text-3xl font-black text-graphite">Cadastro de Usuários</h1>
        </div>
        <button
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-graphite px-4 py-3 text-sm font-black text-white"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          type="button"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-bold text-graphite">Buscar</span>
            <span className="mt-2 flex h-11 items-center gap-3 rounded-lg border border-charcoal/10 px-3 focus-within:border-soda">
              <Search className="h-4 w-4 text-muted" />
              <input
                className="h-full flex-1 bg-transparent text-sm outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome ou email"
                value={query}
              />
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-graphite">Role</span>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setRole(event.target.value as RoleFilter)}
              value={role}
            >
              <option value="all">Todos</option>
              <option value="admin">Admin</option>
              <option value="gestor">Gestor</option>
              <option value="operador">Operador</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-graphite">Ativo/Inativo</span>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setActive(event.target.value as ActiveFilter)}
              value={active}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </label>
        </div>
        <div className="mt-4">
          <button
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-charcoal/10 px-4 py-2 text-sm font-black text-muted"
            onClick={() => {
              setQuery("");
              setRole("all");
              setActive("all");
            }}
            type="button"
          >
            <XCircle className="h-4 w-4" /> Limpar
          </button>
        </div>
      </section>

      {error ? <p className="mt-4 rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="bg-charcoal text-white">
            <tr>
              {["Nome", "Email", "Role", "Setor", "Ativo", "Criado em", "Ações"].map((heading) => (
                <th className="px-4 py-4 font-black" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={7}>Carregando usuários...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted" colSpan={7}>Nenhum usuário encontrado.</td>
              </tr>
            ) : (
              filtered.map((profile) => (
                <tr className="border-t border-charcoal/10 hover:bg-ice" key={profile.id}>
                  <td className="px-4 py-4 font-bold text-graphite">{profile.full_name}</td>
                  <td className="px-4 py-4 text-muted">{profile.email}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${roleClasses[profile.role]}`}>
                      {roleLabels[profile.role]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted">{profile.sector_id || "-"}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${profile.active ? "bg-lime/20 text-graphite ring-1 ring-lime/50" : "bg-coral/15 text-coral ring-1 ring-coral/40"}`}>
                      {profile.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted">{new Date(profile.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        aria-label={`Editar ${profile.full_name}`}
                        className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-soda hover:bg-soda/10"
                        onClick={() => {
                          setEditing(profile);
                          setModalOpen(true);
                        }}
                        type="button"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Desativar ${profile.full_name}`}
                        className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-coral hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!profile.active}
                        onClick={() => void deactivateProfile(profile)}
                        type="button"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {modalOpen ? (
        <UserModal
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onCreate={createProfile}
          onUpdate={updateProfile}
          profile={editing}
        />
      ) : null}
    </main>
  );
}
