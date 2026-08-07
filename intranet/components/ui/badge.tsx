import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:!size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        success: "bg-lime/15 text-lime ring-1 ring-inset ring-lime/35 hover:bg-lime/20",
        warning: "bg-amber/15 text-amber ring-1 ring-inset ring-amber/35 hover:bg-amber/20",
        neutral: "bg-white/[0.06] text-badge-neutral hover:bg-white/10",
        destructive:
          "bg-coral/15 text-coral ring-1 ring-inset ring-coral/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 hover:bg-coral/20",
        outline:
          "border-border text-foreground hover:bg-white/10 hover:text-muted-foreground",
        ghost:
          "hover:bg-white/10 hover:text-muted-foreground dark:hover:bg-white/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
