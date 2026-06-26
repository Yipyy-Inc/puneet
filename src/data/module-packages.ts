// Module bundle packages — data layer (moved out of the ModulesManagement
// component so the admin UI reads packages from data, not hardcoded JSX).

export interface ModulePackage {
  id: string;
  name: string;
  description: string;
  modules: string[];
  discount: number;
  pricing: {
    monthly: number;
    quarterly: number;
    yearly: number;
    currency: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const modulePackages: ModulePackage[] = [
  {
    id: "pkg-001",
    name: "Starter Bundle",
    description: "Essential modules for small facilities",
    modules: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    discount: 10,
    pricing: {
      monthly: 39,
      quarterly: 105,
      yearly: 399,
      currency: "USD",
    },
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "pkg-002",
    name: "Professional Suite",
    description: "Complete solution for growing businesses",
    modules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
    ],
    discount: 15,
    pricing: {
      monthly: 99,
      quarterly: 269,
      yearly: 999,
      currency: "USD",
    },
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "pkg-003",
    name: "Grooming Pro",
    description: "Specialized package for grooming facilities",
    modules: [
      "module-booking",
      "module-customer-management",
      "module-grooming-management",
      "module-inventory-management",
    ],
    discount: 12,
    pricing: {
      monthly: 79,
      quarterly: 215,
      yearly: 799,
      currency: "USD",
    },
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
];
