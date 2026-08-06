import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

// Consumers define width, height, and radius through className.
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-3 w-full rounded-full bg-white/[0.07] animate-pulse", className)}
    />
  );
}

export type { SkeletonProps };
