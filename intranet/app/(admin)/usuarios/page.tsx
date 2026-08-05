"use client";

import { Edit3, Plus, Search, UserX, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserModal } from "@/components/UserModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <section className="mt-6 rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-bold text-graphite">Buscar</span>
            <span className="mt-2 flex h-11 items-center gap-3 rounded-lg border border-charcoal/10 px-3 focus-within:border-soda">
              <Search className="h-4 w-4 text-muted" />
              <Input
                className="h-full flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome ou email"
                value={query}
              />
            </span>
          </label>
          <div>
            <Label className="text-sm font-bold text-graphite">Role</Label>
            <Select onValueChange={(value) => setRole(value as RoleFilter)} value={role}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-bold text-graphite">Ativo/Inativo</Label>
            <Select onValueChange={(value) => setActive(value as ActiveFilter)} value={active}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button
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

      {error ? <p className="mt-4 rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-charcoal hover:bg-charcoal">
              {["Nome", "Email", "Role", "Setor", "Ativo", "Criado em", "Ações"].map((heading) => (
                <TableHead className="font-black text-white" key={heading}>
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-muted" colSpan={7}>Carregando usuários...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted" colSpan={7}>Nenhum usuário encontrado.</TableCell>
              </TableRow>
            ) : (
              filtered.map((profile) => (
                <TableRow className="hover:bg-ice" key={profile.id}>
                  <TableCell className="font-bold text-graphite">{profile.full_name}</TableCell>
                  <TableCell className="text-muted">{profile.email}</TableCell>
                  <TableCell>
                    <Badge className={roleClasses[profile.role]}>{roleLabels[profile.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted">{profile.sector_id || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={profile.active ? "success" : "destructive"}>
                      {profile.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted">{new Date(profile.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        aria-label={`Editar ${profile.full_name}`}
                        onClick={() => {
                          setEditing(profile);
                          setModalOpen(true);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`Desativar ${profile.full_name}`}
                        disabled={!profile.active}
                        onClick={() => void deactivateProfile(profile)}
                        size="icon"
                        variant="ghost"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
