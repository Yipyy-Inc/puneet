// Daycare mock data

export interface DaycareCheckIn {
  [key: string]: unknown;
  id: string;
  petId: number;
  petName: string;
  petBreed: string;
  petSize: "small" | "medium" | "large" | "giant";
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  checkInTime: string;
  checkOutTime: string | null;
  scheduledCheckOut: string;
  rateType: "hourly" | "half-day" | "full-day";
  status: "checked-in" | "checked-out";
  notes: string;
  playGroup: string | null;
  photoUrl?: string;
}

export interface DaycareRate {
  [key: string]: unknown;
  id: string;
  name: string;
  type: "hourly" | "half-day" | "full-day";
  basePrice: number;
  description: string;
  durationHours: number;
  isActive: boolean;
  sizePricing: {
    small: number;
    medium: number;
    large: number;
    giant: number;
  };
}

export interface DaycarePackage {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  rateType: "hourly" | "half-day" | "full-day";
  quantity: number;
  price: number;
  savings: number;
  validityDays: number;
  isActive: boolean;
  popular?: boolean;
}

export interface ReportCardActivity {
  time: string;
  activity: string;
  notes?: string;
}

export interface ReportCardMeal {
  time: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  foodType: string;
  amount: string;
  eaten: "all" | "most" | "some" | "none";
}

export interface DaycareReportCard {
  [key: string]: unknown;
  id: string;
  checkInId: string;
  petId: number;
  petName: string;
  date: string;
  overallMood: "excellent" | "good" | "fair" | "poor";
  energyLevel: "high" | "medium" | "low";
  activities: ReportCardActivity[];
  meals: ReportCardMeal[];
  photos: string[];
  notes: string;
  staffName: string;
  sentToOwner: boolean;
  sentAt: string | null;
}

export const daycareCheckIns: DaycareCheckIn[] = [
  {
    id: "dc-001",
    petId: 1,
    petName: "Buddy",
    petBreed: "Golden Retriever",
    petSize: "large",
    ownerId: 15,
    ownerName: "John Smith",
    ownerPhone: "(514) 555-0101",
    checkInTime: "2024-03-10T07:30:00",
    checkOutTime: null,
    scheduledCheckOut: "2024-03-10T17:00:00",
    rateType: "full-day",
    status: "checked-in",
    notes: "Loves to play fetch. Gets along well with other dogs.",
    playGroup: "Large Dogs",
    photoUrl: "/pets/buddy.jpg",
  },
  {
    id: "dc-002",
    petId: 3,
    petName: "Max",
    petBreed: "Labrador Retriever",
    petSize: "large",
    ownerId: 16,
    ownerName: "Sarah Johnson",
    ownerPhone: "(514) 555-0102",
    checkInTime: "2024-03-10T08:00:00",
    checkOutTime: null,
    scheduledCheckOut: "2024-03-10T17:00:00",
    rateType: "full-day",
    status: "checked-in",
    notes: "Needs medication at noon. Pill in bag.",
    playGroup: "Large Dogs",
    photoUrl: "/pets/max.jpg",
  },
  {
    id: "dc-003",
    petId: 13,
    petName: "Bella",
    petBreed: "French Bulldog",
    petSize: "small",
    ownerId: 28,
    ownerName: "Emily Davis",
    ownerPhone: "(514) 555-0103",
    checkInTime: "2024-03-10T08:30:00",
    checkOutTime: null,
    scheduledCheckOut: "2024-03-10T13:00:00",
    rateType: "half-day",
    status: "checked-in",
    notes: "First time at daycare. May be shy initially.",
    playGroup: "Small Dogs",
    photoUrl: "/pets/bella.jpg",
  },
  {
    id: "dc-004",
    petId: 14,
    petName: "Charlie",
    petBreed: "Beagle",
    petSize: "medium",
    ownerId: 29,
    ownerName: "Michael Brown",
    ownerPhone: "(514) 555-0104",
    checkInTime: "2024-03-10T09:00:00",
    checkOutTime: null,
    scheduledCheckOut: "2024-03-10T17:00:00",
    rateType: "full-day",
    status: "checked-in",
    notes: "Very social and playful.",
    playGroup: "Medium Dogs",
    photoUrl: "/pets/charlie.jpg",
  },
  {
    id: "dc-005",
    petId: 2,
    petName: "Luna",
    petBreed: "Husky",
    petSize: "large",
    ownerId: 15,
    ownerName: "John Smith",
    ownerPhone: "(514) 555-0101",
    checkInTime: "2024-03-10T07:30:00",
    checkOutTime: null,
    scheduledCheckOut: "2024-03-10T17:00:00",
    rateType: "full-day",
    status: "checked-in",
    notes: "Buddy's sister. Keep them together if possible.",
    playGroup: "Large Dogs",
    photoUrl: "/pets/luna.jpg",
  },
  // Checked out pets from earlier today
  {
    id: "dc-006",
    petId: 5,
    petName: "Rocky",
    petBreed: "Poodle",
    petSize: "medium",
    ownerId: 17,
    ownerName: "Lisa Wilson",
    ownerPhone: "(514) 555-0105",
    checkInTime: "2024-03-10T07:00:00",
    checkOutTime: "2024-03-10T11:00:00",
    scheduledCheckOut: "2024-03-10T11:00:00",
    rateType: "hourly",
    status: "checked-out",
    notes: "Quick morning session.",
    playGroup: "Medium Dogs",
    photoUrl: "/pets/rocky.jpg",
  },
  {
    id: "dc-007",
    petId: 6,
    petName: "Daisy",
    petBreed: "Chihuahua",
    petSize: "small",
    ownerId: 18,
    ownerName: "Robert Taylor",
    ownerPhone: "(514) 555-0106",
    checkInTime: "2024-03-10T08:00:00",
    checkOutTime: "2024-03-10T12:00:00",
    scheduledCheckOut: "2024-03-10T12:30:00",
    rateType: "half-day",
    status: "checked-out",
    notes: "Picked up early.",
    playGroup: "Small Dogs",
    photoUrl: "/pets/daisy.jpg",
  },
];

export const daycareRates: DaycareRate[] = [
  {
    id: "rate-001",
    name: "Hourly Rate",
    type: "hourly",
    basePrice: 8,
    description: "Pay by the hour for flexible daycare. Minimum 2 hours.",
    durationHours: 1,
    isActive: true,
    sizePricing: {
      small: 7,
      medium: 8,
      large: 9,
      giant: 10,
    },
  },
  {
    id: "rate-002",
    name: "Half-Day Rate",
    type: "half-day",
    basePrice: 25,
    description: "Up to 5 hours of supervised play and care.",
    durationHours: 5,
    isActive: true,
    sizePricing: {
      small: 22,
      medium: 25,
      large: 28,
      giant: 32,
    },
  },
  {
    id: "rate-003",
    name: "Full-Day Rate",
    type: "full-day",
    basePrice: 40,
    description:
      "Full day of fun from opening to closing. Includes lunch and rest time.",
    durationHours: 10,
    isActive: true,
    sizePricing: {
      small: 35,
      medium: 40,
      large: 45,
      giant: 52,
    },
  },
];

export const daycarePackages: DaycarePackage[] = [
  {
    id: "pkg-001",
    name: "5-Day Pass",
    description: "5 full days of daycare. Use within 60 days of purchase.",
    rateType: "full-day",
    quantity: 5,
    price: 175,
    savings: 25,
    validityDays: 60,
    isActive: true,
    popular: true,
  },
  {
    id: "pkg-002",
    name: "10-Day Pass",
    description: "10 full days of daycare. Best value! Use within 90 days.",
    rateType: "full-day",
    quantity: 10,
    price: 320,
    savings: 80,
    validityDays: 90,
    isActive: true,
    popular: true,
  },
  {
    id: "pkg-003",
    name: "20-Day Pass",
    description: "20 full days of daycare. Perfect for regulars!",
    rateType: "full-day",
    quantity: 20,
    price: 600,
    savings: 200,
    validityDays: 120,
    isActive: true,
  },
  {
    id: "pkg-004",
    name: "Half-Day 5-Pack",
    description: "5 half-day sessions. Great for puppies or seniors.",
    rateType: "half-day",
    quantity: 5,
    price: 110,
    savings: 15,
    validityDays: 60,
    isActive: true,
  },
  {
    id: "pkg-005",
    name: "Half-Day 10-Pack",
    description: "10 half-day sessions. Use within 90 days.",
    rateType: "half-day",
    quantity: 10,
    price: 200,
    savings: 50,
    validityDays: 90,
    isActive: true,
  },
  {
    id: "pkg-006",
    name: "Hourly Bundle (20 Hours)",
    description: "20 hours of flexible daycare. Use as needed.",
    rateType: "hourly",
    quantity: 20,
    price: 140,
    savings: 20,
    validityDays: 90,
    isActive: true,
  },
];

export const daycareReportCards: DaycareReportCard[] = [
  {
    id: "rc-001",
    checkInId: "dc-001",
    petId: 1,
    petName: "Buddy",
    date: "2024-03-09",
    overallMood: "excellent",
    energyLevel: "high",
    activities: [
      { time: "08:00", activity: "Morning walk", notes: "Very excited!" },
      {
        time: "09:30",
        activity: "Group play session",
        notes: "Played well with Max and Luna",
      },
      { time: "11:00", activity: "Water play" },
      { time: "13:00", activity: "Rest time" },
      { time: "14:30", activity: "Fetch in yard" },
      {
        time: "16:00",
        activity: "Gentle play",
        notes: "Winding down for the day",
      },
    ],
    meals: [
      {
        time: "08:30",
        type: "breakfast",
        foodType: "Dry kibble",
        amount: "1 cup",
        eaten: "all",
      },
      {
        time: "12:30",
        type: "lunch",
        foodType: "Dry kibble",
        amount: "1 cup",
        eaten: "all",
      },
      {
        time: "15:00",
        type: "snack",
        foodType: "Training treats",
        amount: "5 pieces",
        eaten: "all",
      },
    ],
    photos: ["/report-cards/buddy-play-1.jpg", "/report-cards/buddy-nap-1.jpg"],
    notes:
      "Buddy had an amazing day! He was the star of group play and made lots of friends. Very well-behaved and listened to all commands. Looking forward to seeing him again!",
    staffName: "Emily Brown",
    sentToOwner: true,
    sentAt: "2024-03-09T17:30:00",
  },
  {
    id: "rc-002",
    checkInId: "dc-003",
    petId: 13,
    petName: "Bella",
    date: "2024-03-09",
    overallMood: "good",
    energyLevel: "medium",
    activities: [
      {
        time: "08:30",
        activity: "Settling in",
        notes: "Took some time to warm up",
      },
      { time: "09:30", activity: "Small group play" },
      {
        time: "11:00",
        activity: "One-on-one attention",
        notes: "Loved cuddles",
      },
      { time: "12:00", activity: "Rest time" },
    ],
    meals: [
      {
        time: "09:00",
        type: "breakfast",
        foodType: "Wet food",
        amount: "1/2 cup",
        eaten: "most",
      },
      {
        time: "11:30",
        type: "snack",
        foodType: "Treats from home",
        amount: "3 pieces",
        eaten: "all",
      },
    ],
    photos: ["/report-cards/bella-rest-1.jpg"],
    notes:
      "Bella was a bit shy at first but warmed up nicely by mid-morning. She preferred smaller play groups and enjoyed quiet time with staff. She's doing great for her first visit!",
    staffName: "Sarah Johnson",
    sentToOwner: true,
    sentAt: "2024-03-09T13:15:00",
  },
  {
    id: "rc-003",
    checkInId: "dc-004",
    petId: 14,
    petName: "Charlie",
    date: "2024-03-09",
    overallMood: "excellent",
    energyLevel: "high",
    activities: [
      { time: "09:00", activity: "Morning play" },
      {
        time: "10:30",
        activity: "Agility course",
        notes: "Loved the tunnels!",
      },
      { time: "12:00", activity: "Group play" },
      { time: "14:00", activity: "Rest time" },
      { time: "15:30", activity: "Outdoor exploration" },
      { time: "16:30", activity: "Gentle play" },
    ],
    meals: [
      {
        time: "09:30",
        type: "breakfast",
        foodType: "Dry kibble",
        amount: "3/4 cup",
        eaten: "all",
      },
      {
        time: "13:00",
        type: "lunch",
        foodType: "Dry kibble",
        amount: "3/4 cup",
        eaten: "all",
      },
    ],
    photos: [
      "/report-cards/charlie-agility-1.jpg",
      "/report-cards/charlie-play-1.jpg",
    ],
    notes:
      "Charlie is such a joy to have! His energy is infectious and he gets along with everyone. He really excelled at the agility course today - might be a future champion!",
    staffName: "Tom Wilson",
    sentToOwner: true,
    sentAt: "2024-03-09T17:45:00",
  },
];

// Capacity settings
export const daycareCapacity = {
  total: 50,
  smallDogs: 15,
  mediumDogs: 20,
  largeDogs: 15,
};

// Helper function to get current checked-in count
export function getCurrentCheckedInCount(): number {
  return daycareCheckIns.filter((c) => c.status === "checked-in").length;
}

// Helper function to get checked-in pets by size
export function getCheckedInBySize(): Record<string, number> {
  const checkedIn = daycareCheckIns.filter((c) => c.status === "checked-in");
  return {
    small: checkedIn.filter((c) => c.petSize === "small").length,
    medium: checkedIn.filter((c) => c.petSize === "medium").length,
    large: checkedIn.filter((c) => c.petSize === "large").length,
    giant: checkedIn.filter((c) => c.petSize === "giant").length,
  };
}
