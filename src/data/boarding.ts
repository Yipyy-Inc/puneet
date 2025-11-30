// Boarding module mock data

export type PetSize = "small" | "medium" | "large" | "giant";
export type AppetiteStatus = "ate-all" | "left-some" | "refused";
export type BoardingStatus = "checked-in" | "checked-out" | "scheduled" | "cancelled";

export interface BoardingGuest {
  [key: string]: unknown;
  id: string;
  petId: number;
  petName: string;
  petBreed: string;
  petSize: PetSize;
  petWeight: number;
  petColor: string;
  petPhotoUrl?: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  emergencyVetContact: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  kennelId: string;
  kennelName: string;
  status: BoardingStatus;
  packageType: string;
  totalNights: number;
  nightlyRate: number;
  discountApplied: number;
  peakSurcharge: number;
  totalPrice: number;
  allergies: string[];
  feedingInstructions: string;
  foodBrand: string;
  feedingTimes: string[];
  feedingAmount: string;
  medications: MedicationSchedule[];
  notes: string;
  createdAt: string;
}

export interface BoardingRate {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  basePrice: number;
  isActive: boolean;
  sizePricing: {
    small: number;
    medium: number;
    large: number;
    giant: number;
  };
}

export interface MultiNightDiscount {
  [key: string]: unknown;
  id: string;
  name: string;
  minNights: number;
  maxNights: number | null;
  discountPercent: number;
  isActive: boolean;
}

export interface PeakSurcharge {
  [key: string]: unknown;
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  surchargePercent: number;
  isActive: boolean;
}

export interface MedicationSchedule {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  times: string[];
  instructions: string;
  requiresPhotoProof: boolean;
}

export interface MedicationLog {
  id: string;
  guestId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  givenTime: string;
  givenBy: string;
  givenByInitials: string;
  dosage: string;
  photoProofUrl?: string;
  notes: string;
}

export interface FeedingLog {
  id: string;
  guestId: string;
  scheduledTime: string;
  actualTime: string;
  foodType: string;
  amount: string;
  appetiteStatus: AppetiteStatus;
  fedBy: string;
  fedByInitials: string;
  notes: string;
}

export interface PottyLog {
  id: string;
  guestId: string;
  time: string;
  type: "pee" | "poop" | "both";
  location: "outdoor" | "indoor";
  hadAccident: boolean;
  notes: string;
  staffInitials: string;
}

export interface WalkLog {
  id: string;
  guestId: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  staffInitials: string;
  notes: string;
}

export interface PlaytimeLog {
  id: string;
  guestId: string;
  startTime: string;
  endTime: string;
  type: "group" | "solo";
  notes: string;
  staffInitials: string;
}

export interface KennelCleanLog {
  id: string;
  kennelId: string;
  guestId: string;
  cleanedAt: string;
  cleanedBy: string;
  cleanedByInitials: string;
  deepClean: boolean;
  blocked: boolean;
  blockReason?: string;
  notes: string;
}

export interface DailyCareSheet {
  id: string;
  guestId: string;
  petName: string;
  date: string;
  feedings: FeedingLog[];
  medications: MedicationLog[];
  pottyBreaks: PottyLog[];
  walks: WalkLog[];
  playtime: PlaytimeLog[];
  kennelCleans: KennelCleanLog[];
  generalNotes: string;
  staffOnDuty: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KennelCardData {
  id: string;
  guestId: string;
  petName: string;
  petBreed: string;
  petSex: string;
  petWeight: number;
  petColor: string;
  petPhotoUrl?: string;
  ownerNames: string;
  primaryPhone: string;
  checkInDate: string;
  checkOutDate: string;
  allergies: string[];
  medications: { name: string; schedule: string }[];
  feedingInstructions: string;
  foodBrand: string;
  feedingAmount: string;
  feedingTimes: string[];
  emergencyVetContact: string;
  qrCodeUrl: string;
  generatedAt: string;
  printedAt?: string;
}

// Mock boarding rates
export const boardingRates: BoardingRate[] = [
  {
    id: "rate-001",
    name: "Standard Kennel",
    description: "Comfortable private kennel with bedding, 2 meals daily, and outdoor time.",
    basePrice: 45,
    isActive: true,
    sizePricing: {
      small: 35,
      medium: 45,
      large: 55,
      giant: 65,
    },
  },
  {
    id: "rate-002",
    name: "Premium Suite",
    description: "Spacious suite with elevated bed, 3 meals daily, extra playtime, and webcam access.",
    basePrice: 65,
    isActive: true,
    sizePricing: {
      small: 55,
      medium: 65,
      large: 75,
      giant: 85,
    },
  },
  {
    id: "rate-003",
    name: "Luxury Suite",
    description: "Our best accommodation with private play area, gourmet meals, and 24/7 webcam.",
    basePrice: 95,
    isActive: true,
    sizePricing: {
      small: 85,
      medium: 95,
      large: 110,
      giant: 125,
    },
  },
];

// Mock multi-night discounts
export const multiNightDiscounts: MultiNightDiscount[] = [
  {
    id: "discount-001",
    name: "3-Night Stay",
    minNights: 3,
    maxNights: 6,
    discountPercent: 5,
    isActive: true,
  },
  {
    id: "discount-002",
    name: "Week Stay",
    minNights: 7,
    maxNights: 13,
    discountPercent: 10,
    isActive: true,
  },
  {
    id: "discount-003",
    name: "Extended Stay",
    minNights: 14,
    maxNights: null,
    discountPercent: 15,
    isActive: true,
  },
];

// Mock peak surcharges
export const peakSurcharges: PeakSurcharge[] = [
  {
    id: "peak-001",
    name: "Christmas & New Year",
    startDate: "2024-12-20",
    endDate: "2025-01-05",
    surchargePercent: 25,
    isActive: true,
  },
  {
    id: "peak-002",
    name: "Spring Break",
    startDate: "2025-03-01",
    endDate: "2025-03-15",
    surchargePercent: 15,
    isActive: true,
  },
  {
    id: "peak-003",
    name: "Summer Peak",
    startDate: "2025-07-01",
    endDate: "2025-08-31",
    surchargePercent: 20,
    isActive: true,
  },
  {
    id: "peak-004",
    name: "Thanksgiving",
    startDate: "2024-11-25",
    endDate: "2024-12-01",
    surchargePercent: 20,
    isActive: true,
  },
];

// Mock boarding guests
export const boardingGuests: BoardingGuest[] = [
  {
    id: "bg-001",
    petId: 1,
    petName: "Buddy",
    petBreed: "Golden Retriever",
    petSize: "large",
    petWeight: 70,
    petColor: "Golden",
    petPhotoUrl: "/pets/buddy.jpg",
    ownerId: 15,
    ownerName: "John Smith",
    ownerPhone: "(514) 555-0101",
    emergencyVetContact: "Dr. Wilson - (514) 555-9999",
    checkInDate: "2024-03-08T14:00:00",
    checkOutDate: "2024-03-15T11:00:00",
    actualCheckIn: "2024-03-08T14:15:00",
    kennelId: "K-12",
    kennelName: "Kennel 12 - Premium",
    status: "checked-in",
    packageType: "Premium Suite",
    totalNights: 7,
    nightlyRate: 75,
    discountApplied: 10,
    peakSurcharge: 0,
    totalPrice: 472.5,
    allergies: ["Chicken"],
    feedingInstructions: "1.5 cups morning, 1.5 cups evening. Add warm water.",
    foodBrand: "Blue Buffalo",
    feedingTimes: ["07:30", "18:00"],
    feedingAmount: "1.5 cups",
    medications: [
      {
        id: "med-001",
        medicationName: "Apoquel",
        dosage: "16mg",
        frequency: "Once daily",
        times: ["08:00"],
        instructions: "Give with food",
        requiresPhotoProof: true,
      },
    ],
    notes: "Very friendly, loves fetch. Needs extra blanket at night.",
    createdAt: "2024-03-01T10:00:00",
  },
  {
    id: "bg-002",
    petId: 3,
    petName: "Max",
    petBreed: "Labrador Retriever",
    petSize: "large",
    petWeight: 80,
    petColor: "Black",
    petPhotoUrl: "/pets/max.jpg",
    ownerId: 16,
    ownerName: "Sarah Johnson",
    ownerPhone: "(514) 555-0102",
    emergencyVetContact: "Dr. Thompson - (514) 555-8888",
    checkInDate: "2024-03-09T14:00:00",
    checkOutDate: "2024-03-12T11:00:00",
    actualCheckIn: "2024-03-09T13:45:00",
    kennelId: "K-08",
    kennelName: "Kennel 8 - Standard",
    status: "checked-in",
    packageType: "Standard Kennel",
    totalNights: 3,
    nightlyRate: 55,
    discountApplied: 5,
    peakSurcharge: 0,
    totalPrice: 156.75,
    allergies: [],
    feedingInstructions: "2 cups twice daily",
    foodBrand: "Purina Pro Plan",
    feedingTimes: ["07:00", "17:30"],
    feedingAmount: "2 cups",
    medications: [],
    notes: "Plays well with other dogs. Can join group play.",
    createdAt: "2024-03-05T14:30:00",
  },
  {
    id: "bg-003",
    petId: 13,
    petName: "Bella",
    petBreed: "French Bulldog",
    petSize: "small",
    petWeight: 25,
    petColor: "Brindle",
    petPhotoUrl: "/pets/bella.jpg",
    ownerId: 28,
    ownerName: "Emily Davis",
    ownerPhone: "(514) 555-0103",
    emergencyVetContact: "Dr. Garcia - (514) 555-7777",
    checkInDate: "2024-03-10T14:00:00",
    checkOutDate: "2024-03-17T11:00:00",
    actualCheckIn: "2024-03-10T14:30:00",
    kennelId: "K-03",
    kennelName: "Kennel 3 - Luxury",
    status: "checked-in",
    packageType: "Luxury Suite",
    totalNights: 7,
    nightlyRate: 85,
    discountApplied: 10,
    peakSurcharge: 0,
    totalPrice: 535.5,
    allergies: ["Grain", "Beef"],
    feedingInstructions: "3/4 cup morning and evening. Grain-free only!",
    foodBrand: "Orijen",
    feedingTimes: ["08:00", "18:30"],
    feedingAmount: "3/4 cup",
    medications: [
      {
        id: "med-002",
        medicationName: "Benadryl",
        dosage: "25mg",
        frequency: "As needed",
        times: [],
        instructions: "Only if showing allergy symptoms",
        requiresPhotoProof: false,
      },
    ],
    notes: "Sensitive stomach. Keep away from brachycephalic heat issues.",
    createdAt: "2024-03-02T09:00:00",
  },
  // Upcoming arrival
  {
    id: "bg-004",
    petId: 14,
    petName: "Charlie",
    petBreed: "Beagle",
    petSize: "medium",
    petWeight: 30,
    petColor: "Tricolor",
    petPhotoUrl: "/pets/charlie.jpg",
    ownerId: 29,
    ownerName: "Michael Brown",
    ownerPhone: "(514) 555-0104",
    emergencyVetContact: "Dr. Wilson - (514) 555-9999",
    checkInDate: "2024-03-11T14:00:00",
    checkOutDate: "2024-03-14T11:00:00",
    kennelId: "K-05",
    kennelName: "Kennel 5 - Standard",
    status: "scheduled",
    packageType: "Standard Kennel",
    totalNights: 3,
    nightlyRate: 45,
    discountApplied: 5,
    peakSurcharge: 0,
    totalPrice: 128.25,
    allergies: [],
    feedingInstructions: "1 cup twice daily. Loves treats!",
    foodBrand: "Hill's Science Diet",
    feedingTimes: ["07:30", "18:00"],
    feedingAmount: "1 cup",
    medications: [],
    notes: "Very vocal, may bark. Food motivated.",
    createdAt: "2024-03-08T11:00:00",
  },
  // Departing today
  {
    id: "bg-005",
    petId: 5,
    petName: "Rocky",
    petBreed: "Poodle",
    petSize: "medium",
    petWeight: 45,
    petColor: "White",
    petPhotoUrl: "/pets/rocky.jpg",
    ownerId: 17,
    ownerName: "Lisa Wilson",
    ownerPhone: "(514) 555-0105",
    emergencyVetContact: "Dr. Thompson - (514) 555-8888",
    checkInDate: "2024-03-06T14:00:00",
    checkOutDate: "2024-03-10T11:00:00",
    actualCheckIn: "2024-03-06T14:00:00",
    kennelId: "K-10",
    kennelName: "Kennel 10 - Premium",
    status: "checked-in",
    packageType: "Premium Suite",
    totalNights: 4,
    nightlyRate: 65,
    discountApplied: 5,
    peakSurcharge: 0,
    totalPrice: 247,
    allergies: [],
    feedingInstructions: "1 cup morning, 1 cup evening",
    foodBrand: "Royal Canin",
    feedingTimes: ["08:00", "17:00"],
    feedingAmount: "1 cup",
    medications: [],
    notes: "Grooming scheduled for checkout day.",
    createdAt: "2024-03-02T16:00:00",
  },
  // Completed stay
  {
    id: "bg-006",
    petId: 6,
    petName: "Daisy",
    petBreed: "Chihuahua",
    petSize: "small",
    petWeight: 6,
    petColor: "Tan",
    petPhotoUrl: "/pets/daisy.jpg",
    ownerId: 18,
    ownerName: "Robert Taylor",
    ownerPhone: "(514) 555-0106",
    emergencyVetContact: "Dr. Garcia - (514) 555-7777",
    checkInDate: "2024-03-01T14:00:00",
    checkOutDate: "2024-03-05T11:00:00",
    actualCheckIn: "2024-03-01T14:10:00",
    actualCheckOut: "2024-03-05T10:45:00",
    kennelId: "K-02",
    kennelName: "Kennel 2 - Standard",
    status: "checked-out",
    packageType: "Standard Kennel",
    totalNights: 4,
    nightlyRate: 35,
    discountApplied: 5,
    peakSurcharge: 0,
    totalPrice: 133,
    allergies: [],
    feedingInstructions: "1/4 cup morning and evening",
    foodBrand: "Wellness Core",
    feedingTimes: ["08:00", "18:00"],
    feedingAmount: "1/4 cup",
    medications: [],
    notes: "Needs extra warmth. Provide heating pad.",
    createdAt: "2024-02-25T12:00:00",
  },
];

// Mock daily care sheets
export const dailyCareSheets: DailyCareSheet[] = [
  {
    id: "dcs-001",
    guestId: "bg-001",
    petName: "Buddy",
    date: "2024-03-10",
    feedings: [
      {
        id: "feed-001",
        guestId: "bg-001",
        scheduledTime: "07:30",
        actualTime: "07:35",
        foodType: "Blue Buffalo",
        amount: "1.5 cups",
        appetiteStatus: "ate-all",
        fedBy: "Sarah Johnson",
        fedByInitials: "SJ",
        notes: "Ate quickly, seemed very hungry",
      },
      {
        id: "feed-002",
        guestId: "bg-001",
        scheduledTime: "18:00",
        actualTime: "18:05",
        foodType: "Blue Buffalo",
        amount: "1.5 cups",
        appetiteStatus: "ate-all",
        fedBy: "Mike Davis",
        fedByInitials: "MD",
        notes: "",
      },
    ],
    medications: [
      {
        id: "medlog-001",
        guestId: "bg-001",
        medicationId: "med-001",
        medicationName: "Apoquel",
        scheduledTime: "08:00",
        givenTime: "08:05",
        givenBy: "Sarah Johnson",
        givenByInitials: "SJ",
        dosage: "16mg",
        photoProofUrl: "/medication-proofs/medlog-001.jpg",
        notes: "Given with breakfast",
      },
    ],
    pottyBreaks: [
      {
        id: "potty-001",
        guestId: "bg-001",
        time: "07:00",
        type: "both",
        location: "outdoor",
        hadAccident: false,
        notes: "",
        staffInitials: "SJ",
      },
      {
        id: "potty-002",
        guestId: "bg-001",
        time: "12:00",
        type: "pee",
        location: "outdoor",
        hadAccident: false,
        notes: "",
        staffInitials: "MD",
      },
      {
        id: "potty-003",
        guestId: "bg-001",
        time: "17:00",
        type: "both",
        location: "outdoor",
        hadAccident: false,
        notes: "",
        staffInitials: "MD",
      },
    ],
    walks: [
      {
        id: "walk-001",
        guestId: "bg-001",
        startTime: "09:00",
        endTime: "09:20",
        duration: 20,
        staffInitials: "SJ",
        notes: "Enjoyed sniffing around the yard",
      },
      {
        id: "walk-002",
        guestId: "bg-001",
        startTime: "15:00",
        endTime: "15:25",
        duration: 25,
        staffInitials: "MD",
        notes: "",
      },
    ],
    playtime: [
      {
        id: "play-001",
        guestId: "bg-001",
        startTime: "10:00",
        endTime: "10:45",
        type: "group",
        notes: "Played well with Max and other large dogs",
        staffInitials: "SJ",
      },
      {
        id: "play-002",
        guestId: "bg-001",
        startTime: "14:00",
        endTime: "14:30",
        type: "solo",
        notes: "Fetch session, very happy!",
        staffInitials: "MD",
      },
    ],
    kennelCleans: [
      {
        id: "clean-001",
        kennelId: "K-12",
        guestId: "bg-001",
        cleanedAt: "2024-03-10T08:30:00",
        cleanedBy: "Tom Wilson",
        cleanedByInitials: "TW",
        deepClean: false,
        blocked: false,
        notes: "",
      },
      {
        id: "clean-002",
        kennelId: "K-12",
        guestId: "bg-001",
        cleanedAt: "2024-03-10T16:00:00",
        cleanedBy: "Emily Brown",
        cleanedByInitials: "EB",
        deepClean: false,
        blocked: false,
        notes: "",
      },
    ],
    generalNotes: "Buddy had a great day! Very happy and playful.",
    staffOnDuty: ["Sarah Johnson", "Mike Davis", "Tom Wilson", "Emily Brown"],
    createdAt: "2024-03-10T06:00:00",
    updatedAt: "2024-03-10T18:30:00",
  },
];

// Mock kennel cards
export const kennelCards: KennelCardData[] = [
  {
    id: "kc-001",
    guestId: "bg-001",
    petName: "Buddy",
    petBreed: "Golden Retriever",
    petSex: "Male (Neutered)",
    petWeight: 70,
    petColor: "Golden",
    petPhotoUrl: "/pets/buddy.jpg",
    ownerNames: "John Smith",
    primaryPhone: "(514) 555-0101",
    checkInDate: "2024-03-08",
    checkOutDate: "2024-03-15",
    allergies: ["Chicken"],
    medications: [{ name: "Apoquel 16mg", schedule: "Daily @ 8:00 AM" }],
    feedingInstructions: "Add warm water to kibble",
    foodBrand: "Blue Buffalo",
    feedingAmount: "1.5 cups",
    feedingTimes: ["07:30 AM", "6:00 PM"],
    emergencyVetContact: "Dr. Wilson - (514) 555-9999",
    qrCodeUrl: "/qr-codes/bg-001.png",
    generatedAt: "2024-03-08T14:15:00",
    printedAt: "2024-03-08T14:20:00",
  },
];

// Boarding capacity
export const boardingCapacity = {
  total: 30,
  standard: 15,
  premium: 10,
  luxury: 5,
};

// Operating times
export const boardingOperatingTimes = {
  checkInStart: "14:00",
  checkInEnd: "18:00",
  checkOutStart: "08:00",
  checkOutEnd: "11:00",
};

// Helper functions
export function getCurrentGuests(): BoardingGuest[] {
  return boardingGuests.filter((g) => g.status === "checked-in");
}

export function getTodayArrivals(): BoardingGuest[] {
  const today = new Date().toISOString().split("T")[0];
  return boardingGuests.filter((g) => {
    const checkInDate = g.checkInDate.split("T")[0];
    return checkInDate === today && g.status === "scheduled";
  });
}

export function getTodayDepartures(): BoardingGuest[] {
  const today = new Date().toISOString().split("T")[0];
  return boardingGuests.filter((g) => {
    const checkOutDate = g.checkOutDate.split("T")[0];
    return checkOutDate === today && g.status === "checked-in";
  });
}

export function getUpcomingArrivals(days: number = 7): BoardingGuest[] {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return boardingGuests.filter((g) => {
    const checkInDate = new Date(g.checkInDate);
    return checkInDate > today && checkInDate <= futureDate && g.status === "scheduled";
  });
}

export function calculateBoardingPrice(
  nightlyRate: number,
  nights: number,
  discountPercent: number,
  surchargePercent: number
): number {
  const baseTotal = nightlyRate * nights;
  const discount = baseTotal * (discountPercent / 100);
  const surcharge = baseTotal * (surchargePercent / 100);
  return baseTotal - discount + surcharge;
}

export function getApplicableDiscount(nights: number): MultiNightDiscount | null {
  return multiNightDiscounts.find((d) => {
    if (!d.isActive) return false;
    if (nights < d.minNights) return false;
    if (d.maxNights !== null && nights > d.maxNights) return false;
    return true;
  }) || null;
}

export function getApplicableSurcharge(checkInDate: string, checkOutDate: string): PeakSurcharge | null {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  return peakSurcharges.find((s) => {
    if (!s.isActive) return false;
    const peakStart = new Date(s.startDate);
    const peakEnd = new Date(s.endDate);
    // Check if stay overlaps with peak period
    return checkIn <= peakEnd && checkOut >= peakStart;
  }) || null;
}

export function getGuestCareSheet(guestId: string, date: string): DailyCareSheet | undefined {
  return dailyCareSheets.find((cs) => cs.guestId === guestId && cs.date === date);
}

export function getKennelCard(guestId: string): KennelCardData | undefined {
  return kennelCards.find((kc) => kc.guestId === guestId);
}

export function getOccupancyStats(): { current: number; percentage: number; byType: Record<string, number> } {
  const currentGuests = getCurrentGuests();
  const current = currentGuests.length;
  const percentage = Math.round((current / boardingCapacity.total) * 100);

  const byType = {
    standard: currentGuests.filter((g) => g.packageType === "Standard Kennel").length,
    premium: currentGuests.filter((g) => g.packageType === "Premium Suite").length,
    luxury: currentGuests.filter((g) => g.packageType === "Luxury Suite").length,
  };

  return { current, percentage, byType };
}
