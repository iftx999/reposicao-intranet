"use client";

import { Edit3, Plus, Search, UserX, XCircle } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { UserModal } from "@/components/UserModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleLabels } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import type { Profile, ProfileCreateValues, ProfileUpdateValues, Sector, UserRole } from "@/lib/types";

type ActiveFilter = "all" | "active" | "inactive";
type RoleFilter = "all" | UserRole;

const fieldClassName =
  "mt-2 h-auto w-full rounded-full border border-white/10 bg-graphite px-4 py-2.5 text-sm text-ice outline-none placeholder:text-subtle transition focus-visible:border-soda/60 focus-visible:ring-2 focus-visible:ring-soda/25";

const selectContentClassName =
  "rounded-[28px] border border-white/[0.08] bg-charcoal p-2 text-ice shadow-dialog ring-0";

const selectItemClassName = "rounded-full px-3 py-2 text-sm text-ice focus:bg-white/10 focus:text-white";

const primaryButtonClassName =
  "h-auto rounded-full bg-lime px-5 py-3 text-sm font-semibold text-graphite shadow-[0_16px_38px_rgba(182,232,95,0.2)] transition hover:brightness-95 active:scale-[0.98]";

const secondaryButtonClassName =
  "h-auto rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-ice transition hover:bg-white/10";

const badgeClassName = "h-auto px-2.5 py-1 text-[11px] font-semibold";

const userGridTemplateColumns =
  "minmax(220px,1.4fr) minmax(220px,1.5fr) minmax(110px,0.75fr) minmax(120px,0.85fr) minmax(90px,0.65fr) minmax(150px,1fr) minmax(84px,0.6fr)";

const userColumnLabels = ["Nome", "Email", "Role", "Setor", "Ativo", "Criado em", "Ações"];

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
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

  async function loadSectors() {
    const { data } = await supabase.from("sectors").select("*").order("name");
    setSectors((data || []) as Sector[]);
  }

  useEffect(() => {
    void loadProfiles();
    void loadSectors();
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
  const sectorsById = useMemo(() => new Map(sectors.map((sector) => [sector.id, sector.name])), [sectors]);

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
          <h1 className="mt-2 text-3xl font-black text-white">Cadastro de Usuários</h1>
        </div>
        <Button
          className={primaryButtonClassName}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <section className="mt-6 rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-bold text-muted">Buscar</span>
            <span className="mt-2 flex h-auto w-full items-center gap-3 rounded-full border border-white/10 bg-graphite px-4 py-2.5 text-sm text-ice transition focus-within:border-soda/60 focus-within:ring-2 focus-within:ring-soda/25">
              <Search className="h-4 w-4 text-muted" />
              <Input
                className="h-auto flex-1 border-0 bg-transparent p-0 text-sm text-ice shadow-none outline-none placeholder:text-subtle focus-visible:ring-0"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome ou email"
                value={query}
              />
            </span>
          </label>
          <div>
            <Label className="text-sm font-bold text-muted">Role</Label>
            <Select onValueChange={(value) => setRole(value as RoleFilter)} value={role}>
              <SelectTrigger className={fieldClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                <SelectItem className={selectItemClassName} value="all">Todos</SelectItem>
                <SelectItem className={selectItemClassName} value="admin">Admin</SelectItem>
                <SelectItem className={selectItemClassName} value="gestor">Gestor</SelectItem>
                <SelectItem className={selectItemClassName} value="operador">Operador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-bold text-muted">Ativo/Inativo</Label>
            <Select onValueChange={(value) => setActive(value as ActiveFilter)} value={active}>
              <SelectTrigger className={fieldClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                <SelectItem className={selectItemClassName} value="all">Todos</SelectItem>
                <SelectItem className={selectItemClassName} value="active">Ativos</SelectItem>
                <SelectItem className={selectItemClassName} value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button
            className={secondaryButtonClassName}
            onClick={() => {
              setQuery("");
              setRole("all");
              setActive("all");
            }}
            variant="outline"
          >
            <XCircle className="h-4 w-4" /> Limpar
          </Button>
        </div>
      </section>

      {error ? (
        <p className="mt-4 rounded-[28px] border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
          {error}
        </p>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-charcoal shadow-panel">
        <div
          className="hidden border-b border-white/[0.06] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted md:grid md:items-center md:gap-4"
          style={{ gridTemplateColumns: userGridTemplateColumns }}
        >
          {userColumnLabels.map((label) => (
            <div className={label === "Ações" ? "text-right" : undefined} key={label}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-muted">Carregando usuários...</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">Nenhum usuário encontrado.</p>
        ) : (
          filtered.map((profile) => (
            <UserListRow
              key={profile.id}
              onDeactivate={() => void deactivateProfile(profile)}
              onEdit={() => {
                setEditing(profile);
                setModalOpen(true);
              }}
              profile={profile}
              sectorName={profile.sector_id ? sectorsById.get(profile.sector_id) || profile.sector_id : "-"}
            />
          ))
        )}
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

function UserListRow({
  onDeactivate,
  onEdit,
  profile,
  sectorName
}: {
  onDeactivate: () => void;
  onEdit: () => void;
  profile: Profile;
  sectorName: string;
}) {
  return (
    <div
      className="border-b border-white/[0.06] px-5 py-4 transition hover:bg-white/[0.04] last:border-b-0 md:grid md:items-center md:gap-4"
      style={{ gridTemplateColumns: userGridTemplateColumns }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soda/15 text-sm font-bold text-soda">
          {profile.full_name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{profile.full_name}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Nome</p>
        </div>
      </div>

      <UserTextCell label="Email" value={profile.email} />
      <UserBadgeCell label="Role">
        <Badge className={badgeClassName} variant="neutral">
          {roleLabels[profile.role]}
        </Badge>
      </UserBadgeCell>
      <UserTextCell label="Setor" value={sectorName} />
      <UserBadgeCell label="Ativo">
        <Badge className={badgeClassName} variant={profile.active ? "success" : "neutral"}>
          {profile.active ? "Ativo" : "Inativo"}
        </Badge>
      </UserBadgeCell>
      <UserTextCell label="Criado em" value={new Date(profile.created_at).toLocaleString("pt-BR")} />

      <div className="mt-4 flex items-center justify-between gap-3 md:mt-0 md:justify-end">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Ações</span>
        <div className="flex gap-2">
          <Button
            aria-label={`Editar ${profile.full_name}`}
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-soda"
            onClick={onEdit}
            size="icon"
            variant="ghost"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            aria-label={`Desativar ${profile.full_name}`}
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-coral/10 hover:text-coral disabled:pointer-events-none disabled:opacity-40"
            disabled={!profile.active}
            onClick={onDeactivate}
            size="icon"
            variant="ghost"
          >
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserTextCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 flex min-w-0 items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      <span className="truncate text-sm text-muted">{value}</span>
    </div>
  );
}

function UserBadgeCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      {children}
    </div>
  );
}
