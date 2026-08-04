import type { UserRole } from "@/lib/types";

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  gestor: "Gestor",
  operador: "Operador"
};

export const roleClasses: Record<UserRole, string> = {
  admin: "bg-graphite text-white ring-graphite",
  gestor: "bg-soda/15 text-graphite ring-soda/40",
  operador: "bg-muted/15 text-graphite ring-muted/30"
};
