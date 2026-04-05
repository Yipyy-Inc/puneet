// ── Configurable retail settings per facility ────────────────────────────────

export interface RetailCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  status: "active" | "draft";
  sortOrder: number;
}

export interface RetailSupplier {
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
}

export interface RetailBrand {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
}

export interface RetailProductTag {
  id: string;
  name: string;
  color: string;
}

export interface RetailUnit {
  id: string;
  name: string;
}

export interface RetailConfig {
  categories: RetailCategory[];
  suppliers: RetailSupplier[];
  brands: RetailBrand[];
  productTags: RetailProductTag[];
  unitsOfMeasure: RetailUnit[];
}

// ── Default data ─────────────────────────────────────────────────────────────

export const retailConfig: RetailConfig = {
  categories: [
    {
      id: "cat-1",
      name: "Food & Treats",
      description: "Pet food, treats, and chews",
      status: "active",
      sortOrder: 0,
    },
    {
      id: "cat-2",
      name: "Toys",
      description: "Interactive and chew toys",
      status: "active",
      sortOrder: 1,
    },
    {
      id: "cat-3",
      name: "Accessories",
      description: "Collars, leashes, harnesses",
      status: "active",
      sortOrder: 2,
    },
    {
      id: "cat-4",
      name: "Grooming",
      description: "Shampoos, brushes, grooming tools",
      status: "active",
      sortOrder: 3,
    },
    {
      id: "cat-5",
      name: "Health & Wellness",
      description: "Supplements, flea & tick, dental",
      status: "active",
      sortOrder: 4,
    },
    {
      id: "cat-6",
      name: "Beds & Furniture",
      description: "Beds, crates, furniture",
      status: "active",
      sortOrder: 5,
    },
    {
      id: "cat-7",
      name: "Clothing",
      description: "Sweaters, boots, raincoats",
      status: "active",
      sortOrder: 6,
    },
    {
      id: "cat-8",
      name: "Training",
      description: "Clickers, mats, agility gear",
      status: "active",
      sortOrder: 7,
    },
  ],
  suppliers: [
    {
      id: "sup-1",
      name: "PawNutrition Inc.",
      contactPerson: "Lisa Chen",
      email: "orders@pawnutrition.com",
      phone: "(555) 200-1000",
      website: "https://pawnutrition.com",
      orderingPortalUrl: "https://portal.pawnutrition.com",
      orderingPortalUsername: "pawcare_facility",
      orderingPortalPassword: "pn2024secure",
      paymentTerms: "Net 30",
      status: "active" as const,
    },
    {
      id: "sup-2",
      name: "PetToys Wholesale",
      contactPerson: "Mark Davis",
      email: "sales@pettoyswholesale.com",
      phone: "(555) 200-2000",
      website: "https://pettoyswholesale.com",
      paymentTerms: "Net 15",
      status: "active" as const,
    },
    {
      id: "sup-3",
      name: "Happy Paws Distributors",
      contactPerson: "Sarah Kim",
      email: "info@happypawsdist.com",
      phone: "(555) 200-3000",
      address: "456 Distribution Way, Los Angeles, CA 90012",
      website: "https://happypawsdist.com",
      orderingPortalUrl: "https://order.happypawsdist.com",
      orderingPortalUsername: "pawcare2024",
      orderingPortalPassword: "hpd_access!",
      paymentTerms: "COD",
      status: "active" as const,
    },
    {
      id: "sup-4",
      name: "GreenPet Supply Co.",
      contactPerson: "Tom Wright",
      email: "orders@greenpet.com",
      phone: "(555) 200-4000",
      website: "https://greenpetsupply.com",
      paymentTerms: "Net 30",
      notes: "Eco-friendly products only. Minimum order $200.",
      status: "active" as const,
    },
  ],
  brands: [
    { id: "br-1", name: "Royal Canin" },
    { id: "br-2", name: "Kong" },
    { id: "br-3", name: "PawNutrition" },
    { id: "br-4", name: "Greenies" },
    { id: "br-5", name: "SmartPup" },
    { id: "br-6", name: "Ruffwear" },
  ],
  productTags: [
    { id: "tag-1", name: "Bestseller", color: "emerald" },
    { id: "tag-2", name: "New Arrival", color: "blue" },
    { id: "tag-3", name: "Clearance", color: "red" },
    { id: "tag-4", name: "Organic", color: "emerald" },
    { id: "tag-5", name: "Prescription", color: "purple" },
    { id: "tag-6", name: "Sale", color: "amber" },
  ],
  unitsOfMeasure: [
    { id: "unit-1", name: "Each" },
    { id: "unit-2", name: "Pack" },
    { id: "unit-3", name: "Box" },
    { id: "unit-4", name: "Bag" },
    { id: "unit-5", name: "Bottle" },
    { id: "unit-6", name: "Case (12)" },
    { id: "unit-7", name: "lb" },
    { id: "unit-8", name: "kg" },
    { id: "unit-9", name: "oz" },
    { id: "unit-10", name: "Pair" },
  ],
};
