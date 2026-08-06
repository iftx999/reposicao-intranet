"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowDown, ArrowUp, ClipboardCheck, History, X, XCircle } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Product, Sector, StockMovement, StockMovementType } from "@/lib/types";

type StockStatus = "all" | "low" | "near" | "ok";
type MovementModalState = { type: StockMovementType } | null;
type MovementWithProfile = StockMovement & { profiles?: { full_name: string | null } | null };
type SaveMovementResult = { error: string } | { product: Product };

const fieldClassName =
  "mt-2 h-auto w-full rounded-full border border-white/10 bg-graphite px-4 py-2.5 text-sm text-ice outline-none placeholder:text-subtle transition focus-visible:border-soda/60 focus-visible:ring-2 focus-visible:ring-soda/25";

const selectContentClassName =
  "rounded-[28px] border border-white/[0.08] bg-charcoal p-2 text-ice shadow-dialog ring-0";

const selectItemClassName = "rounded-full px-3 py-2 text-sm text-ice focus:bg-white/10 focus:text-white";

const primaryButtonClassName =
  "h-auto rounded-full bg-lime px-5 py-3 text-sm font-semibold text-graphite shadow-[0_16px_38px_rgba(182,232,95,0.2)] transition hover:brightness-95 active:scale-[0.98]";

const secondaryButtonClassName =
  "h-auto rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-ice transition hover:bg-white/10";

const actionButtonClassName =
  "grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-soda";

const stockGridTemplateColumns =
  "minmax(220px,2fr) minmax(120px,1fr) minmax(110px,0.9fr) minmax(88px,0.7fr) minmax(88px,0.7fr) minmax(120px,0.9fr) minmax(72px,0.5fr)";

const movementGridTemplateColumns =
  "minmax(130px,1fr) minmax(90px,0.7fr) minmax(80px,0.6fr) minmax(90px,0.7fr) minmax(110px,0.8fr) minmax(140px,1fr) minmax(120px,0.9fr)";

export default function EstoquePage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [sector, setSector] = useState("");
  const [status, setStatus] = useState<StockStatus>("all");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<MovementWithProfile[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [movementModal, setMovementModal] = useState<MovementModalState>(null);

  const canWriteStock = Boolean(profile?.is_super_admin || profile?.role === "admin" || profile?.role === "gestor");
  const productSearchId = useId();

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

  async function loadMovements(product: Product) {
    setSelectedProduct(product);
    setHistoryLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("stock_movements")
      .select("*, profiles(full_name)")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setMovements([]);
    } else {
      setMovements((data || []) as MovementWithProfile[]);
    }

    setHistoryLoading(false);
  }

  useEffect(() => {
    void loadProducts();
    void loadSectors();
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const sectorsById = useMemo(() => new Map(sectors.map((item) => [item.id, item.name])), [sectors]);

  const filtered = products.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesSector = !sector || product.sector_id === sector;
    const matchesQuery = !query || product.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || getStockStatus(product) === status;

    return matchesCategory && matchesSector && matchesQuery && matchesStatus;
  });

  async function reloadProduct(productId: string) {
    const { data, error: loadError } = await supabase.from("products").select("*").eq("id", productId).single();

    if (loadError) {
      setError(loadError.message);
      return null;
    }

    const updatedProduct = data as Product;
    setProducts((current) => current.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)));
    setSelectedProduct((current) => (current?.id === updatedProduct.id ? updatedProduct : current));
    return updatedProduct;
  }

  async function saveMovement(
    product: Product,
    movementType: StockMovementType,
    amount: number,
    reason: string
  ): Promise<SaveMovementResult> {
    const delta = getMovementDelta(product, movementType, amount);

    if (delta === 0) {
      return { error: "O movimento precisa alterar o saldo." };
    }

    const { error: insertError } = await supabase.from("stock_movements").insert({
      company_id: product.company_id,
      product_id: product.id,
      movement_type: movementType,
      delta,
      balance_after: 0,
      source: "manual",
      reason,
      created_by: profile?.id || null
    });

    if (insertError) {
      return { error: insertError.message };
    }

    setMovementModal(null);
    const updatedProduct = await reloadProduct(product.id);
    await loadMovements(updatedProduct || product);
    return { product: updatedProduct || product };
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Movimentação</p>
          <h1 className="mt-2 text-3xl font-black text-white">Estoque</h1>
        </div>
        {canWriteStock ? (
          <div className="flex flex-wrap gap-2">
            <Button className={primaryButtonClassName} onClick={() => setMovementModal({ type: "entrada" })} type="button">
              <ArrowUp className="h-4 w-4" /> Entrada
            </Button>
            <Button className={secondaryButtonClassName} onClick={() => setMovementModal({ type: "saida" })} type="button" variant="outline">
              <ArrowDown className="h-4 w-4" /> Saída
            </Button>
            <Button className={secondaryButtonClassName} onClick={() => setMovementModal({ type: "ajuste" })} type="button" variant="outline">
              <ClipboardCheck className="h-4 w-4" /> Ajuste
            </Button>
          </div>
        ) : null}
      </div>

      <section className="mt-6 rounded-[28px] border border-white/[0.08] bg-charcoal p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-4">
          <FilterSelect label="Setor" onChange={setSector} options={sectors.map((item) => ({ label: item.name, value: item.id }))} value={sector} />
          <FilterSelect label="Categoria" onChange={setCategory} options={categories.map((item) => ({ label: item, value: item }))} value={category} />
          <StockStatusSelect onChange={setStatus} value={status} />
          <div>
            <Label className="text-sm font-bold text-muted" htmlFor={productSearchId}>Produto</Label>
            <Input
              className={fieldClassName}
              id={productSearchId}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar produto"
              value={query}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            className={secondaryButtonClassName}
            onClick={() => {
              setCategory("");
              setSector("");
              setStatus("all");
              setQuery("");
            }}
            type="button"
            variant="outline"
          >
            <XCircle className="h-4 w-4" /> Limpar filtros
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
          style={{ gridTemplateColumns: stockGridTemplateColumns }}
        >
          {["Nome", "Setor", "Categoria", "Atual", "Mínimo", "Situação", ""].map((label) => (
            <div className={label ? undefined : "text-right"} key={label}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-muted">Carregando estoque...</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">Nenhum produto encontrado.</p>
        ) : (
          filtered.map((product) => (
            <StockProductRow
              key={product.id}
              onOpenHistory={() => void loadMovements(product)}
              product={product}
              sectorName={sectorsById.get(product.sector_id) || "-"}
            />
          ))
        )}
      </section>

      {selectedProduct ? (
        <HistoryPanel
          loading={historyLoading}
          movements={movements}
          onClose={() => {
            setSelectedProduct(null);
            setMovements([]);
          }}
          product={selectedProduct}
        />
      ) : null}

      {movementModal ? (
        <MovementModal
          movementType={movementModal.type}
          onClose={() => setMovementModal(null)}
          onSave={saveMovement}
          products={products}
          sectorsById={sectorsById}
        />
      ) : null}
    </main>
  );
}

function StockProductRow({
  onOpenHistory,
  product,
  sectorName
}: {
  onOpenHistory: () => void;
  product: Product;
  sectorName: string;
}) {
  const status = getStockStatus(product);
  const tone = stockStatusTone[status];

  return (
    <button
      aria-label={`Ver histórico de movimentos de ${product.name}`}
      className="w-full border-b border-white/[0.06] px-5 py-4 text-left transition hover:bg-white/[0.04] last:border-b-0 md:grid md:items-center md:gap-4"
      onClick={onOpenHistory}
      style={{ gridTemplateColumns: stockGridTemplateColumns }}
      type="button"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${tone.avatar}`}>
          {product.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{product.name}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Nome</p>
        </div>
      </div>

      <TextCell label="Setor" value={sectorName} />
      <TextCell label="Categoria" value={product.category} />
      <TextCell label="Atual" value={formatQuantity(product.quantity)} valueClassName={tone.text} />
      <TextCell label="Mínimo" value={formatQuantity(product.min_quantity)} />
      <BadgeCell label="Situação">
        <Badge className={`h-auto px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`} variant="neutral">
          {stockStatusLabel[status]}
        </Badge>
      </BadgeCell>
      <div className="mt-4 flex items-center justify-between gap-3 md:mt-0 md:justify-end">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">Histórico</span>
        <span className={actionButtonClassName}>
          <History className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function HistoryPanel({
  loading,
  movements,
  onClose,
  product
}: {
  loading: boolean;
  movements: MovementWithProfile[];
  onClose: () => void;
  product: Product;
}) {
  return (
    <DialogPrimitive.Root onOpenChange={(open) => !open && onClose()} open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content className="fixed right-4 top-4 z-50 flex h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-5xl flex-col rounded-[28px] border border-white/[0.08] bg-charcoal p-6 text-ice shadow-panel outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-black text-white">{product.name}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                Saldo atual: {formatQuantity(product.quantity)}
              </DialogPrimitive.Description>
            </div>
            <button aria-label="Fechar" className={actionButtonClassName} onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 overflow-auto">
            <div
              className="hidden border-b border-white/[0.06] py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted md:grid md:items-center md:gap-4"
              style={{ gridTemplateColumns: movementGridTemplateColumns }}
            >
              {["Data", "Tipo", "Delta", "Saldo", "Origem", "Motivo", "Quem fez"].map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            {loading ? (
              <p className="py-4 text-sm text-muted">Carregando histórico...</p>
            ) : movements.length === 0 ? (
              <p className="py-4 text-sm text-muted">Nenhum movimento encontrado.</p>
            ) : (
              movements.map((movement) => (
                <div
                  className="border-b border-white/[0.06] py-4 last:border-b-0 md:grid md:items-center md:gap-4"
                  key={movement.id}
                  style={{ gridTemplateColumns: movementGridTemplateColumns }}
                >
                  <TextCell label="Data" value={formatDate(movement.created_at)} />
                  <TextCell label="Tipo" value={movement.movement_type} valueClassName="capitalize" />
                  <TextCell
                    label="Delta"
                    value={formatSignedQuantity(movement.delta)}
                    valueClassName={movement.delta < 0 ? "text-coral" : "text-lime"}
                  />
                  <TextCell label="Saldo" value={formatQuantity(movement.balance_after)} />
                  <TextCell label="Origem" value={sourceLabel[movement.source]} />
                  <TextCell label="Motivo" value={movement.reason || "-"} />
                  <TextCell label="Quem fez" value={movement.profiles?.full_name || "-"} />
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function MovementModal({
  movementType,
  onClose,
  onSave,
  products,
  sectorsById
}: {
  movementType: StockMovementType;
  onClose: () => void;
  onSave: (
    product: Product,
    movementType: StockMovementType,
    amount: number,
    reason: string
  ) => Promise<SaveMovementResult>;
  products: Product[];
  sectorsById: Map<string, string>;
}) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [modalError, setModalError] = useState("");
  const productLabelId = useId();
  const amountId = useId();
  const reasonId = useId();

  const selectedProduct = products.find((product) => product.id === productId) || null;
  const title = movementTitle[movementType];
  const amountLabel = movementType === "ajuste" ? "Nova quantidade contada" : "Quantidade";
  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount >= 0 && (movementType === "ajuste" || numericAmount > 0);
  const delta = selectedProduct && validAmount ? getMovementDelta(selectedProduct, movementType, numericAmount) : null;
  const resultingBalance = selectedProduct && delta !== null ? selectedProduct.quantity + delta : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;

    if (!validAmount) {
      setModalError(
        movementType === "ajuste" ? "Informe uma quantidade contada válida." : "Informe uma quantidade maior que zero."
      );
      setConfirming(false);
      return;
    }

    if (delta === 0) {
      setModalError("O movimento precisa alterar o saldo.");
      setConfirming(false);
      return;
    }

    setModalError("");
    setConfirming(true);
  }

  async function confirmSave() {
    if (!selectedProduct || !validAmount) return;

    setModalError("");
    setSaving(true);
    const result = await onSave(selectedProduct, movementType, numericAmount, reason.trim());
    if ("error" in result) {
      setModalError(result.error);
      setSaving(false);
      return;
    }
  }

  function updateProductId(nextProductId: string) {
    setProductId(nextProductId);
    setConfirming(false);
    setModalError("");
  }

  function updateAmount(nextAmount: string) {
    setAmount(nextAmount);
    setConfirming(false);
    setModalError("");
  }

  function updateReason(nextReason: string) {
    setReason(nextReason);
    setConfirming(false);
    setModalError("");
  }

  return (
    <DialogPrimitive.Root onOpenChange={(open) => !open && onClose()} open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/[0.08] bg-charcoal p-6 text-ice shadow-panel outline-none sm:max-w-xl">
          <form onSubmit={submit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogPrimitive.Title className="text-lg font-black text-white">{title}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                  {movementType === "saida" ? "Informe a quantidade consumida como número positivo." : "Registre a movimentação do produto."}
                </DialogPrimitive.Description>
              </div>
              <button aria-label="Fechar" className={actionButtonClassName} onClick={onClose} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            {confirming && selectedProduct && delta !== null && resultingBalance !== null ? (
              <div className="mt-6 rounded-[28px] border border-amber/35 bg-amber/10 p-4">
                <p className="text-sm font-black text-amber">Confirmar lançamento imutável</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Este lançamento será gravado no histórico e não poderá ser desfeito. Se houver erro, a correção
                  deverá ser feita com um novo ajuste compensatório.
                </p>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-semibold text-muted">Produto</dt>
                    <dd className="text-right font-bold text-white">{selectedProduct.name}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-semibold text-muted">Saldo atual</dt>
                    <dd className="font-bold text-white">{formatQuantity(selectedProduct.quantity)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-semibold text-muted">Movimento</dt>
                    <dd className="text-right font-bold text-white">
                      {movementLabel[movementType]} de {formatQuantity(numericAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-semibold text-muted">Saldo resultante</dt>
                    <dd className={delta < 0 ? "font-black text-coral" : "font-black text-lime"}>
                      {formatQuantity(resultingBalance)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-muted">Motivo</dt>
                    <dd className="mt-1 rounded-[28px] border border-white/10 bg-graphite px-4 py-3 font-medium text-white">
                      {reason.trim() || "Sem motivo informado"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                <div>
                  <Label className="text-sm font-bold text-muted" id={productLabelId}>Produto</Label>
                  <Select onValueChange={updateProductId} value={productId}>
                    <SelectTrigger aria-labelledby={productLabelId} className={fieldClassName}>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {products.map((product) => (
                        <SelectItem className={selectItemClassName} key={product.id} value={product.id}>
                          {product.name} - {sectorsById.get(product.sector_id) || "Sem setor"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-bold text-muted" htmlFor={amountId}>{amountLabel}</Label>
                  <Input
                    className={fieldClassName}
                    id={amountId}
                    min={0}
                    onChange={(event) => updateAmount(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={amount}
                  />
                </div>

                <div>
                  <Label className="text-sm font-bold text-muted" htmlFor={reasonId}>Motivo</Label>
                  <Input
                    className={fieldClassName}
                    id={reasonId}
                    onChange={(event) => updateReason(event.target.value)}
                    placeholder="Ex.: consumo do dia, quebra, contagem física"
                    value={reason}
                  />
                </div>
              </div>
            )}

            {modalError ? (
              <p
                aria-live="polite"
                className="mt-5 rounded-[28px] border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral"
                role="status"
              >
                {modalError}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                className={secondaryButtonClassName}
                onClick={() => {
                  if (confirming) {
                    setConfirming(false);
                    setModalError("");
                    return;
                  }
                  onClose();
                }}
                type="button"
                variant="outline"
              >
                {confirming ? "Voltar" : "Cancelar"}
              </Button>
              <Button
                className={primaryButtonClassName}
                disabled={saving || !productId}
                onClick={confirming ? confirmSave : undefined}
                type={confirming ? "button" : "submit"}
              >
                {saving ? "Salvando..." : confirming ? "Confirmar lançamento" : "Revisar movimento"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const labelId = useId();

  return (
    <div>
      <Label className="text-sm font-bold text-muted" id={labelId}>{label}</Label>
      <Select onValueChange={(next) => onChange(next === "__all__" ? "" : next)} value={value || "__all__"}>
        <SelectTrigger aria-labelledby={labelId} className={fieldClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={selectContentClassName}>
          <SelectItem className={selectItemClassName} value="__all__">Todos</SelectItem>
          {options.map((option) => (
            <SelectItem className={selectItemClassName} key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StockStatusSelect({ onChange, value }: { onChange: (value: StockStatus) => void; value: StockStatus }) {
  const labelId = useId();

  return (
    <div>
      <Label className="text-sm font-bold text-muted" id={labelId}>Situação</Label>
      <Select onValueChange={(next) => onChange(next as StockStatus)} value={value}>
        <SelectTrigger aria-labelledby={labelId} className={fieldClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={selectContentClassName}>
          <SelectItem className={selectItemClassName} value="all">Todos</SelectItem>
          <SelectItem className={selectItemClassName} value="low">Abaixo do mínimo</SelectItem>
          <SelectItem className={selectItemClassName} value="near">Próximo do mínimo</SelectItem>
          <SelectItem className={selectItemClassName} value="ok">Ok</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function TextCell({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      <span className={`truncate text-sm text-muted ${valueClassName || ""}`}>{value}</span>
    </div>
  );
}

function BadgeCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 md:mt-0 md:block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{label}</span>
      {children}
    </div>
  );
}

function getStockStatus(product: Product): Exclude<StockStatus, "all"> {
  if (product.quantity < product.min_quantity) return "low";
  if (product.min_quantity > 0 && product.quantity <= product.min_quantity * 1.2) return "near";
  return "ok";
}

function getMovementDelta(product: Product, movementType: StockMovementType, amount: number) {
  if (movementType === "saida") return -amount;
  if (movementType === "ajuste") return amount - product.quantity;
  return amount;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

function formatSignedQuantity(value: number) {
  const formatted = formatQuantity(Math.abs(value));
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

const stockStatusLabel: Record<Exclude<StockStatus, "all">, string> = {
  low: "Abaixo",
  near: "Próximo",
  ok: "Ok"
};

const stockStatusTone: Record<Exclude<StockStatus, "all">, { avatar: string; badge: string; text: string }> = {
  low: {
    avatar: "bg-coral/15 text-coral",
    badge: "bg-coral/15 text-coral",
    text: "text-coral"
  },
  near: {
    avatar: "bg-amber/15 text-amber",
    badge: "bg-amber/15 text-amber",
    text: "text-amber"
  },
  ok: {
    avatar: "bg-lime/15 text-lime",
    badge: "bg-lime/15 text-lime",
    text: "text-lime"
  }
};

const sourceLabel = {
  manual: "Manual",
  replenishment: "Reposição",
  inventory: "Inventário"
};

const movementTitle: Record<StockMovementType, string> = {
  entrada: "Lançar entrada",
  saida: "Lançar saída",
  ajuste: "Lançar ajuste"
};

const movementLabel: Record<StockMovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste"
};
