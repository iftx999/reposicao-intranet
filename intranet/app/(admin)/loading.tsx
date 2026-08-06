import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="grid min-h-[320px] place-items-center rounded-[28px] border border-white/[0.08] bg-charcoal p-8 shadow-panel">
        <div className="flex flex-col items-center gap-4 text-center">
          <Spinner size="lg" />
          <p className="text-sm font-semibold text-muted">Carregando tela...</p>
        </div>
      </section>
    </main>
  );
}
