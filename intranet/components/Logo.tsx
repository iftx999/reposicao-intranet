export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-lime text-sm font-black text-graphite shadow-sm">
        BAR
      </div>
      <div>
        <p className={`text-sm font-black leading-tight ${dark ? "text-white" : "text-graphite"}`}>Reposição</p>
        <p className={`text-xs leading-tight ${dark ? "text-ice/70" : "text-muted"}`}>Intranet ADM</p>
      </div>
    </div>
  );
}
