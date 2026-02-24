// Grooming Module Mock Data

export type GroomingStatus =
  | "scheduled"
  | "checked-in"
  | "in-progress"
  | "ready-for-pickup"
  | "completed"
  | "cancelled"
  | "no-show";
export type PetSize = "small" | "medium" | "large" | "giant";
export type CoatType =
  | "short"
  | "medium"
  | "long"
  | "wire"
  | "curly"
  | "double";
export type ProductCategory =
  | "shampoo"
  | "conditioner"
  | "styling"
  | "tools"
  | "accessories"
  | "health"
  | "cleaning";

export type StylistSkillLevel = "junior" | "intermediate" | "senior" | "master";

export interface StylistCapacity {
  maxDailyAppointments: number; // Maximum appointments per day
  maxConcurrentAppointments: number; // Maximum simultaneous appointments (usually 1)
  preferredPetSizes: PetSize[]; // Pet sizes this stylist prefers/handles best
  skillLevel: StylistSkillLevel; // Experience/skill level
  canHandleMatted: boolean; // Can handle matted coats
  canHandleAnxious: boolean; // Can handle anxious pets
  canHandleAggressive: boolean; // Can handle aggressive pets
}

export interface Stylist {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  specializations: string[];
  certifications: string[];
  yearsExperience: number;
  status: "active" | "inactive" | "on-leave";
  bio: string;
  rating: number;
  totalAppointments: number;
  hireDate: string;
  capacity: StylistCapacity; // Capacity and skill configuration
}

export interface StylistAvailability {
  id: string;
  stylistId: string;
  stylistName: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface StylistTimeOff {
  id: string;
  stylistId: string;
  stylistName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "denied";
}

export interface GroomingIntake {
  coatCondition: "normal" | "matted" | "severely-matted";
  behaviorNotes: string;
  allergies: string[];
  specialInstructions: string;
  beforePhotos: string[]; // URLs
  mattingFeeWarning: boolean;
  mattingFeeAmount?: number;
  completedBy?: string; // Groomer name
  completedAt?: string; // ISO timestamp
}

export type PriceAdjustmentReason =
  | "matting-fee"
  | "de-shedding-upgrade"
  | "extra-brushing-time"
  | "behavioral-handling"
  | "extra-time-required"
  | "product-upgrade"
  | "special-treatment"
  | "other";

export interface PriceAdjustment {
  id: string;
  amount: number;
  reason: PriceAdjustmentReason;
  customReason?: string; // For "other" reason
  description: string;
  addedBy: string; // Groomer name
  addedAt: string; // ISO timestamp
  customerNotified: boolean;
  notifiedAt?: string; // ISO timestamp
}

export interface GroomingAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  petId: number;
  petName: string;
  petBreed: string;
  petSize: PetSize;
  petWeight: number;
  coatType: CoatType;
  petPhotoUrl?: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  stylistId: string;
  stylistName: string;
  packageId: string;
  packageName: string;
  addOns: string[];
  basePrice: number; // Original price before adjustments
  priceAdjustments: PriceAdjustment[]; // Dynamic price adjustments
  totalPrice: number; // basePrice + sum of adjustments
  status: GroomingStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string;
  specialInstructions: string;
  allergies: string[];
  intake?: GroomingIntake; // Intake form data
  afterPhotos?: GroomingPhoto[]; // After photos from groomer
  lastGroomDate?: string;
  createdAt: string;
  onlineBooking: boolean;
}

export interface ProductUsage {
  productId: string;
  productName: string;
  quantity: number; // Amount used per service (e.g., 10ml, 0.1 bottles)
  unit: string; // Unit of measurement (e.g., "ml", "bottle", "oz")
  isOptional?: boolean; // If true, product may not always be used
}

export interface GroomingPackage {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  duration: number; // in minutes - automatically used in scheduling
  sizePricing: {
    small: number;
    medium: number;
    large: number;
    giant: number;
  };
  includes: string[];
  isActive: boolean;
  isPopular?: boolean;
  purchaseCount: number;
  createdAt: string;
  assignedStylistIds?: string[]; // Optional: restrict package to specific stylists
  requiresEvaluation?: boolean; // If true, pet must have valid evaluation before booking
  productUsage?: ProductUsage[]; // Products used for this package and their quantities
}

export interface GroomingAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  isActive: boolean;
}

export interface GroomingPhoto {
  id: string;
  url: string;
  type: "before" | "after";
  caption?: string;
  takenAt: string;
  takenBy: string;
}

export interface PhotoAlbum {
  id: string;
  appointmentId: string;
  petId: number;
  petName: string;
  date: string;
  stylistId: string;
  stylistName: string;
  beforePhotos: GroomingPhoto[];
  afterPhotos: GroomingPhoto[];
  notes?: string;
  sharedWithOwner: boolean;
  sharedAt?: string;
  createdAt: string;
}

export interface GroomingProduct {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  costPrice: number;
  unit: string;
  usagePerGroom: number;
  supplier: string;
  lastRestocked: string;
  expiryDate?: string;
  isActive: boolean;
  notes?: string;
}

export interface ProductUsageLog {
  id: string;
  productId: string;
  productName: string;
  appointmentId?: string;
  quantity: number;
  usedBy: string;
  usedAt: string;
  reason: "grooming" | "waste" | "expired" | "damaged" | "other";
  notes?: string;
}

export interface InventoryOrder {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplier: string;
  status: "pending" | "ordered" | "shipped" | "received" | "cancelled";
  orderedAt: string;
  expectedDelivery?: string;
  receivedAt?: string;
  orderedBy: string;
}

// Mock Stylists
export const stylists: Stylist[] = [
  {
    id: "stylist-001",
    name: "Jessica Martinez",
    email: "jessica@pawsplay.com",
    phone: "(514) 555-0201",
    photoUrl: "/staff/jessica.jpg",
    specializations: [
      "Breed-specific cuts",
      "Show grooming",
      "De-matting",
      "Senior pets",
    ],
    certifications: ["Certified Master Groomer (CMG)", "Pet First Aid & CPR"],
    yearsExperience: 8,
    status: "active",
    bio: "Jessica has been grooming professionally for 8 years and specializes in breed-specific cuts and show grooming. She has a gentle touch that puts even the most nervous pets at ease.",
    rating: 4.9,
    totalAppointments: 1250,
    hireDate: "2019-03-15",
    capacity: {
      maxDailyAppointments: 8,
      maxConcurrentAppointments: 1,
      preferredPetSizes: ["small", "medium", "large"],
      skillLevel: "senior",
      canHandleMatted: true,
      canHandleAnxious: true,
      canHandleAggressive: false,
    },
  },
  {
    id: "stylist-002",
    name: "Amy Chen",
    email: "amy@pawsplay.com",
    phone: "(514) 555-0202",
    photoUrl: "/staff/amy.jpg",
    specializations: [
      "Asian fusion styles",
      "Creative grooming",
      "Puppies",
      "Small breeds",
    ],
    certifications: [
      "Certified Professional Groomer (CPG)",
      "Fear Free Certified",
    ],
    yearsExperience: 5,
    status: "active",
    bio: "Amy is known for her creative grooming skills and patience with puppies. She specializes in Asian fusion styles and loves working with small breeds.",
    rating: 4.8,
    totalAppointments: 890,
    hireDate: "2021-06-01",
    capacity: {
      maxDailyAppointments: 6,
      maxConcurrentAppointments: 1,
      preferredPetSizes: ["small", "medium"],
      skillLevel: "intermediate",
      canHandleMatted: true,
      canHandleAnxious: true,
      canHandleAggressive: false,
    },
  },
  {
    id: "stylist-003",
    name: "Marcus Thompson",
    email: "marcus@pawsplay.com",
    phone: "(514) 555-0203",
    photoUrl: "/staff/marcus.jpg",
    specializations: [
      "Large breeds",
      "Hand stripping",
      "Double coats",
      "Anxious pets",
    ],
    certifications: [
      "Certified Professional Groomer (CPG)",
      "Canine Behavior Specialist",
    ],
    yearsExperience: 6,
    status: "active",
    bio: "Marcus excels with large breed dogs and has specialized training in handling anxious pets. His calm demeanor and expertise make him a favorite among nervous fur parents.",
    rating: 4.7,
    totalAppointments: 720,
    hireDate: "2020-09-15",
    capacity: {
      maxDailyAppointments: 7,
      maxConcurrentAppointments: 1,
      preferredPetSizes: ["medium", "large", "giant"],
      skillLevel: "senior",
      canHandleMatted: true,
      canHandleAnxious: true,
      canHandleAggressive: true,
    },
  },
  {
    id: "stylist-004",
    name: "Sophie Laurent",
    email: "sophie@pawsplay.com",
    phone: "(514) 555-0204",
    photoUrl: "/staff/sophie.jpg",
    specializations: ["Poodles", "Doodles", "Cats", "Exotic breeds"],
    certifications: [
      "National Cat Groomers Institute Certified",
      "Certified Master Groomer (CMG)",
    ],
    yearsExperience: 10,
    status: "active",
    bio: "Sophie is our most experienced groomer with a special talent for poodles, doodles, and cats. Her precision cuts and attention to detail are unmatched.",
    rating: 4.95,
    totalAppointments: 2100,
    hireDate: "2017-01-10",
    capacity: {
      maxDailyAppointments: 10,
      maxConcurrentAppointments: 1,
      preferredPetSizes: ["small", "medium", "large"],
      skillLevel: "master",
      canHandleMatted: true,
      canHandleAnxious: true,
      canHandleAggressive: false,
    },
  },
  {
    id: "stylist-005",
    name: "David Kim",
    email: "david@pawsplay.com",
    phone: "(514) 555-0205",
    photoUrl: "/staff/david.jpg",
    specializations: [
      "Speed grooming",
      "Basic baths",
      "Nail trimming",
      "Walk-ins",
    ],
    certifications: ["Certified Professional Groomer (CPG)"],
    yearsExperience: 3,
    status: "on-leave",
    bio: "David is efficient and great with routine grooming services. He handles our walk-in appointments and express services with ease.",
    rating: 4.5,
    totalAppointments: 450,
    hireDate: "2022-04-20",
    capacity: {
      maxDailyAppointments: 12,
      maxConcurrentAppointments: 1,
      preferredPetSizes: ["small", "medium"],
      skillLevel: "junior",
      canHandleMatted: false,
      canHandleAnxious: true,
      canHandleAggressive: false,
    },
  },
];

// Mock Stylist Availability
export const stylistAvailability: StylistAvailability[] = [
  // Jessica Martinez - Mon-Fri
  {
    id: "avail-001",
    stylistId: "stylist-001",
    stylistName: "Jessica Martinez",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },
  {
    id: "avail-002",
    stylistId: "stylist-001",
    stylistName: "Jessica Martinez",
    dayOfWeek: 2,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },
  {
    id: "avail-003",
    stylistId: "stylist-001",
    stylistName: "Jessica Martinez",
    dayOfWeek: 3,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },
  {
    id: "avail-004",
    stylistId: "stylist-001",
    stylistName: "Jessica Martinez",
    dayOfWeek: 4,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },
  {
    id: "avail-005",
    stylistId: "stylist-001",
    stylistName: "Jessica Martinez",
    dayOfWeek: 5,
    startTime: "08:00",
    endTime: "14:00",
    isAvailable: true,
  },

  // Amy Chen - Tue-Sat
  {
    id: "avail-006",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    dayOfWeek: 2,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
  },
  {
    id: "avail-007",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    dayOfWeek: 3,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
  },
  {
    id: "avail-008",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    dayOfWeek: 4,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
  },
  {
    id: "avail-009",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    dayOfWeek: 5,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
  },
  {
    id: "avail-010",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    dayOfWeek: 6,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },

  // Marcus Thompson - Mon, Wed, Thu, Sat
  {
    id: "avail-011",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    dayOfWeek: 1,
    startTime: "10:00",
    endTime: "18:00",
    isAvailable: true,
  },
  {
    id: "avail-012",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    dayOfWeek: 3,
    startTime: "10:00",
    endTime: "18:00",
    isAvailable: true,
  },
  {
    id: "avail-013",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    dayOfWeek: 4,
    startTime: "10:00",
    endTime: "18:00",
    isAvailable: true,
  },
  {
    id: "avail-014",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    dayOfWeek: 6,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },

  // Sophie Laurent - Mon-Thu
  {
    id: "avail-015",
    stylistId: "stylist-004",
    stylistName: "Sophie Laurent",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },
  {
    id: "avail-016",
    stylistId: "stylist-004",
    stylistName: "Sophie Laurent",
    dayOfWeek: 2,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },
  {
    id: "avail-017",
    stylistId: "stylist-004",
    stylistName: "Sophie Laurent",
    dayOfWeek: 3,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },
  {
    id: "avail-018",
    stylistId: "stylist-004",
    stylistName: "Sophie Laurent",
    dayOfWeek: 4,
    startTime: "08:00",
    endTime: "16:00",
    isAvailable: true,
  },

  // David Kim - on leave
];

// Mock Grooming Packages
export const groomingPackages: GroomingPackage[] = [
  {
    id: "groom-pkg-001",
    name: "Basic Bath",
    description:
      "Essential bath and dry service perfect for regular maintenance",
    basePrice: 35,
    duration: 60,
    sizePricing: {
      small: 30,
      medium: 35,
      large: 45,
      giant: 55,
    },
    includes: [
      "Shampoo & conditioner",
      "Towel and blow dry",
      "Brush out",
      "Nail trim",
      "Ear cleaning",
    ],
    isActive: true,
    purchaseCount: 342,
    createdAt: "2023-01-15",
    assignedStylistIds: [], // Available to all stylists
    requiresEvaluation: false,
    productUsage: [
      {
        productId: "prod-001",
        productName: "Oatmeal Soothing Shampoo",
        quantity: 0.1, // 10% of a bottle (16oz = ~473ml, so ~47ml)
        unit: "bottle",
        isOptional: false,
      },
      {
        productId: "prod-005",
        productName: "Conditioning Rinse",
        quantity: 0.08,
        unit: "bottle",
        isOptional: false,
      },
    ],
  },
  {
    id: "groom-pkg-002",
    name: "Full Groom",
    description: "Complete grooming experience with haircut and styling",
    basePrice: 65,
    duration: 120,
    sizePricing: {
      small: 55,
      medium: 65,
      large: 85,
      giant: 105,
    },
    includes: [
      "Bath with premium products",
      "Haircut and styling",
      "Nail trim & filing",
      "Ear cleaning",
      "Teeth brushing",
      "Cologne spritz",
      "Bandana or bow",
    ],
    isActive: true,
    isPopular: true,
    purchaseCount: 528,
    createdAt: "2023-01-15",
    assignedStylistIds: [], // Available to all stylists
    requiresEvaluation: false,
  },
  {
    id: "groom-pkg-003",
    name: "Spa Day Deluxe",
    description: "Ultimate pampering experience for your beloved pet",
    basePrice: 95,
    duration: 180,
    sizePricing: {
      small: 85,
      medium: 95,
      large: 120,
      giant: 150,
    },
    includes: [
      "Luxury bath with aromatherapy",
      "Professional haircut and styling",
      "Nail trim, filing & paw pad treatment",
      "Deep ear cleaning",
      "Teeth brushing & breath freshener",
      "Blueberry facial",
      "Paw balm treatment",
      "Cologne & accessories",
      "Photo session",
    ],
    isActive: true,
    purchaseCount: 189,
    createdAt: "2023-01-15",
    assignedStylistIds: ["stylist-001", "stylist-004"], // Only senior/master stylists
    requiresEvaluation: false,
  },
  {
    id: "groom-pkg-004",
    name: "Quick Tidy Up",
    description: "Fast touch-up between full grooms",
    basePrice: 25,
    duration: 30,
    sizePricing: {
      small: 20,
      medium: 25,
      large: 30,
      giant: 40,
    },
    includes: ["Sanitary trim", "Face & paw trim", "Nail trim", "Quick brush"],
    isActive: true,
    purchaseCount: 256,
    createdAt: "2023-03-01",
    assignedStylistIds: [], // Available to all stylists
    requiresEvaluation: false,
  },
  {
    id: "groom-pkg-005",
    name: "Puppy's First Groom",
    description: "Gentle introduction to grooming for puppies under 6 months",
    basePrice: 40,
    duration: 45,
    sizePricing: {
      small: 35,
      medium: 40,
      large: 45,
      giant: 50,
    },
    includes: [
      "Gentle bath",
      "Light trimming",
      "Nail clip",
      "Ear cleaning",
      "Positive reinforcement",
      "Treats included",
    ],
    isActive: true,
    purchaseCount: 134,
    createdAt: "2023-06-15",
    assignedStylistIds: [], // Available to all stylists
    requiresEvaluation: true, // Puppies may need evaluation
  },
  {
    id: "groom-pkg-006",
    name: "De-Shedding Treatment",
    description:
      "Specialized treatment to reduce shedding for double-coated breeds",
    basePrice: 55,
    duration: 90,
    sizePricing: {
      small: 45,
      medium: 55,
      large: 70,
      giant: 85,
    },
    includes: [
      "De-shedding shampoo & conditioner",
      "Undercoat removal",
      "High-velocity blow dry",
      "Thorough brush out",
      "Nail trim",
      "Ear cleaning",
    ],
    isActive: true,
    purchaseCount: 167,
    createdAt: "2023-04-20",
    assignedStylistIds: ["stylist-003"], // Specialized for large breeds
    requiresEvaluation: false,
  },
];

// Helper function to generate dates
const getDateString = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
};

// Mock Grooming Appointments
export const groomingAppointments: GroomingAppointment[] = [
  {
    id: "appt-001",
    date: getDateString(0),
    startTime: "09:00",
    endTime: "11:00",
    petId: 1,
    petName: "Buddy",
    petBreed: "Golden Retriever",
    petSize: "large",
    petWeight: 70,
    coatType: "long",
    petPhotoUrl: "/pets/buddy.jpg",
    ownerId: 15,
    ownerName: "John Smith",
    ownerPhone: "(514) 555-0101",
    ownerEmail: "john.smith@email.com",
    stylistId: "stylist-001",
    stylistName: "Jessica Martinez",
    packageId: "groom-pkg-002",
    packageName: "Full Groom",
    addOns: ["Teeth Brushing", "De-matting (per 15 min)"],
    basePrice: 85,
    priceAdjustments: [
      {
        id: "adj-001",
        amount: 25,
        reason: "matting-fee",
        description: "Severe matting on back and legs required extra 30 minutes",
        addedBy: "Jessica Martinez",
        addedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        customerNotified: true,
        notifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
    totalPrice: 110,
    status: "in-progress",
    checkInTime: new Date().toISOString(),
    checkOutTime: null,
    notes: "Regular client, prefers short cut for summer",
    specialInstructions: "Use hypoallergenic shampoo",
    allergies: ["Lavender scent"],
    lastGroomDate: getDateString(-42),
    createdAt: getDateString(-7),
    onlineBooking: true,
  },
  {
    id: "appt-002",
    date: getDateString(0),
    startTime: "10:00",
    endTime: "11:30",
    petId: 13,
    petName: "Bella",
    petBreed: "French Bulldog",
    petSize: "small",
    petWeight: 22,
    coatType: "short",
    petPhotoUrl: "/pets/bella.jpg",
    ownerId: 28,
    ownerName: "Emily Davis",
    ownerPhone: "(514) 555-0103",
    ownerEmail: "emily.davis@email.com",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    packageId: "groom-pkg-003",
    packageName: "Spa Day Deluxe",
    addOns: ["Photo Session"],
    basePrice: 100,
    priceAdjustments: [],
    totalPrice: 100,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "First spa day - take extra photos!",
    specialInstructions: "",
    allergies: [],
    lastGroomDate: getDateString(-28),
    createdAt: getDateString(-14),
    onlineBooking: true,
  },
  {
    id: "appt-003",
    date: getDateString(0),
    startTime: "13:00",
    endTime: "14:00",
    petId: 14,
    petName: "Charlie",
    petBreed: "Beagle",
    petSize: "medium",
    petWeight: 28,
    coatType: "short",
    ownerId: 29,
    ownerName: "Michael Brown",
    ownerPhone: "(514) 555-0104",
    ownerEmail: "michael.brown@email.com",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    packageId: "groom-pkg-001",
    packageName: "Basic Bath",
    addOns: ["Anal Gland Expression"],
    basePrice: 47,
    priceAdjustments: [],
    totalPrice: 47,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "",
    specialInstructions: "Sensitive ears - be gentle",
    allergies: [],
    createdAt: getDateString(-3),
    onlineBooking: false,
  },
  {
    id: "appt-004",
    date: getDateString(0),
    startTime: "14:00",
    endTime: "16:00",
    petId: 5,
    petName: "Luna",
    petBreed: "Standard Poodle",
    petSize: "large",
    petWeight: 55,
    coatType: "curly",
    petPhotoUrl: "/pets/luna.jpg",
    ownerId: 17,
    ownerName: "Lisa Wilson",
    ownerPhone: "(514) 555-0105",
    ownerEmail: "lisa.wilson@email.com",
    stylistId: "stylist-004",
    stylistName: "Sophie Laurent",
    packageId: "groom-pkg-002",
    packageName: "Full Groom",
    addOns: ["Blueberry Facial", "Bandana/Bow"],
    basePrice: 102,
    priceAdjustments: [],
    totalPrice: 102,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "Show cut - Continental style",
    specialInstructions: "Owner will bring show supplies",
    allergies: [],
    lastGroomDate: getDateString(-21),
    createdAt: getDateString(-10),
    onlineBooking: true,
  },
  {
    id: "appt-005",
    date: getDateString(1),
    startTime: "09:00",
    endTime: "10:30",
    petId: 3,
    petName: "Max",
    petBreed: "Labrador Retriever",
    petSize: "large",
    petWeight: 75,
    coatType: "double",
    petPhotoUrl: "/pets/max.jpg",
    ownerId: 16,
    ownerName: "Sarah Johnson",
    ownerPhone: "(514) 555-0102",
    ownerEmail: "sarah.johnson@email.com",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    packageId: "groom-pkg-006",
    packageName: "De-Shedding Treatment",
    addOns: [],
    basePrice: 70,
    priceAdjustments: [],
    totalPrice: 70,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "Seasonal shed - needs extra deshedding",
    specialInstructions: "",
    allergies: [],
    lastGroomDate: getDateString(-35),
    createdAt: getDateString(-5),
    onlineBooking: true,
  },
  {
    id: "appt-006",
    date: getDateString(1),
    startTime: "10:00",
    endTime: "10:45",
    petId: 20,
    petName: "Coco",
    petBreed: "Maltese",
    petSize: "small",
    petWeight: 8,
    coatType: "long",
    ownerId: 35,
    ownerName: "Rachel Green",
    ownerPhone: "(514) 555-0110",
    ownerEmail: "rachel.green@email.com",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    packageId: "groom-pkg-005",
    packageName: "Puppy's First Groom",
    addOns: ["Photo Session"],
    basePrice: 50,
    priceAdjustments: [],
    totalPrice: 50,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "4 month old puppy - first groom ever!",
    specialInstructions: "Take it slow, lots of breaks",
    allergies: [],
    createdAt: getDateString(-2),
    onlineBooking: true,
  },
  {
    id: "appt-007",
    date: getDateString(1),
    startTime: "11:00",
    endTime: "13:00",
    petId: 21,
    petName: "Duke",
    petBreed: "German Shepherd",
    petSize: "large",
    petWeight: 85,
    coatType: "double",
    ownerId: 36,
    ownerName: "Tom Anderson",
    ownerPhone: "(514) 555-0111",
    ownerEmail: "tom.anderson@email.com",
    stylistId: "stylist-001",
    stylistName: "Jessica Martinez",
    packageId: "groom-pkg-002",
    packageName: "Full Groom",
    addOns: ["Flea & Tick Treatment", "Nail Grinding"],
    basePrice: 108,
    priceAdjustments: [],
    totalPrice: 108,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "",
    specialInstructions: "Muzzle recommended for nail work",
    allergies: [],
    lastGroomDate: getDateString(-60),
    createdAt: getDateString(-4),
    onlineBooking: false,
  },
  {
    id: "appt-008",
    date: getDateString(2),
    startTime: "09:00",
    endTime: "12:00",
    petId: 22,
    petName: "Princess",
    petBreed: "Shih Tzu",
    petSize: "small",
    petWeight: 12,
    coatType: "long",
    ownerId: 37,
    ownerName: "Diana Ross",
    ownerPhone: "(514) 555-0112",
    ownerEmail: "diana.ross@email.com",
    stylistId: "stylist-004",
    stylistName: "Sophie Laurent",
    packageId: "groom-pkg-003",
    packageName: "Spa Day Deluxe",
    addOns: ["De-matting (per 15 min)", "De-matting (per 15 min)"],
    basePrice: 115,
    priceAdjustments: [],
    totalPrice: 115,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "Has some matting near ears",
    specialInstructions: "Owner wants to keep length if possible",
    allergies: [],
    lastGroomDate: getDateString(-56),
    createdAt: getDateString(-1),
    onlineBooking: true,
  },
  {
    id: "appt-009",
    date: getDateString(2),
    startTime: "10:00",
    endTime: "10:30",
    petId: 23,
    petName: "Rocky",
    petBreed: "Boxer",
    petSize: "large",
    petWeight: 65,
    coatType: "short",
    ownerId: 38,
    ownerName: "Mike Tyson",
    ownerPhone: "(514) 555-0113",
    ownerEmail: "mike.tyson@email.com",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    packageId: "groom-pkg-004",
    packageName: "Quick Tidy Up",
    addOns: [],
    basePrice: 30,
    priceAdjustments: [],
    totalPrice: 30,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "Quick bath and nails only",
    specialInstructions: "",
    allergies: [],
    lastGroomDate: getDateString(-14),
    createdAt: getDateString(0),
    onlineBooking: true,
  },
  {
    id: "appt-010",
    date: getDateString(-1),
    startTime: "09:00",
    endTime: "11:00",
    petId: 6,
    petName: "Daisy",
    petBreed: "Chihuahua",
    petSize: "small",
    petWeight: 5,
    coatType: "short",
    ownerId: 18,
    ownerName: "Robert Taylor",
    ownerPhone: "(514) 555-0106",
    ownerEmail: "robert.taylor@email.com",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    packageId: "groom-pkg-003",
    packageName: "Spa Day Deluxe",
    addOns: ["Photo Session"],
    basePrice: 100,
    priceAdjustments: [],
    totalPrice: 100,
    status: "completed",
    checkInTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    checkOutTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    notes: "Great session, Daisy loved the facial!",
    specialInstructions: "",
    allergies: [],
    lastGroomDate: getDateString(-29),
    createdAt: getDateString(-10),
    onlineBooking: true,
  },
  {
    id: "appt-011",
    date: getDateString(-1),
    startTime: "11:00",
    endTime: "12:00",
    petId: 7,
    petName: "Cooper",
    petBreed: "Australian Shepherd",
    petSize: "medium",
    petWeight: 50,
    coatType: "double",
    ownerId: 19,
    ownerName: "Jennifer White",
    ownerPhone: "(514) 555-0107",
    ownerEmail: "jennifer.white@email.com",
    stylistId: "stylist-001",
    stylistName: "Jessica Martinez",
    packageId: "groom-pkg-001",
    packageName: "Basic Bath",
    addOns: ["Nail Grinding"],
    basePrice: 43,
    priceAdjustments: [],
    totalPrice: 43,
    status: "completed",
    checkInTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    checkOutTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    notes: "",
    specialInstructions: "",
    allergies: [],
    createdAt: getDateString(-8),
    onlineBooking: false,
  },
  {
    id: "appt-012",
    date: getDateString(-1),
    startTime: "14:00",
    endTime: "15:00",
    petId: 8,
    petName: "Milo",
    petBreed: "Yorkshire Terrier",
    petSize: "small",
    petWeight: 7,
    coatType: "long",
    ownerId: 20,
    ownerName: "Amanda Clark",
    ownerPhone: "(514) 555-0108",
    ownerEmail: "amanda.clark@email.com",
    stylistId: "stylist-004",
    stylistName: "Sophie Laurent",
    packageId: "groom-pkg-002",
    packageName: "Full Groom",
    addOns: [],
    basePrice: 55,
    priceAdjustments: [],
    totalPrice: 55,
    status: "no-show",
    checkInTime: null,
    checkOutTime: null,
    notes: "Client did not show up, no call",
    specialInstructions: "",
    allergies: [],
    createdAt: getDateString(-7),
    onlineBooking: true,
  },
  {
    id: "appt-013",
    date: getDateString(3),
    startTime: "09:00",
    endTime: "11:00",
    petId: 24,
    petName: "Bear",
    petBreed: "Newfoundland",
    petSize: "giant",
    petWeight: 140,
    coatType: "double",
    ownerId: 39,
    ownerName: "Chris Evans",
    ownerPhone: "(514) 555-0114",
    ownerEmail: "chris.evans@email.com",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    packageId: "groom-pkg-006",
    packageName: "De-Shedding Treatment",
    addOns: ["Paw Balm Treatment"],
    basePrice: 98,
    priceAdjustments: [],
    totalPrice: 98,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "Giant breed, needs extra time",
    specialInstructions: "May need two groomers for handling",
    allergies: [],
    lastGroomDate: getDateString(-45),
    createdAt: getDateString(-3),
    onlineBooking: true,
  },
  {
    id: "appt-014",
    date: getDateString(3),
    startTime: "11:00",
    endTime: "12:00",
    petId: 25,
    petName: "Olive",
    petBreed: "Cavalier King Charles",
    petSize: "small",
    petWeight: 15,
    coatType: "medium",
    ownerId: 40,
    ownerName: "Emma Stone",
    ownerPhone: "(514) 555-0115",
    ownerEmail: "emma.stone@email.com",
    stylistId: "stylist-002",
    stylistName: "Amy Chen",
    packageId: "groom-pkg-001",
    packageName: "Basic Bath",
    addOns: ["Teeth Brushing", "Cologne Spritz"],
    basePrice: 45,
    priceAdjustments: [],
    totalPrice: 45,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "",
    specialInstructions: "Heart murmur - keep calm",
    allergies: [],
    lastGroomDate: getDateString(-30),
    createdAt: getDateString(-2),
    onlineBooking: true,
  },
  {
    id: "appt-015",
    date: getDateString(4),
    startTime: "09:00",
    endTime: "11:00",
    petId: 26,
    petName: "Zeus",
    petBreed: "Great Dane",
    petSize: "giant",
    petWeight: 150,
    coatType: "short",
    ownerId: 41,
    ownerName: "Thor Odinson",
    ownerPhone: "(514) 555-0116",
    ownerEmail: "thor.odinson@email.com",
    stylistId: "stylist-003",
    stylistName: "Marcus Thompson",
    packageId: "groom-pkg-002",
    packageName: "Full Groom",
    addOns: ["Nail Grinding"],
    basePrice: 113,
    priceAdjustments: [],
    totalPrice: 113,
    status: "scheduled",
    checkInTime: null,
    checkOutTime: null,
    notes: "Very gentle giant",
    specialInstructions: "",
    allergies: [],
    lastGroomDate: getDateString(-50),
    createdAt: getDateString(-1),
    onlineBooking: false,
  },
];

// Mock Grooming Products/Inventory
export const groomingProducts: GroomingProduct[] = [
  {
    id: "prod-001",
    name: "Oatmeal Soothing Shampoo",
    brand: "FurFresh",
    category: "shampoo",
    description:
      "Gentle oatmeal shampoo for sensitive skin, hypoallergenic formula",
    sku: "FF-SHMP-001",
    currentStock: 12,
    minStock: 5,
    maxStock: 25,
    unitPrice: 18.99,
    costPrice: 9.5,
    unit: "bottle (16oz)",
    usagePerGroom: 0.1,
    supplier: "PetPro Supplies",
    lastRestocked: getDateString(-15),
    expiryDate: getDateString(365),
    isActive: true,
  },
  {
    id: "prod-002",
    name: "Deep Clean Degreasing Shampoo",
    brand: "FurFresh",
    category: "shampoo",
    description: "Heavy-duty shampoo for removing oils and dirt",
    sku: "FF-SHMP-002",
    currentStock: 8,
    minStock: 4,
    maxStock: 20,
    unitPrice: 22.99,
    costPrice: 11.5,
    unit: "bottle (16oz)",
    usagePerGroom: 0.15,
    supplier: "PetPro Supplies",
    lastRestocked: getDateString(-20),
    expiryDate: getDateString(300),
    isActive: true,
  },
  {
    id: "prod-003",
    name: "Flea & Tick Medicated Shampoo",
    brand: "VetCare",
    category: "shampoo",
    description: "Medicated shampoo for flea and tick treatment",
    sku: "VC-SHMP-001",
    currentStock: 6,
    minStock: 3,
    maxStock: 15,
    unitPrice: 28.99,
    costPrice: 15.0,
    unit: "bottle (16oz)",
    usagePerGroom: 0.2,
    supplier: "VetCare Direct",
    lastRestocked: getDateString(-10),
    expiryDate: getDateString(180),
    isActive: true,
  },
  {
    id: "prod-004",
    name: "Silk & Shine Conditioner",
    brand: "FurFresh",
    category: "conditioner",
    description: "Luxurious conditioner for silky, tangle-free coats",
    sku: "FF-COND-001",
    currentStock: 15,
    minStock: 5,
    maxStock: 25,
    unitPrice: 16.99,
    costPrice: 8.5,
    unit: "bottle (16oz)",
    usagePerGroom: 0.1,
    supplier: "PetPro Supplies",
    lastRestocked: getDateString(-12),
    expiryDate: getDateString(400),
    isActive: true,
  },
  {
    id: "prod-005",
    name: "Detangling Spray",
    brand: "GroomPro",
    category: "conditioner",
    description: "Leave-in detangling spray for matted coats",
    sku: "GP-COND-001",
    currentStock: 10,
    minStock: 4,
    maxStock: 20,
    unitPrice: 14.99,
    costPrice: 7.5,
    unit: "bottle (12oz)",
    usagePerGroom: 0.05,
    supplier: "GroomPro Inc",
    lastRestocked: getDateString(-8),
    isActive: true,
  },
  {
    id: "prod-006",
    name: "Finishing Spray Cologne - Fresh Cotton",
    brand: "PawScents",
    category: "styling",
    description: "Fresh cotton scented finishing cologne",
    sku: "PS-COL-001",
    currentStock: 18,
    minStock: 6,
    maxStock: 30,
    unitPrice: 12.99,
    costPrice: 5.0,
    unit: "bottle (8oz)",
    usagePerGroom: 0.02,
    supplier: "PawScents Co",
    lastRestocked: getDateString(-5),
    isActive: true,
  },
  {
    id: "prod-007",
    name: "Finishing Spray Cologne - Baby Powder",
    brand: "PawScents",
    category: "styling",
    description: "Baby powder scented finishing cologne",
    sku: "PS-COL-002",
    currentStock: 14,
    minStock: 6,
    maxStock: 30,
    unitPrice: 12.99,
    costPrice: 5.0,
    unit: "bottle (8oz)",
    usagePerGroom: 0.02,
    supplier: "PawScents Co",
    lastRestocked: getDateString(-5),
    isActive: true,
  },
  {
    id: "prod-008",
    name: "Blueberry Facial Scrub",
    brand: "SpaTime",
    category: "health",
    description:
      "Gentle facial scrub with blueberry extract for tear stain removal",
    sku: "ST-FACE-001",
    currentStock: 7,
    minStock: 3,
    maxStock: 15,
    unitPrice: 24.99,
    costPrice: 12.0,
    unit: "jar (8oz)",
    usagePerGroom: 0.05,
    supplier: "SpaTime Pet",
    lastRestocked: getDateString(-18),
    expiryDate: getDateString(200),
    isActive: true,
  },
  {
    id: "prod-009",
    name: "Paw Balm - Healing Formula",
    brand: "SpaTime",
    category: "health",
    description: "Moisturizing balm for dry and cracked paw pads",
    sku: "ST-PAW-001",
    currentStock: 12,
    minStock: 5,
    maxStock: 25,
    unitPrice: 15.99,
    costPrice: 7.0,
    unit: "tin (4oz)",
    usagePerGroom: 0.03,
    supplier: "SpaTime Pet",
    lastRestocked: getDateString(-22),
    isActive: true,
  },
  {
    id: "prod-010",
    name: "Ear Cleaning Solution",
    brand: "VetCare",
    category: "health",
    description: "Gentle ear cleaning solution for routine maintenance",
    sku: "VC-EAR-001",
    currentStock: 9,
    minStock: 4,
    maxStock: 20,
    unitPrice: 18.99,
    costPrice: 9.0,
    unit: "bottle (8oz)",
    usagePerGroom: 0.02,
    supplier: "VetCare Direct",
    lastRestocked: getDateString(-14),
    expiryDate: getDateString(250),
    isActive: true,
  },
  {
    id: "prod-011",
    name: "Professional Slicker Brush - Medium",
    brand: "GroomPro",
    category: "tools",
    description: "Professional grade slicker brush for detangling",
    sku: "GP-TOOL-001",
    currentStock: 6,
    minStock: 2,
    maxStock: 10,
    unitPrice: 24.99,
    costPrice: 12.0,
    unit: "piece",
    usagePerGroom: 0,
    supplier: "GroomPro Inc",
    lastRestocked: getDateString(-60),
    isActive: true,
  },
  {
    id: "prod-012",
    name: "Nail Clipper - Large",
    brand: "GroomPro",
    category: "tools",
    description: "Heavy-duty nail clipper for large breeds",
    sku: "GP-TOOL-002",
    currentStock: 4,
    minStock: 2,
    maxStock: 8,
    unitPrice: 19.99,
    costPrice: 9.0,
    unit: "piece",
    usagePerGroom: 0,
    supplier: "GroomPro Inc",
    lastRestocked: getDateString(-45),
    isActive: true,
  },
  {
    id: "prod-013",
    name: "Styptic Powder",
    brand: "VetCare",
    category: "health",
    description: "Quick-stop powder for minor nail bleeding",
    sku: "VC-STYP-001",
    currentStock: 5,
    minStock: 2,
    maxStock: 10,
    unitPrice: 11.99,
    costPrice: 5.0,
    unit: "bottle (1oz)",
    usagePerGroom: 0.01,
    supplier: "VetCare Direct",
    lastRestocked: getDateString(-30),
    isActive: true,
  },
  {
    id: "prod-014",
    name: "Bandanas - Assorted Colors (Pack of 12)",
    brand: "PawStyle",
    category: "accessories",
    description: "Colorful bandanas for finishing touches",
    sku: "PST-ACC-001",
    currentStock: 3,
    minStock: 2,
    maxStock: 10,
    unitPrice: 15.99,
    costPrice: 6.0,
    unit: "pack",
    usagePerGroom: 0.08,
    supplier: "PawStyle Accessories",
    lastRestocked: getDateString(-25),
    isActive: true,
    notes: "Low stock - reorder soon",
  },
  {
    id: "prod-015",
    name: "Bows - Assorted Colors (Pack of 24)",
    brand: "PawStyle",
    category: "accessories",
    description: "Cute bows for finishing touches",
    sku: "PST-ACC-002",
    currentStock: 4,
    minStock: 2,
    maxStock: 10,
    unitPrice: 12.99,
    costPrice: 4.0,
    unit: "pack",
    usagePerGroom: 0.04,
    supplier: "PawStyle Accessories",
    lastRestocked: getDateString(-25),
    isActive: true,
  },
  {
    id: "prod-016",
    name: "Kennel Disinfectant Spray",
    brand: "CleanPro",
    category: "cleaning",
    description: "Hospital-grade disinfectant for grooming stations",
    sku: "CP-CLN-001",
    currentStock: 8,
    minStock: 4,
    maxStock: 16,
    unitPrice: 14.99,
    costPrice: 7.0,
    unit: "bottle (32oz)",
    usagePerGroom: 0.05,
    supplier: "CleanPro Solutions",
    lastRestocked: getDateString(-7),
    isActive: true,
  },
  {
    id: "prod-017",
    name: "Grooming Table Cleaner",
    brand: "CleanPro",
    category: "cleaning",
    description: "Quick-dry surface cleaner for grooming tables",
    sku: "CP-CLN-002",
    currentStock: 2,
    minStock: 3,
    maxStock: 12,
    unitPrice: 11.99,
    costPrice: 5.5,
    unit: "bottle (32oz)",
    usagePerGroom: 0.03,
    supplier: "CleanPro Solutions",
    lastRestocked: getDateString(-35),
    isActive: true,
    notes: "Below minimum stock - needs reorder!",
  },
];

// Mock Inventory Orders
export const inventoryOrders: InventoryOrder[] = [
  {
    id: "order-001",
    productId: "prod-017",
    productName: "Grooming Table Cleaner",
    quantity: 10,
    unitPrice: 11.99,
    totalPrice: 119.9,
    supplier: "CleanPro Solutions",
    status: "ordered",
    orderedAt: getDateString(-2),
    expectedDelivery: getDateString(3),
    orderedBy: "Jessica Martinez",
  },
  {
    id: "order-002",
    productId: "prod-014",
    productName: "Bandanas - Assorted Colors (Pack of 12)",
    quantity: 5,
    unitPrice: 15.99,
    totalPrice: 79.95,
    supplier: "PawStyle Accessories",
    status: "shipped",
    orderedAt: getDateString(-5),
    expectedDelivery: getDateString(1),
    orderedBy: "Amy Chen",
  },
  {
    id: "order-003",
    productId: "prod-001",
    productName: "Oatmeal Soothing Shampoo",
    quantity: 15,
    unitPrice: 18.99,
    totalPrice: 284.85,
    supplier: "PetPro Supplies",
    status: "received",
    orderedAt: getDateString(-20),
    expectedDelivery: getDateString(-16),
    receivedAt: getDateString(-15),
    orderedBy: "Sophie Laurent",
  },
];

// Helper functions
export function getActiveStylists(): Stylist[] {
  return stylists.filter((s) => s.status === "active");
}

export function getGroomingStats() {
  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = groomingAppointments.filter(
    (apt) => apt.date === today,
  );

  return {
    todayTotal: todayAppointments.length,
    todayCompleted: todayAppointments.filter(
      (apt) => apt.status === "completed",
    ).length,
    todayInProgress: todayAppointments.filter(
      (apt) => apt.status === "in-progress",
    ).length,
    todayScheduled: todayAppointments.filter(
      (apt) => apt.status === "scheduled",
    ).length,
    todayRevenue: todayAppointments
      .filter(
        (apt) => apt.status === "completed" || apt.status === "in-progress",
      )
      .reduce((sum, apt) => sum + apt.totalPrice, 0),
    activeStylists: stylists.filter((s) => s.status === "active").length,
    totalPackagesSold: groomingPackages.reduce(
      (sum, pkg) => sum + pkg.purchaseCount,
      0,
    ),
  };
}

// Inventory Helper Functions
export function getLowStockProducts(): GroomingProduct[] {
  return groomingProducts.filter(
    (p) => p.isActive && p.currentStock <= p.minStock,
  );
}

export function getInventoryStats() {
  const products = groomingProducts.filter((p) => p.isActive);
  const lowStock = products.filter((p) => p.currentStock <= p.minStock);
  const outOfStock = products.filter((p) => p.currentStock === 0);
  const totalValue = products.reduce(
    (sum, p) => sum + p.currentStock * p.costPrice,
    0,
  );
  const retailValue = products.reduce(
    (sum, p) => sum + p.currentStock * p.unitPrice,
    0,
  );

  return {
    totalProducts: products.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    totalInventoryValue: totalValue,
    totalRetailValue: retailValue,
    pendingOrders: inventoryOrders.filter(
      (o) => o.status === "ordered" || o.status === "shipped",
    ).length,
    categories: {
      shampoo: products.filter((p) => p.category === "shampoo").length,
      conditioner: products.filter((p) => p.category === "conditioner").length,
      styling: products.filter((p) => p.category === "styling").length,
      tools: products.filter((p) => p.category === "tools").length,
      accessories: products.filter((p) => p.category === "accessories").length,
      health: products.filter((p) => p.category === "health").length,
      cleaning: products.filter((p) => p.category === "cleaning").length,
    },
  };
}
