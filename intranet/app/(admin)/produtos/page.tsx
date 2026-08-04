"use client";

import { Edit3, Filter, Plus, Search, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductModal } from "@/components/ProductModal";
import { supabase } from "@/lib/supabase";
import type { Product, ProductFormValues } from "@/lib/types";

type ActiveFilter = "all" | "active" | "inactive";

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  useEffect(() => {
    void loadProducts();
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const sectors = useMemo(() => Array.from(new Set(products.map((product) => product.sector_id))).sort(), [products]);

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
        <div className="grid gap-4 md:grid-cols-4">
          <FilterSelect label="Categoria" onChange={setCategory} options={categories} value={category} />
          <FilterSelect label="Setor" onChange={setSector} options={sectors} value={sector} />
          <label className="block">
            <span className="text-sm font-bold text-graphite">Nome</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar produto"
              value={query}
            />
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
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="focus-ring inline-flex items-center gap-2 rounded-lg border border-charcoal/10 px-4 py-2 text-sm font-black text-graphite" type="button">
            <Filter className="h-4 w-4" /> Filtro
          </button>
          <button className="focus-ring inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-sm font-black text-white" type="button">
            <Search className="h-4 w-4" /> Pesquisar
          </button>
          <button
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-charcoal/10 px-4 py-2 text-sm font-black text-muted"
            onClick={() => {
              setCategory("");
              setSector("");
              setQuery("");
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
        <table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead className="bg-charcoal text-white">
            <tr>
              {["Nome", "Categoria", "Setor", "Unidade", "Ativo", "Favorito", "Ações"].map((heading) => (
                <th className="px-4 py-4 font-black" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-muted" colSpan={7}>Carregando produtos...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-8 text-muted" colSpan={7}>Nenhum produto encontrado.</td></tr>
            ) : (
              filtered.map((product) => (
                <tr className="border-t border-charcoal/10 hover:bg-ice" key={product.id}>
                  <td className="px-4 py-4 font-bold text-graphite">{product.name}</td>
                  <td className="px-4 py-4 text-muted">{product.category}</td>
                  <td className="px-4 py-4 text-muted">{product.sector_id}</td>
                  <td className="px-4 py-4 text-muted">{product.unit}</td>
                  <td className="px-4 py-4">{product.active ? "Sim" : "Não"}</td>
                  <td className="px-4 py-4">{product.favorite ? "Sim" : "Não"}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        aria-label={`Editar ${product.name}`}
                        className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-soda hover:bg-soda/10"
                        onClick={() => {
                          setEditing(product);
                          setModalOpen(true);
                        }}
                        type="button"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Excluir ${product.name}`}
                        className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-coral hover:bg-coral/10"
                        onClick={() => void deleteProduct(product)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    <label className="block">
      <span className="text-sm font-bold text-graphite">{label}</span>
      <select
        className="mt-2 h-11 w-full rounded-lg border border-charcoal/10 px-3 outline-none focus:border-soda"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
