// Module Management Data Models

export interface Module {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: "core" | "advanced" | "premium" | "addon";
  icon: string; // Icon name from lucide-react
  features: string[];
  pricing: {
    monthly: number; // Base price per module
    quarterly: number;
    yearly: number;
    currency: string;
  };
  requiredTier: "beginner" | "pro" | "enterprise" | "all"; // Minimum tier required
  isStandalone: boolean; // Can be purchased separately
  dependencies: string[]; // Module IDs that must be enabled first
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const modules: Module[] = [
  {
    id: "module-booking",
    name: "Booking & Reservation",
    slug: "booking-reservation",
    description: "Complete booking and reservation management system",
    category: "core",
    icon: "Calendar",
    features: [
      "Online booking calendar",
      "Recurring reservations",
      "Booking confirmations",
      "Waitlist management",
      "Automated reminders",
      "Cancellation handling",
      "Service duration management",
    ],
    pricing: {
      monthly: 0,
      quarterly: 0,
      yearly: 0,
      currency: "USD",
    },
    requiredTier: "all",
    isStandalone: false,
    dependencies: [],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "module-staff-scheduling",
    name: "Staff Scheduling",
    slug: "staff-scheduling",
    description: "Comprehensive staff scheduling and management tools",
    category: "core",
    icon: "Users",
    features: [
      "Staff calendar & availability",
      "Shift scheduling",
      "Time-off requests",
      "Labor cost tracking",
      "Staff assignment to services",
      "Overtime tracking",
      "Conflict detection",
    ],
    pricing: {
      monthly: 19,
      quarterly: 49,
      yearly: 189,
      currency: "USD",
    },
    requiredTier: "pro",
    isStandalone: true,
    dependencies: ["module-booking"],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "module-customer-management",
    name: "Customer Management",
    slug: "customer-management",
    description: "Advanced client and pet profile management",
    category: "core",
    icon: "UserCircle",
    features: [
      "Client profiles & history",
      "Pet profiles & medical records",
      "Emergency contacts",
      "Vaccination tracking",
      "Special care notes",
      "Client portal access",
      "Document storage",
    ],
    pricing: {
      monthly: 0,
      quarterly: 0,
      yearly: 0,
      currency: "USD",
    },
    requiredTier: "all",
    isStandalone: false,
    dependencies: [],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "module-financial-reporting",
    name: "Financial Reporting",
    slug: "financial-reporting",
    description: "Complete financial management and reporting suite",
    category: "advanced",
    icon: "DollarSign",
    features: [
      "Revenue tracking & reports",
      "Expense management",
      "Profit & loss statements",
      "Tax reporting",
      "Invoice generation",
      "Payment processing integration",
      "Financial forecasting",
      "Multi-currency support",
    ],
    pricing: {
      monthly: 29,
      quarterly: 79,
      yearly: 299,
      currency: "USD",
    },
    requiredTier: "pro",
    isStandalone: true,
    dependencies: ["module-booking"],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "module-communication",
    name: "Communication Hub",
    slug: "communication",
    description: "Multi-channel communication with clients and staff",
    category: "core",
    icon: "MessageSquare",
    features: [
      "Email notifications",
      "SMS messaging",
      "Push notifications",
      "Automated reminders",
      "Bulk messaging",
      "Message templates",
      "Communication logs",
    ],
    pricing: {
      monthly: 15,
      quarterly: 39,
      yearly: 149,
      currency: "USD",
    },
    requiredTier: "all",
    isStandalone: true,
    dependencies: [],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "module-training-education",
    name: "Training & Education",
    slug: "training-education",
    description: "Staff training and pet education management",
    category: "premium",
    icon: "GraduationCap",
    features: [
      "Training course management",
      "Certification tracking",
      "Educational content library",
      "Training progress tracking",
      "Quiz & assessment tools",
      "Video training modules",
      "Compliance training",
    ],
    pricing: {
      monthly: 39,
      quarterly: 109,
      yearly: 419,
      currency: "USD",
    },
    requiredTier: "enterprise",
    isStandalone: true,
    dependencies: ["module-staff-scheduling"],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "module-grooming-management",
    name: "Grooming Management",
    slug: "grooming-management",
    description: "Specialized grooming service management tools",
    category: "advanced",
    icon: "Scissors",
    features: [
      "Grooming appointment scheduler",
      "Service package builder",
      "Before/after photo management",
      "Grooming notes & history",
      "Product usage tracking",
      "Breed-specific templates",
      "Groomer performance tracking",
    ],
    pricing: {
      monthly: 25,
      quarterly: 69,
      yearly: 269,
      currency: "USD",
    },
    requiredTier: "pro",
    isStandalone: true,
    dependencies: ["module-booking", "module-customer-management"],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "module-inventory-management",
    name: "Inventory Management",
    slug: "inventory-management",
    description: "Complete inventory and supply chain management",
    category: "advanced",
    icon: "Package",
    features: [
      "Stock level tracking",
      "Automatic reorder alerts",
      "Supplier management",
      "Product catalog",
      "Purchase order management",
      "Inventory valuation",
      "Usage analytics",
      "Barcode scanning",
    ],
    pricing: {
      monthly: 35,
      quarterly: 95,
      yearly: 369,
      currency: "USD",
    },
    requiredTier: "pro",
    isStandalone: true,
    dependencies: [],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
];

// Helper functions
export function getModulesByCategory(
  category: "core" | "advanced" | "premium" | "addon",
): Module[] {
  return modules.filter((module) => module.category === category);
}
