"use client";

import { Edit3, Filter, Plus, Search, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductModal } from "@/components/ProductModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import type { Product, ProductFormValues, Sector } from "@/lib/types";

type ActiveFilter = "all" | "active" | "inactive";

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

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Pesquisa</p>
          <h1 className="mt-2 text-3xl font-black text-graphite">Produtos</h1>
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
        <div className="grid gap-4 md:grid-cols-4">
          <FilterSelect label="Categoria" onChange={setCategory} options={categories} value={category} />
          <div>
            <Label className="text-sm font-bold text-graphite">Setor</Label>
            <Select onValueChange={(next) => setSector(next === "__all__" ? "" : next)} value={sector || "__all__"}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-bold text-graphite">Nome</Label>
            <Input
              className="mt-2"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar produto"
              value={query}
            />
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
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="outline">
            <Filter className="h-4 w-4" /> Filtro
          </Button>
          <Button type="button">
            <Search className="h-4 w-4" /> Pesquisar
          </Button>
          <Button
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

      {error ? <p className="mt-4 rounded-lg bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-charcoal hover:bg-charcoal">
              {["Nome", "Categoria", "Setor", "Unidade", "Estoque", "Ativo", "Favorito", "Ações"].map((heading) => (
                <TableHead className="font-black text-white" key={heading}>{heading}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-muted" colSpan={8}>Carregando produtos...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell className="text-muted" colSpan={8}>Nenhum produto encontrado.</TableCell></TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow className="hover:bg-ice" key={product.id}>
                  <TableCell className="font-bold text-graphite">{product.name}</TableCell>
                  <TableCell className="text-muted">{product.category}</TableCell>
                  <TableCell className="text-muted">{sectorsById.get(product.sector_id) || "-"}</TableCell>
                  <TableCell className="text-muted">{product.unit}</TableCell>
                  <TableCell>
                    <Badge variant={product.quantity < product.min_quantity ? "destructive" : "secondary"}>
                      {product.quantity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.active ? "success" : "secondary"}>{product.active ? "Sim" : "Não"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.favorite ? "success" : "secondary"}>{product.favorite ? "Sim" : "Não"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        aria-label={`Editar ${product.name}`}
                        onClick={() => {
                          setEditing(product);
                          setModalOpen(true);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={`Excluir ${product.name}`}
                        onClick={() => void deleteProduct(product)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {modalOpen ? <ProductModal onClose={() => setModalOpen(false)} onSave={saveProduct} product={editing} /> : null}
    </main>
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
      <Label className="text-sm font-bold text-graphite">{label}</Label>
      <Select onValueChange={(next) => onChange(next === "__all__" ? "" : next)} value={value || "__all__"}>
        <SelectTrigger className="mt-2 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
