"use client";

import { Edit3, Filter, Plus, Search, Trash2, XCircle } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ProductModal } from "@/components/ProductModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { supabase } from "@/lib/supabase";
import type { Product, ProductFormValues, Sector } from "@/lib/types";

type ActiveFilter = "all" | "active" | "inactive";
type ProductToggleField = "active" | "favorite";

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

const productGridTemplateColumns =
  "minmax(220px,2fr) minmax(120px,1fr) minmax(110px,0.9fr) minmax(80px,0.7fr) minmax(90px,0.7fr) minmax(80px,0.7fr) minmax(90px,0.7fr) minmax(84px,0.7fr)";

const productColumnLabels = ["Nome", "Categoria", "Setor", "Unidade", "Estoque", "Ativo", "Favorito", "Ações"];

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [category, setCategory] = useState("");
  const [sector, setSector] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(() => new Set());
  const pendingToggleKeysRef = useRef<Set<string>>(new Set());

  async function loadProducts() {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("products").select("*").order("name");

    if (loadError) {
      setError(loadError.message);
    } else {
      setProducts((data || []) as Product[]);
    }

    setLoading(false);
  }

  async function loadSectors() {
    const { data } = await supabase.from("sectors").select("*").order("name");
    setSectors((data || []) as Sector[]);
  }

  useEffect(() => {
    void loadProducts();
    void loadSectors();
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const sectorsById = useMemo(() => new Map(sectors.map((sector) => [sector.id, sector.name])), [sectors]);

  const filtered = products.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesSector = !sector || product.sector_id === sector;
    const matchesQuery = !query || product.name.toLowerCase().includes(query.toLowerCase());
    const matchesActive = active === "all" || product.active === (active === "active");

    return matchesCategory && matchesSector && matchesQuery && matchesActive;
  });

  async function saveProduct(values: ProductFormValues) {
    if (editing) {
      const { error: updateError } = await supabase.from("products").update(values).eq("id", editing.id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("products").insert(values);
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    setModalOpen(false);
    setEditing(null);
    await loadProducts();
  }

  async function deleteProduct(product: Product) {
    const { error: deleteError } = await supabase.from("products").delete().eq("id", product.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadProducts();
  }

  async function toggleProductField(product: Product, field: ProductToggleField) {
    const pendingKey = `${product.id}:${field}`;
    if (pendingToggleKeysRef.current.has(pendingKey)) return;

    const previousValue = product[field];
    const nextValue = !previousValue;

    setError("");
    pendingToggleKeysRef.current.add(pendingKey);
    setPendingToggles((current) => new Set(current).add(pendingKey));
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? { ...item, [field]: nextValue } : item))
    );

    const { error: updateError } = await supabase
      .from("products")
      .update({ [field]: nextValue })
      .eq("id", product.id);

    if (updateError) {
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, [field]: previousValue } : item))
      );
      setError(updateError.message);
    }

    pendingToggleKeysRef.current.delete(pendingKey);
    setPendingToggles((current) => {
      const next = new Set(current);
      next.delete(pendingKey);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Pesquisa</p>
          <h1 className="mt-2 text-3xl font-black text-white">Produtos</h1>
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
        <div className="grid gap-4 md:grid-cols-4">
          <FilterSelect label="Categoria" onChange={setCategory} options={categories} value={category} />
          <div>
            <Label className="text-sm font-bold text-muted">Setor</Label>
            <Select onValueChange={(next) => setSector(next === "__all__" ? "" : next)} value={sector || "__all__"}>
              <SelectTrigger className={fieldClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                <SelectItem className={selectItemClassName} value="__all__">Todos</SelectItem>
                {sectors.map((s) => (
                  <SelectItem className={selectItemClassName} key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-bold text-muted">Nome</Label>
            <Input
              className={fieldClassName}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar produto"
              value={query}
            />
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
        <div className="mt-4 flex flex-wrap gap-3">
          <Button className={secondaryButtonClassName} type="button" variant="outline">
            <Filter className="h-4 w-4" /> Filtro
          </Button>
          <Button className={primaryButtonClassName} type="button">
            <Search className="h-4 w-4" /> Pesquisar
          </Button>
          <Button
            className={secondaryButtonClassName}
            onClick={() => {
              setCategory("");
              setSector("");
              setQuery("");
              setActive("all");
            }}
            type="button"
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
          style={{ gridTemplateColumns: productGridTemplateColumns }}
        >
          {productColumnLabels.map((label) => (
            <div className={label === "Ações" ? "text-right" : undefined} key={label}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-muted">Carregando produtos...</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">Nenhum produto encontrado.</p>
        ) : (
          filtered.map((product) => (
            <ProductListRow
              activePending={pendingToggles.has(`${product.id}:active`)}
              favoritePending={pendingToggles.has(`${product.id}:favorite`)}
              key={product.id}
              onDelete={() => void deleteProduct(product)}
              onEdit={() => {
                setEditing(product);
                setModalOpen(true);
              }}
              onToggleActive={() => void toggleProductField(product, "active")}
              onToggleFavorite={() => void toggleProductField(product, "favorite")}
              product={product}
              sectorName={sectorsById.get(product.sector_id) || "-"}
            />
          ))
        )}
      </section>

      {modalOpen ? <ProductModal onClose={() => setModalOpen(false)} onSave={saveProduct} product={editing} /> : null}
    </main>
  );
}

function ProductListRow({
  activePending,
  favoritePending,
  onDelete,
  onEdit,
  onToggleActive,
  onToggleFavorite,
  product,
  sectorName
}: {
  activePending: boolean;
  favoritePending: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleFavorite: () => void;
  product: Product;
  sectorName: string;
}) {
  const lowStock = product.quantity < product.min_quantity;
  const avatarClassName = lowStock ? "bg-coral/15 text-coral" : "bg-soda/15 text-soda";

  return (
    <div
      className="border-b border-white/[0.06] px-5 py-4 transition hover:bg-white/[0.04] last:border-b-0 md:grid md:items-center md:gap-4"
      style={{ gridTemplateColumns: productGridTemplateColumns }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${avatarClassName}`}>
          {product.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{product.name}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Nome</p>
        </div>
      </div>

      <ProductTextCell label="Categoria" value={product.category} />
      <ProductTextCell label="Setor" value={sectorName} valueClassName="uppercase" />
      <ProductTextCell label="Unidade" value={product.unit} valueClassName="uppercase" />

      <ProductBadgeCell label="Estoque">
        <Badge className={badgeClassName} variant={lowStock ? "destructive" : "neutral"}>
          {product.quantity}
        </Badge>
      </ProductBadgeCell>
      <ProductControlCell label="Ativo">
        <ToggleSwitch
          aria-label={`${product.active ? "Desativar" : "Ativar"} produto ${product.name}`}
          checked={product.active}
          disabled={activePending}
          onClick={onToggleActive}
          tone="lime"
        />
      </ProductControlCell>
      <ProductControlCell label="Favorito">
        <ToggleSwitch
          aria-label={`${product.favorite ? "Remover" : "Marcar"} ${product.name} como favorito`}
          checked={product.favorite}
          disabled={favoritePending}
          onClick={onToggleFavorite}
          tone="lime"
        />
      </ProductControlCell>

      <div className="mt-4 flex items-center justify-between gap-3 md:mt-0 md:justify-end">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Ações</span>
        <div className="flex gap-2">
          <Button
            aria-label={`Editar ${product.name}`}
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-soda"
            onClick={onEdit}
            size="icon"
            variant="ghost"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            aria-label={`Excluir ${product.name}`}
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-coral/10 hover:text-coral"
            onClick={onDelete}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductTextCell({
  label,
  value,
  valueClassName
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      <span className={`truncate text-sm text-muted ${valueClassName || ""}`}>{value}</span>
    </div>
  );
}

function ProductBadgeCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      {children}
    </div>
  );
}

function ProductControlCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      {children}
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <div>
      <Label className="text-sm font-bold text-muted">{label}</Label>
      <Select onValueChange={(next) => onChange(next === "__all__" ? "" : next)} value={value || "__all__"}>
        <SelectTrigger className={fieldClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={selectContentClassName}>
          <SelectItem className={selectItemClassName} value="__all__">Todos</SelectItem>
          {options.map((option) => (
            <SelectItem className={selectItemClassName} key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
