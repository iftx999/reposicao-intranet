import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="motion-safe:animate-page-enter motion-reduce:translate-y-0 motion-reduce:transform-none motion-reduce:animate-none">
      {children}
    </div>
  );
}
