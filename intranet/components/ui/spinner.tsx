import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

type SpinnerProps = {
  size?: SpinnerSize;
  className?: string;
};

const sizeClassNames: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10"
};

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-2 border-lime border-r-lime/20 border-t-lime/20 border-b-lime/20 motion-safe:animate-spin motion-reduce:animate-none",
        sizeClassNames[size],
        className
      )}
      role="status"
    >
      <span className="sr-only">Carregando</span>
    </span>
  );
}

export type { SpinnerProps, SpinnerSize };
