export type RequestStatus = "pending" | "in_separation" | "replenished" | "cancelled";
export type Priority = "baixa" | "normal" | "alta" | "urgente";

export type Product = {
  id: string;
  company_id: string;
  sector_id: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
  favorite: boolean;
};

export type ReplenishmentRequest = {
  id: string;
  company_id: string;
  restaurant_unit_id: string;
  sector_id: string;
  created_by: string;
  priority: Priority | string;
  status: RequestStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
};

export type ReplenishmentRequestItem = {
  id: string;
  request_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  notes: string | null;
};

export type RequestStatusEvent = {
  id: string;
  request_id: string;
  status: RequestStatus;
  message: string | null;
  user_id: string | null;
  created_at: string;
};

export type ProductFormValues = Omit<Product, "id" | "company_id">;

export type UserRole = "admin" | "gestor" | "operador";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  sector_id: string | null;
  active: boolean;
  created_at: string;
  company_id: string | null;
  is_super_admin: boolean;
};

export type ProfileCreateValues = {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  sector_id: string | null;
  active: boolean;
};

export type ProfileUpdateValues = Pick<Profile, "full_name" | "role" | "sector_id" | "active">;

export type Company = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type CompanyCreateValues = {
  company_name: string;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
};
