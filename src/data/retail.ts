// Retail / POS module mock data

export type ProductStatus = "active" | "inactive" | "discontinued";
export type VariantType = "size" | "color" | "flavor" | "weight";
export type OrderStatus =
  | "pending"
  | "ordered"
  | "shipped"
  | "received"
  | "cancelled";
export type TransactionStatus = "completed" | "refunded" | "voided";
export type PaymentMethod = "cash" | "credit" | "debit" | "split";
export type MovementType =
  | "sale"
  | "purchase"
  | "adjustment"
  | "return"
  | "transfer";

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  variantType: VariantType;
  variantValue: string;
}

export interface Product {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  basePrice: number;
  baseCostPrice: number;
  sku: string;
  barcode: string;
  status: ProductStatus;
  hasVariants: boolean;
  variants: ProductVariant[];
  stock: number;
  minStock: number;
  maxStock: number;
  imageUrl?: string;
  tags: string[];
  taxable: boolean;
  taxRate: number;
  onlineVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  [key: string]: unknown;
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website?: string;
  paymentTerms: string;
  leadTimeDays: number;
  status: "active" | "inactive";
  notes: string;
  totalOrders: number;
  createdAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  [key: string]: unknown;
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: OrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes: string;
  orderedAt: string;
  expectedDelivery: string;
  receivedAt?: string;
  createdBy: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: "fixed" | "percent";
  total: number;
}

export interface Transaction {
  [key: string]: unknown;
  id: string;
  transactionNumber: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  payments: {
    method: PaymentMethod;
    amount: number;
  }[];
  status: TransactionStatus;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  cashierId: string;
  cashierName: string;
  receiptSent: boolean;
  receiptEmail?: string;
  notes: string;
  createdAt: string;
}

export interface InventoryMovement {
  [key: string]: unknown;
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  sku: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId?: string;
  referenceType?: "transaction" | "purchase_order" | "adjustment";
  createdBy: string;
  createdAt: string;
}

export interface LowStockAlert {
  [key: string]: unknown;
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  sku: string;
  currentStock: number;
  minStock: number;
  status: "pending" | "acknowledged" | "resolved";
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface OnlineStoreSettings {
  enabled: boolean;
  syncInventory: boolean;
  syncProducts: boolean;
  syncPrices: boolean;
  lastSyncAt: string;
  storeUrl: string;
  apiConnected: boolean;
  autoPublishNewProducts: boolean;
  lowStockThreshold: number;
  hideOutOfStock: boolean;
}

// Mock Data

export const categories = [
  "Food & Treats",
  "Toys",
  "Accessories",
  "Grooming",
  "Health & Wellness",
  "Beds & Furniture",
  "Clothing",
  "Training",
  "Travel",
  "Cleaning",
];

export const products: Product[] = [
  {
    id: "prod-001",
    name: "Premium Dog Food",
    description: "High-quality grain-free dog food with real chicken",
    category: "Food & Treats",
    brand: "PawNutrition",
    basePrice: 54.99,
    baseCostPrice: 35.0,
    sku: "PDF-001",
    barcode: "123456789012",
    status: "active",
    hasVariants: true,
    variants: [
      {
        id: "var-001-1",
        name: "5 lb Bag",
        sku: "PDF-001-5LB",
        barcode: "123456789013",
        price: 24.99,
        costPrice: 15.0,
        stock: 45,
        minStock: 10,
        maxStock: 100,
        variantType: "weight",
        variantValue: "5 lb",
      },
      {
        id: "var-001-2",
        name: "15 lb Bag",
        sku: "PDF-001-15LB",
        barcode: "123456789014",
        price: 54.99,
        costPrice: 35.0,
        stock: 28,
        minStock: 8,
        maxStock: 60,
        variantType: "weight",
        variantValue: "15 lb",
      },
      {
        id: "var-001-3",
        name: "30 lb Bag",
        sku: "PDF-001-30LB",
        barcode: "123456789015",
        price: 89.99,
        costPrice: 58.0,
        stock: 12,
        minStock: 5,
        maxStock: 30,
        variantType: "weight",
        variantValue: "30 lb",
      },
    ],
    stock: 85,
    minStock: 20,
    maxStock: 200,
    imageUrl: "/products/dog-food.jpg",
    tags: ["dog", "food", "grain-free", "chicken"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-01-15",
    updatedAt: "2024-03-10",
  },
  {
    id: "prod-002",
    name: "Interactive Puzzle Toy",
    description: "Mental stimulation toy for dogs of all sizes",
    category: "Toys",
    brand: "SmartPup",
    basePrice: 29.99,
    baseCostPrice: 14.0,
    sku: "IPT-002",
    barcode: "223456789012",
    status: "active",
    hasVariants: true,
    variants: [
      {
        id: "var-002-1",
        name: "Small",
        sku: "IPT-002-S",
        barcode: "223456789013",
        price: 24.99,
        costPrice: 12.0,
        stock: 18,
        minStock: 5,
        maxStock: 40,
        variantType: "size",
        variantValue: "Small",
      },
      {
        id: "var-002-2",
        name: "Medium",
        sku: "IPT-002-M",
        barcode: "223456789014",
        price: 29.99,
        costPrice: 14.0,
        stock: 22,
        minStock: 5,
        maxStock: 40,
        variantType: "size",
        variantValue: "Medium",
      },
      {
        id: "var-002-3",
        name: "Large",
        sku: "IPT-002-L",
        barcode: "223456789015",
        price: 34.99,
        costPrice: 17.0,
        stock: 15,
        minStock: 5,
        maxStock: 40,
        variantType: "size",
        variantValue: "Large",
      },
    ],
    stock: 55,
    minStock: 15,
    maxStock: 120,
    imageUrl: "/products/puzzle-toy.jpg",
    tags: ["dog", "toy", "puzzle", "interactive"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-01-20",
    updatedAt: "2024-03-08",
  },
  {
    id: "prod-003",
    name: "Adjustable Dog Collar",
    description: "Comfortable nylon collar with quick-release buckle",
    category: "Accessories",
    brand: "PetStyle",
    basePrice: 18.99,
    baseCostPrice: 7.5,
    sku: "ADC-003",
    barcode: "323456789012",
    status: "active",
    hasVariants: true,
    variants: [
      {
        id: "var-003-1",
        name: "Small - Red",
        sku: "ADC-003-S-RED",
        barcode: "323456789013",
        price: 16.99,
        costPrice: 6.5,
        stock: 12,
        minStock: 5,
        maxStock: 30,
        variantType: "color",
        variantValue: "Red",
      },
      {
        id: "var-003-2",
        name: "Small - Blue",
        sku: "ADC-003-S-BLU",
        barcode: "323456789014",
        price: 16.99,
        costPrice: 6.5,
        stock: 8,
        minStock: 5,
        maxStock: 30,
        variantType: "color",
        variantValue: "Blue",
      },
      {
        id: "var-003-3",
        name: "Medium - Red",
        sku: "ADC-003-M-RED",
        barcode: "323456789015",
        price: 18.99,
        costPrice: 7.5,
        stock: 15,
        minStock: 5,
        maxStock: 30,
        variantType: "color",
        variantValue: "Red",
      },
      {
        id: "var-003-4",
        name: "Medium - Blue",
        sku: "ADC-003-M-BLU",
        barcode: "323456789016",
        price: 18.99,
        costPrice: 7.5,
        stock: 3,
        minStock: 5,
        maxStock: 30,
        variantType: "color",
        variantValue: "Blue",
      },
      {
        id: "var-003-5",
        name: "Large - Red",
        sku: "ADC-003-L-RED",
        barcode: "323456789017",
        price: 21.99,
        costPrice: 8.5,
        stock: 10,
        minStock: 5,
        maxStock: 30,
        variantType: "color",
        variantValue: "Red",
      },
      {
        id: "var-003-6",
        name: "Large - Blue",
        sku: "ADC-003-L-BLU",
        barcode: "323456789018",
        price: 21.99,
        costPrice: 8.5,
        stock: 6,
        minStock: 5,
        maxStock: 30,
        variantType: "color",
        variantValue: "Blue",
      },
    ],
    stock: 54,
    minStock: 25,
    maxStock: 180,
    imageUrl: "/products/collar.jpg",
    tags: ["dog", "collar", "accessory", "nylon"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-01-25",
    updatedAt: "2024-03-05",
  },
  {
    id: "prod-004",
    name: "Natural Dog Shampoo",
    description: "Gentle, hypoallergenic shampoo with oatmeal and aloe",
    category: "Grooming",
    brand: "PurePaws",
    basePrice: 16.99,
    baseCostPrice: 8.0,
    sku: "NDS-004",
    barcode: "423456789012",
    status: "active",
    hasVariants: false,
    variants: [],
    stock: 42,
    minStock: 15,
    maxStock: 80,
    imageUrl: "/products/shampoo.jpg",
    tags: ["dog", "grooming", "shampoo", "natural"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-01",
    updatedAt: "2024-03-07",
  },
  {
    id: "prod-005",
    name: "Orthopedic Dog Bed",
    description: "Memory foam bed for joint support and comfort",
    category: "Beds & Furniture",
    brand: "ComfyPet",
    basePrice: 79.99,
    baseCostPrice: 42.0,
    sku: "ODB-005",
    barcode: "523456789012",
    status: "active",
    hasVariants: true,
    variants: [
      {
        id: "var-005-1",
        name: "Small (24x18)",
        sku: "ODB-005-S",
        barcode: "523456789013",
        price: 59.99,
        costPrice: 32.0,
        stock: 8,
        minStock: 3,
        maxStock: 20,
        variantType: "size",
        variantValue: "Small",
      },
      {
        id: "var-005-2",
        name: "Medium (36x28)",
        sku: "ODB-005-M",
        barcode: "523456789014",
        price: 79.99,
        costPrice: 42.0,
        stock: 6,
        minStock: 3,
        maxStock: 15,
        variantType: "size",
        variantValue: "Medium",
      },
      {
        id: "var-005-3",
        name: "Large (44x32)",
        sku: "ODB-005-L",
        barcode: "523456789015",
        price: 99.99,
        costPrice: 55.0,
        stock: 2,
        minStock: 2,
        maxStock: 10,
        variantType: "size",
        variantValue: "Large",
      },
    ],
    stock: 16,
    minStock: 8,
    maxStock: 45,
    imageUrl: "/products/dog-bed.jpg",
    tags: ["dog", "bed", "orthopedic", "memory foam"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-05",
    updatedAt: "2024-03-09",
  },
  {
    id: "prod-006",
    name: "Training Treats",
    description: "Small, low-calorie treats perfect for training sessions",
    category: "Food & Treats",
    brand: "GoodBoy",
    basePrice: 12.99,
    baseCostPrice: 6.0,
    sku: "TRT-006",
    barcode: "623456789012",
    status: "active",
    hasVariants: true,
    variants: [
      {
        id: "var-006-1",
        name: "Chicken Flavor",
        sku: "TRT-006-CHK",
        barcode: "623456789013",
        price: 12.99,
        costPrice: 6.0,
        stock: 35,
        minStock: 10,
        maxStock: 60,
        variantType: "flavor",
        variantValue: "Chicken",
      },
      {
        id: "var-006-2",
        name: "Beef Flavor",
        sku: "TRT-006-BEF",
        barcode: "623456789014",
        price: 12.99,
        costPrice: 6.0,
        stock: 28,
        minStock: 10,
        maxStock: 60,
        variantType: "flavor",
        variantValue: "Beef",
      },
      {
        id: "var-006-3",
        name: "Peanut Butter",
        sku: "TRT-006-PB",
        barcode: "623456789015",
        price: 13.99,
        costPrice: 6.5,
        stock: 42,
        minStock: 10,
        maxStock: 60,
        variantType: "flavor",
        variantValue: "Peanut Butter",
      },
    ],
    stock: 105,
    minStock: 30,
    maxStock: 180,
    imageUrl: "/products/treats.jpg",
    tags: ["dog", "treats", "training", "low-calorie"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-10",
    updatedAt: "2024-03-11",
  },
  {
    id: "prod-007",
    name: "Retractable Dog Leash",
    description: "16ft retractable leash with ergonomic handle",
    category: "Accessories",
    brand: "WalkEasy",
    basePrice: 24.99,
    baseCostPrice: 11.0,
    sku: "RDL-007",
    barcode: "723456789012",
    status: "active",
    hasVariants: false,
    variants: [],
    stock: 19,
    minStock: 8,
    maxStock: 40,
    imageUrl: "/products/leash.jpg",
    tags: ["dog", "leash", "retractable", "walking"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-15",
    updatedAt: "2024-03-06",
  },
  {
    id: "prod-008",
    name: "Pet First Aid Kit",
    description: "Complete emergency kit for pet health emergencies",
    category: "Health & Wellness",
    brand: "PetSafe",
    basePrice: 34.99,
    baseCostPrice: 18.0,
    sku: "FAK-008",
    barcode: "823456789012",
    status: "active",
    hasVariants: false,
    variants: [],
    stock: 14,
    minStock: 5,
    maxStock: 30,
    imageUrl: "/products/first-aid.jpg",
    tags: ["pet", "health", "first aid", "emergency"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-18",
    updatedAt: "2024-03-04",
  },
  {
    id: "prod-009",
    name: "Cat Scratching Post",
    description: "Sisal-wrapped post with plush base",
    category: "Beds & Furniture",
    brand: "KittyKing",
    basePrice: 44.99,
    baseCostPrice: 22.0,
    sku: "CSP-009",
    barcode: "923456789012",
    status: "active",
    hasVariants: false,
    variants: [],
    stock: 11,
    minStock: 4,
    maxStock: 25,
    imageUrl: "/products/scratching-post.jpg",
    tags: ["cat", "furniture", "scratching post"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-20",
    updatedAt: "2024-03-08",
  },
  {
    id: "prod-010",
    name: "Pet Carrier Bag",
    description: "Airline-approved soft-sided carrier for small pets",
    category: "Travel",
    brand: "TravelPet",
    basePrice: 49.99,
    baseCostPrice: 25.0,
    sku: "PCB-010",
    barcode: "103456789012",
    status: "active",
    hasVariants: true,
    variants: [
      {
        id: "var-010-1",
        name: "Small (up to 10 lbs)",
        sku: "PCB-010-S",
        barcode: "103456789013",
        price: 44.99,
        costPrice: 22.0,
        stock: 7,
        minStock: 3,
        maxStock: 15,
        variantType: "size",
        variantValue: "Small",
      },
      {
        id: "var-010-2",
        name: "Medium (up to 20 lbs)",
        sku: "PCB-010-M",
        barcode: "103456789014",
        price: 54.99,
        costPrice: 28.0,
        stock: 5,
        minStock: 3,
        maxStock: 15,
        variantType: "size",
        variantValue: "Medium",
      },
    ],
    stock: 12,
    minStock: 6,
    maxStock: 30,
    imageUrl: "/products/carrier.jpg",
    tags: ["pet", "travel", "carrier", "airline"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-22",
    updatedAt: "2024-03-10",
  },
  {
    id: "prod-011",
    name: "Enzymatic Pet Stain Remover",
    description: "Professional strength cleaner for pet accidents",
    category: "Cleaning",
    brand: "CleanPaw",
    basePrice: 14.99,
    baseCostPrice: 6.0,
    sku: "PSR-011",
    barcode: "113456789012",
    status: "active",
    hasVariants: false,
    variants: [],
    stock: 38,
    minStock: 12,
    maxStock: 60,
    imageUrl: "/products/cleaner.jpg",
    tags: ["cleaning", "stain remover", "enzymatic"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-25",
    updatedAt: "2024-03-09",
  },
  {
    id: "prod-012",
    name: "Dog Training Clicker",
    description: "Professional clicker with wrist strap for training",
    category: "Training",
    brand: "TrainRight",
    basePrice: 7.99,
    baseCostPrice: 2.5,
    sku: "DTC-012",
    barcode: "123456789112",
    status: "active",
    hasVariants: false,
    variants: [],
    stock: 52,
    minStock: 15,
    maxStock: 80,
    imageUrl: "/products/clicker.jpg",
    tags: ["dog", "training", "clicker"],
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    createdAt: "2024-02-28",
    updatedAt: "2024-03-07",
  },
];

export const suppliers: Supplier[] = [
  {
    id: "sup-001",
    name: "PetSupply Wholesale",
    contactName: "Robert Martinez",
    email: "orders@petsupplywholesale.com",
    phone: "(555) 123-4567",
    address: "1234 Distribution Way",
    city: "Chicago, IL",
    country: "USA",
    website: "www.petsupplywholesale.com",
    paymentTerms: "Net 30",
    leadTimeDays: 5,
    status: "active",
    notes: "Primary supplier for food and treats",
    totalOrders: 45,
    createdAt: "2023-06-15",
  },
  {
    id: "sup-002",
    name: "PawToys Direct",
    contactName: "Lisa Chen",
    email: "sales@pawtoysdirect.com",
    phone: "(555) 234-5678",
    address: "567 Toy Factory Blvd",
    city: "Los Angeles, CA",
    country: "USA",
    website: "www.pawtoysdirect.com",
    paymentTerms: "Net 15",
    leadTimeDays: 7,
    status: "active",
    notes: "Best prices on toys and accessories",
    totalOrders: 28,
    createdAt: "2023-08-20",
  },
  {
    id: "sup-003",
    name: "GroomPro Supplies",
    contactName: "Michael Thompson",
    email: "info@groomprosupplies.com",
    phone: "(555) 345-6789",
    address: "890 Grooming Lane",
    city: "Miami, FL",
    country: "USA",
    website: "www.groomprosupplies.com",
    paymentTerms: "Net 30",
    leadTimeDays: 4,
    status: "active",
    notes: "Grooming products and supplies",
    totalOrders: 32,
    createdAt: "2023-09-10",
  },
  {
    id: "sup-004",
    name: "ComfortPet Bedding",
    contactName: "Sarah Williams",
    email: "orders@comfortpetbedding.com",
    phone: "(555) 456-7890",
    address: "234 Comfort Street",
    city: "Seattle, WA",
    country: "USA",
    website: "www.comfortpetbedding.com",
    paymentTerms: "Net 45",
    leadTimeDays: 10,
    status: "active",
    notes: "Specialty beds and furniture",
    totalOrders: 15,
    createdAt: "2023-11-05",
  },
  {
    id: "sup-005",
    name: "Global Pet Imports",
    contactName: "James Wilson",
    email: "contact@globalpetimports.com",
    phone: "(555) 567-8901",
    address: "456 Import Drive",
    city: "New York, NY",
    country: "USA",
    paymentTerms: "Net 30",
    leadTimeDays: 14,
    status: "inactive",
    notes: "International products - currently on hold",
    totalOrders: 8,
    createdAt: "2024-01-15",
  },
];

const getDateString = (daysOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
};

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "po-001",
    orderNumber: "PO-2024-001",
    supplierId: "sup-001",
    supplierName: "PetSupply Wholesale",
    status: "received",
    items: [
      {
        productId: "prod-001",
        productName: "Premium Dog Food",
        variantId: "var-001-2",
        variantName: "15 lb Bag",
        sku: "PDF-001-15LB",
        quantity: 24,
        unitCost: 35.0,
        totalCost: 840.0,
        receivedQuantity: 24,
      },
      {
        productId: "prod-006",
        productName: "Training Treats",
        variantId: "var-006-1",
        variantName: "Chicken Flavor",
        sku: "TRT-006-CHK",
        quantity: 36,
        unitCost: 6.0,
        totalCost: 216.0,
        receivedQuantity: 36,
      },
    ],
    subtotal: 1056.0,
    tax: 0,
    shipping: 45.0,
    total: 1101.0,
    notes: "Regular monthly restock",
    orderedAt: getDateString(-14),
    expectedDelivery: getDateString(-9),
    receivedAt: getDateString(-8),
    createdBy: "Admin User",
  },
  {
    id: "po-002",
    orderNumber: "PO-2024-002",
    supplierId: "sup-002",
    supplierName: "PawToys Direct",
    status: "shipped",
    items: [
      {
        productId: "prod-002",
        productName: "Interactive Puzzle Toy",
        variantId: "var-002-2",
        variantName: "Medium",
        sku: "IPT-002-M",
        quantity: 20,
        unitCost: 14.0,
        totalCost: 280.0,
        receivedQuantity: 0,
      },
      {
        productId: "prod-007",
        productName: "Retractable Dog Leash",
        sku: "RDL-007",
        quantity: 15,
        unitCost: 11.0,
        totalCost: 165.0,
        receivedQuantity: 0,
      },
    ],
    subtotal: 445.0,
    tax: 0,
    shipping: 25.0,
    total: 470.0,
    notes: "Rush order for low stock items",
    orderedAt: getDateString(-5),
    expectedDelivery: getDateString(2),
    createdBy: "Admin User",
  },
  {
    id: "po-003",
    orderNumber: "PO-2024-003",
    supplierId: "sup-003",
    supplierName: "GroomPro Supplies",
    status: "ordered",
    items: [
      {
        productId: "prod-004",
        productName: "Natural Dog Shampoo",
        sku: "NDS-004",
        quantity: 30,
        unitCost: 8.0,
        totalCost: 240.0,
        receivedQuantity: 0,
      },
    ],
    subtotal: 240.0,
    tax: 0,
    shipping: 15.0,
    total: 255.0,
    notes: "",
    orderedAt: getDateString(-2),
    expectedDelivery: getDateString(5),
    createdBy: "Admin User",
  },
  {
    id: "po-004",
    orderNumber: "PO-2024-004",
    supplierId: "sup-004",
    supplierName: "ComfortPet Bedding",
    status: "pending",
    items: [
      {
        productId: "prod-005",
        productName: "Orthopedic Dog Bed",
        variantId: "var-005-3",
        variantName: "Large (44x32)",
        sku: "ODB-005-L",
        quantity: 8,
        unitCost: 55.0,
        totalCost: 440.0,
        receivedQuantity: 0,
      },
      {
        productId: "prod-005",
        productName: "Orthopedic Dog Bed",
        variantId: "var-005-2",
        variantName: "Medium (36x28)",
        sku: "ODB-005-M",
        quantity: 10,
        unitCost: 42.0,
        totalCost: 420.0,
        receivedQuantity: 0,
      },
    ],
    subtotal: 860.0,
    tax: 0,
    shipping: 75.0,
    total: 935.0,
    notes: "Waiting for supplier confirmation",
    orderedAt: getDateString(0),
    expectedDelivery: getDateString(12),
    createdBy: "Admin User",
  },
];

const transactions: Transaction[] = [
  {
    id: "txn-001",
    transactionNumber: "TXN-20240310-001",
    items: [
      {
        productId: "prod-001",
        productName: "Premium Dog Food",
        variantId: "var-001-2",
        variantName: "15 lb Bag",
        sku: "PDF-001-15LB",
        quantity: 2,
        unitPrice: 54.99,
        discount: 0,
        discountType: "fixed",
        total: 109.98,
      },
      {
        productId: "prod-006",
        productName: "Training Treats",
        variantId: "var-006-3",
        variantName: "Peanut Butter",
        sku: "TRT-006-PB",
        quantity: 1,
        unitPrice: 13.99,
        discount: 0,
        discountType: "fixed",
        total: 13.99,
      },
    ],
    subtotal: 123.97,
    discountTotal: 0,
    taxTotal: 0,
    total: 123.97,
    paymentMethod: "credit",
    payments: [{ method: "credit", amount: 123.97 }],
    status: "completed",
    customerId: "15",
    customerName: "Alice Johnson",
    customerEmail: "alice@example.com",
    cashierId: "staff-001",
    cashierName: "Emily Brown",
    receiptSent: true,
    receiptEmail: "john.smith@email.com",
    notes: "",
    createdAt: getDateString(-1) + "T10:30:00",
  },
  {
    id: "txn-002",
    transactionNumber: "TXN-20240310-002",
    items: [
      {
        productId: "prod-002",
        productName: "Interactive Puzzle Toy",
        variantId: "var-002-3",
        variantName: "Large",
        sku: "IPT-002-L",
        quantity: 1,
        unitPrice: 34.99,
        discount: 5,
        discountType: "fixed",
        total: 29.99,
      },
    ],
    subtotal: 34.99,
    discountTotal: 5.0,
    taxTotal: 0,
    total: 29.99,
    paymentMethod: "cash",
    payments: [{ method: "cash", amount: 29.99 }],
    status: "completed",
    customerId: "16",
    customerName: "Bob Smith",
    customerEmail: "bob@example.com",
    cashierId: "staff-001",
    cashierName: "Emily Brown",
    receiptSent: false,
    notes: "Loyalty discount applied",
    createdAt: getDateString(-1) + "T11:45:00",
  },
  {
    id: "txn-003",
    transactionNumber: "TXN-20240310-003",
    items: [
      {
        productId: "prod-005",
        productName: "Orthopedic Dog Bed",
        variantId: "var-005-2",
        variantName: "Medium (36x28)",
        sku: "ODB-005-M",
        quantity: 1,
        unitPrice: 79.99,
        discount: 10,
        discountType: "percent",
        total: 71.99,
      },
      {
        productId: "prod-007",
        productName: "Retractable Dog Leash",
        sku: "RDL-007",
        quantity: 1,
        unitPrice: 24.99,
        discount: 0,
        discountType: "fixed",
        total: 24.99,
      },
      {
        productId: "prod-004",
        productName: "Natural Dog Shampoo",
        sku: "NDS-004",
        quantity: 2,
        unitPrice: 16.99,
        discount: 0,
        discountType: "fixed",
        total: 33.98,
      },
    ],
    subtotal: 138.96,
    discountTotal: 8.0,
    taxTotal: 0,
    total: 130.96,
    paymentMethod: "split",
    payments: [
      { method: "credit", amount: 100.0 },
      { method: "cash", amount: 30.96 },
    ],
    status: "completed",
    customerId: "16",
    customerName: "Bob Smith",
    customerEmail: "bob@example.com",
    cashierId: "staff-002",
    cashierName: "Tom Wilson",
    receiptSent: true,
    receiptEmail: "sarah.j@email.com",
    notes: "New customer 10% off first purchase",
    createdAt: getDateString(-1) + "T14:20:00",
  },
  {
    id: "txn-004",
    transactionNumber: "TXN-20240311-001",
    items: [
      {
        productId: "prod-012",
        productName: "Dog Training Clicker",
        sku: "DTC-012",
        quantity: 2,
        unitPrice: 7.99,
        discount: 0,
        discountType: "fixed",
        total: 15.98,
      },
      {
        productId: "prod-006",
        productName: "Training Treats",
        variantId: "var-006-1",
        variantName: "Chicken Flavor",
        sku: "TRT-006-CHK",
        quantity: 3,
        unitPrice: 12.99,
        discount: 0,
        discountType: "fixed",
        total: 38.97,
      },
    ],
    subtotal: 54.95,
    discountTotal: 0,
    taxTotal: 0,
    total: 54.95,
    paymentMethod: "debit",
    payments: [{ method: "debit", amount: 54.95 }],
    status: "completed",
    customerId: "15",
    customerName: "Alice Johnson",
    customerEmail: "alice@example.com",
    cashierId: "staff-001",
    cashierName: "Emily Brown",
    receiptSent: false,
    notes: "",
    createdAt: getDateString(0) + "T09:15:00",
  },
  {
    id: "txn-005",
    transactionNumber: "TXN-20240311-002",
    items: [
      {
        productId: "prod-003",
        productName: "Adjustable Dog Collar",
        variantId: "var-003-3",
        variantName: "Medium - Red",
        sku: "ADC-003-M-RED",
        quantity: 1,
        unitPrice: 18.99,
        discount: 0,
        discountType: "fixed",
        total: 18.99,
      },
    ],
    subtotal: 18.99,
    discountTotal: 0,
    taxTotal: 0,
    total: 18.99,
    paymentMethod: "cash",
    payments: [{ method: "cash", amount: 18.99 }],
    status: "refunded",
    customerId: "18",
    customerName: "Diana Prince",
    customerEmail: "diana@example.com",
    cashierId: "staff-002",
    cashierName: "Tom Wilson",
    receiptSent: false,
    notes: "Customer returned - wrong size",
    createdAt: getDateString(0) + "T11:30:00",
  },
  {
    id: "txn-006",
    transactionNumber: "TXN-20240312-001",
    items: [
      {
        productId: "prod-001",
        productName: "Premium Dog Food",
        variantId: "var-001-1",
        variantName: "5 lb Bag",
        sku: "PDF-001-5LB",
        quantity: 1,
        unitPrice: 24.99,
        discount: 0,
        discountType: "fixed",
        total: 24.99,
      },
      {
        productId: "prod-006",
        productName: "Training Treats",
        variantId: "var-006-1",
        variantName: "Chicken Flavor",
        sku: "TRT-006-CHK",
        quantity: 2,
        unitPrice: 12.99,
        discount: 0,
        discountType: "fixed",
        total: 25.98,
      },
    ],
    subtotal: 50.97,
    discountTotal: 0,
    taxTotal: 0,
    total: 50.97,
    paymentMethod: "credit",
    payments: [{ method: "credit", amount: 50.97 }],
    status: "completed",
    customerId: "17",
    customerName: "Charlie Brown",
    customerEmail: "charlie@example.com",
    cashierId: "staff-001",
    cashierName: "Emily Brown",
    receiptSent: false,
    notes: "",
    createdAt: getDateString(-3) + "T14:00:00",
  },
];

export const inventoryMovements: InventoryMovement[] = [
  {
    id: "mov-001",
    productId: "prod-001",
    productName: "Premium Dog Food",
    variantId: "var-001-2",
    variantName: "15 lb Bag",
    sku: "PDF-001-15LB",
    movementType: "purchase",
    quantity: 24,
    previousStock: 4,
    newStock: 28,
    reason: "Purchase order received",
    referenceId: "po-001",
    referenceType: "purchase_order",
    createdBy: "Admin User",
    createdAt: getDateString(-8) + "T10:00:00",
  },
  {
    id: "mov-002",
    productId: "prod-001",
    productName: "Premium Dog Food",
    variantId: "var-001-2",
    variantName: "15 lb Bag",
    sku: "PDF-001-15LB",
    movementType: "sale",
    quantity: -2,
    previousStock: 30,
    newStock: 28,
    reason: "Sale",
    referenceId: "txn-001",
    referenceType: "transaction",
    createdBy: "Emily Brown",
    createdAt: getDateString(-1) + "T10:30:00",
  },
  {
    id: "mov-003",
    productId: "prod-006",
    productName: "Training Treats",
    variantId: "var-006-1",
    variantName: "Chicken Flavor",
    sku: "TRT-006-CHK",
    movementType: "purchase",
    quantity: 36,
    previousStock: -1,
    newStock: 35,
    reason: "Purchase order received",
    referenceId: "po-001",
    referenceType: "purchase_order",
    createdBy: "Admin User",
    createdAt: getDateString(-8) + "T10:00:00",
  },
  {
    id: "mov-004",
    productId: "prod-002",
    productName: "Interactive Puzzle Toy",
    variantId: "var-002-3",
    variantName: "Large",
    sku: "IPT-002-L",
    movementType: "sale",
    quantity: -1,
    previousStock: 16,
    newStock: 15,
    reason: "Sale",
    referenceId: "txn-002",
    referenceType: "transaction",
    createdBy: "Emily Brown",
    createdAt: getDateString(-1) + "T11:45:00",
  },
  {
    id: "mov-005",
    productId: "prod-005",
    productName: "Orthopedic Dog Bed",
    variantId: "var-005-2",
    variantName: "Medium (36x28)",
    sku: "ODB-005-M",
    movementType: "sale",
    quantity: -1,
    previousStock: 7,
    newStock: 6,
    reason: "Sale",
    referenceId: "txn-003",
    referenceType: "transaction",
    createdBy: "Tom Wilson",
    createdAt: getDateString(-1) + "T14:20:00",
  },
  {
    id: "mov-006",
    productId: "prod-003",
    productName: "Adjustable Dog Collar",
    variantId: "var-003-4",
    variantName: "Medium - Blue",
    sku: "ADC-003-M-BLU",
    movementType: "adjustment",
    quantity: -2,
    previousStock: 5,
    newStock: 3,
    reason: "Damaged inventory - disposed",
    createdBy: "Admin User",
    createdAt: getDateString(-3) + "T16:00:00",
  },
  {
    id: "mov-007",
    productId: "prod-003",
    productName: "Adjustable Dog Collar",
    variantId: "var-003-3",
    variantName: "Medium - Red",
    sku: "ADC-003-M-RED",
    movementType: "return",
    quantity: 1,
    previousStock: 14,
    newStock: 15,
    reason: "Customer return - wrong size",
    referenceId: "txn-005",
    referenceType: "transaction",
    createdBy: "Tom Wilson",
    createdAt: getDateString(0) + "T11:30:00",
  },
  {
    id: "mov-008",
    productId: "prod-012",
    productName: "Dog Training Clicker",
    sku: "DTC-012",
    movementType: "sale",
    quantity: -2,
    previousStock: 54,
    newStock: 52,
    reason: "Sale",
    referenceId: "txn-004",
    referenceType: "transaction",
    createdBy: "Emily Brown",
    createdAt: getDateString(0) + "T09:15:00",
  },
];

export const lowStockAlerts: LowStockAlert[] = [
  {
    id: "alert-001",
    productId: "prod-005",
    productName: "Orthopedic Dog Bed",
    variantId: "var-005-3",
    variantName: "Large (44x32)",
    sku: "ODB-005-L",
    currentStock: 2,
    minStock: 2,
    status: "pending",
    createdAt: getDateString(-2),
  },
  {
    id: "alert-002",
    productId: "prod-003",
    productName: "Adjustable Dog Collar",
    variantId: "var-003-4",
    variantName: "Medium - Blue",
    sku: "ADC-003-M-BLU",
    currentStock: 3,
    minStock: 5,
    status: "acknowledged",
    createdAt: getDateString(-3),
    acknowledgedAt: getDateString(-2),
    acknowledgedBy: "Admin User",
  },
  {
    id: "alert-003",
    productId: "prod-010",
    productName: "Pet Carrier Bag",
    variantId: "var-010-2",
    variantName: "Medium (up to 20 lbs)",
    sku: "PCB-010-M",
    currentStock: 5,
    minStock: 3,
    status: "resolved",
    createdAt: getDateString(-7),
    acknowledgedAt: getDateString(-6),
    acknowledgedBy: "Admin User",
  },
];

// Helper functions

function getActiveProducts(): Product[] {
  return products.filter((p) => p.status === "active");
}

export function getProductByBarcode(
  barcode: string,
): Product | ProductVariant | null {
  for (const product of products) {
    if (product.barcode === barcode) {
      return product;
    }
    for (const variant of product.variants) {
      if (variant.barcode === barcode) {
        return variant;
      }
    }
  }
  return null;
}

export function getLowStockProducts(): (Product | ProductVariant)[] {
  const lowStock: (Product | ProductVariant)[] = [];

  for (const product of products) {
    if (product.hasVariants) {
      for (const variant of product.variants) {
        if (variant.stock <= variant.minStock) {
          lowStock.push(variant);
        }
      }
    } else {
      if (product.stock <= product.minStock) {
        lowStock.push(product);
      }
    }
  }

  return lowStock;
}

export function getInventoryValue(): { cost: number; retail: number } {
  let costValue = 0;
  let retailValue = 0;

  for (const product of products) {
    if (product.hasVariants) {
      for (const variant of product.variants) {
        costValue += variant.stock * variant.costPrice;
        retailValue += variant.stock * variant.price;
      }
    } else {
      costValue += product.stock * product.baseCostPrice;
      retailValue += product.stock * product.basePrice;
    }
  }

  return { cost: costValue, retail: retailValue };
}

export function getActiveSuppliers(): Supplier[] {
  return suppliers.filter((s) => s.status === "active");
}

export function getPendingOrders(): PurchaseOrder[] {
  return purchaseOrders.filter(
    (o) => o.status === "pending" || o.status === "ordered",
  );
}

function getTodayTransactions(): Transaction[] {
  const today = getDateString(0);
  return transactions.filter((t) => t.createdAt.startsWith(today));
}

function getTransactionStats() {
  const todayTransactions = getTodayTransactions();
  const completedToday = todayTransactions.filter(
    (t) => t.status === "completed",
  );

  return {
    todayTransactions: completedToday.length,
    todayRevenue: completedToday.reduce((sum, t) => sum + t.total, 0),
    todayItems: completedToday.reduce(
      (sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0),
      0,
    ),
    pendingAlerts: lowStockAlerts.filter((a) => a.status === "pending").length,
  };
}

export function getRetailStats() {
  const inventoryValue = getInventoryValue();
  const lowStockCount = getLowStockProducts().length;
  const pendingOrdersCount = getPendingOrders().length;

  return {
    totalProducts: products.length,
    activeProducts: getActiveProducts().length,
    inventoryCostValue: inventoryValue.cost,
    inventoryRetailValue: inventoryValue.retail,
    lowStockCount,
    pendingOrdersCount,
    activeSuppliers: getActiveSuppliers().length,
    ...getTransactionStats(),
  };
}

/** Get retail purchases for a client (linked to client file). */
export function getClientRetailPurchases(
  clientId: number | string,
): Transaction[] {
  const id = String(clientId);
  return transactions
    .filter((t) => t.customerId === id && t.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/** Add a new retail transaction (used by POS when completing a sale). */
export function addRetailTransaction(
  txn: Omit<
    Transaction,
    "id" | "transactionNumber" | "createdAt" | "status" | "receiptSent"
  >,
): Transaction {
  const id = `txn-${Date.now()}`;
  const today = getDateString(0);
  const count =
    transactions.filter((t) => t.createdAt.startsWith(today)).length + 1;
  const transactionNumber = `TXN-${today.replace(/-/g, "")}-${String(count).padStart(3, "0")}`;
  const newTxn: Transaction = {
    ...txn,
    id,
    transactionNumber,
    status: "completed",
    receiptSent: false,
    createdAt: new Date().toISOString().slice(0, 19),
  } as Transaction;
  transactions.push(newTxn);
  return newTxn;
}
