export type RequestStatus = "pending" | "in_separation" | "replenished" | "cancelled";
export type Priority = "baixa" | "normal" | "alta" | "urgente";

export type Product = {
  id: string;
  sector_id: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
  favorite: boolean;
};

export type ReplenishmentRequest = {
  id: string;
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

export type ProductFormValues = Omit<Product, "id">;
