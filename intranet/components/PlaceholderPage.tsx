export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="border-y border-white/10 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">BAR Intranet</p>
        <h1 className="mt-3 text-3xl font-black text-white">{title}</h1>
        <p className="mt-2 text-lg text-muted">Em breve</p>
      </div>
    </section>
  );
}
