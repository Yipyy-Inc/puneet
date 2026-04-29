export type OpsSupplier = {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  orderingPortalUrl?: string;
  orderingPortalUsername?: string;
  orderingPortalPassword?: string;
  notes?: string;
  paymentTerms?: string;
  status?: "active" | "inactive";
  categories: string[];
};

export type OpsInventoryItem = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  supplierId: string;
  facilityId: number;
  dailyUsage: number;
  reorderPoint: number;
  lastRestocked: string;
  costPerUnit: number;
  notes?: string;
};

export type StockAdjustType = "add" | "remove";

export const ADD_REASONS = [
  { value: "purchase", label: "Purchase / Restocking" },
  { value: "transfer_in", label: "Transfer In" },
  { value: "found", label: "Found Stock" },
  { value: "return", label: "Return from Use" },
] as const;

export const REMOVE_REASONS = [
  { value: "damage", label: "Damage" },
  { value: "spill", label: "Spill / Waste" },
  { value: "expired", label: "Expired" },
  { value: "used", label: "Consumed / Used" },
  { value: "theft", label: "Theft / Loss" },
  { value: "other", label: "Other" },
] as const;

export const OPS_CATEGORIES = [
  "Waste Management",
  "Cleaning Supplies",
  "Laundry",
  "Safety & PPE",
  "Office Supplies",
  "Maintenance",
  "Kitchen / Break Room",
  "Pet Care Supplies",
  "Other",
] as const;

export const OPS_UNITS = [
  "pieces",
  "rolls",
  "bags",
  "bottles",
  "boxes",
  "packs",
  "liters",
  "kg",
  "sheets",
  "sets",
  "pairs",
] as const;
