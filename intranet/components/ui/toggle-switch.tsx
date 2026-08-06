import * as React from "react"

import { cn } from "@/lib/utils"

type ToggleTone = "lime" | "amber"

function ToggleSwitch({
  checked,
  className,
  label,
  tone = "lime",
  ...props
}: React.ComponentProps<"button"> & {
  checked: boolean
  label?: React.ReactNode
  tone?: ToggleTone
}) {
  const trackClassName = cn(
    "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
    checked && tone === "lime" && "bg-lime",
    checked && tone === "amber" && "bg-amber",
    !checked && "bg-white/15"
  )

  return (
    <button
      aria-checked={checked}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soda/25 disabled:cursor-not-allowed disabled:opacity-50",
        label ? "gap-3 border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-ice" : trackClassName,
        className
      )}
      role="switch"
      type="button"
      {...props}
    >
      <span className={label ? trackClassName : "contents"} aria-hidden="true">
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-graphite transition-transform duration-150",
            checked && "translate-x-4"
          )}
        />
      </span>
      {label ? <span>{label}</span> : null}
    </button>
  )
}

export { ToggleSwitch }
