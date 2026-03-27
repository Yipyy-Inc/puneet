// Custom service check-in mock data
// Mirrors DaycareCheckIn / BoardingGuest structure for unified dashboard display

export type CustomServiceCheckInStatus =
  | "scheduled"
  | "checked-in"
  | "in-progress"
  | "completed"
  | "checked-out";

export interface CustomServiceCheckIn {
  id: string;
  moduleId: string;
  moduleName: string;
  moduleSlug: string;
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
  status: CustomServiceCheckInStatus;
  durationMinutes: number;
  resourceName?: string;
  staffAssigned?: string;
  notes: string;
  price: number;
}

// Today's date string for mock data
const today = new Date().toISOString().split("T")[0];

export const customServiceCheckIns: CustomServiceCheckIn[] = [
  // Yoda's Splash — pool sessions
  {
    id: "csc-1",
    moduleId: "csm-yodas-splash",
    moduleName: "Yoda's Splash",
    moduleSlug: "yodas-splash",
    petId: 1,
    petName: "Bella",
    petBreed: "Golden Retriever",
    petSize: "large",
    ownerId: 15,
    ownerName: "Sarah Johnson",
    ownerPhone: "(514) 555-0101",
    checkInTime: `${today}T09:00:00`,
    checkOutTime: `${today}T09:35:00`,
    scheduledCheckOut: `${today}T09:30:00`,
    status: "completed",
    durationMinutes: 30,
    resourceName: "Main Pool",
    staffAssigned: "Jake M.",
    notes: "Loves the water. Light rehab for left leg.",
    price: 25,
  },
  {
    id: "csc-2",
    moduleId: "csm-yodas-splash",
    moduleName: "Yoda's Splash",
    moduleSlug: "yodas-splash",
    petId: 3,
    petName: "Charlie",
    petBreed: "Labrador",
    petSize: "large",
    ownerId: 12,
    ownerName: "Michael Brown",
    ownerPhone: "(514) 555-0202",
    checkInTime: `${today}T10:00:00`,
    checkOutTime: null,
    scheduledCheckOut: `${today}T11:00:00`,
    status: "in-progress",
    durationMinutes: 60,
    resourceName: "Main Pool",
    staffAssigned: "Jake M.",
    notes: "First pool session — monitor closely.",
    price: 40,
  },
  {
    id: "csc-3",
    moduleId: "csm-yodas-splash",
    moduleName: "Yoda's Splash",
    moduleSlug: "yodas-splash",
    petId: 5,
    petName: "Rocky",
    petBreed: "French Bulldog",
    petSize: "small",
    ownerId: 18,
    ownerName: "Lisa Park",
    ownerPhone: "(514) 555-0303",
    checkInTime: `${today}T11:30:00`,
    checkOutTime: null,
    scheduledCheckOut: `${today}T12:00:00`,
    status: "scheduled",
    durationMinutes: 30,
    resourceName: "Splash Pad",
    staffAssigned: "Amy R.",
    notes: "Brachycephalic — watch breathing, shallow water only.",
    price: 25,
  },
  {
    id: "csc-4",
    moduleId: "csm-yodas-splash",
    moduleName: "Yoda's Splash",
    moduleSlug: "yodas-splash",
    petId: 7,
    petName: "Luna",
    petBreed: "Poodle",
    petSize: "medium",
    ownerId: 20,
    ownerName: "David Kim",
    ownerPhone: "(514) 555-0404",
    checkInTime: `${today}T13:00:00`,
    checkOutTime: null,
    scheduledCheckOut: `${today}T14:00:00`,
    status: "scheduled",
    durationMinutes: 60,
    resourceName: "Main Pool",
    notes: "",
    price: 40,
  },
  // Paws Express — transport
  {
    id: "csc-5",
    moduleId: "csm-paws-express",
    moduleName: "Paws Express",
    moduleSlug: "paws-express",
    petId: 2,
    petName: "Max",
    petBreed: "German Shepherd",
    petSize: "large",
    ownerId: 16,
    ownerName: "Tom Davis",
    ownerPhone: "(514) 555-0505",
    checkInTime: `${today}T08:00:00`,
    checkOutTime: `${today}T08:45:00`,
    scheduledCheckOut: `${today}T08:30:00`,
    status: "completed",
    durationMinutes: 30,
    resourceName: "Van #1 — West Route",
    staffAssigned: "Chris T.",
    notes: "Pickup from Westmount. Arrives calm.",
    price: 15,
  },
  {
    id: "csc-6",
    moduleId: "csm-paws-express",
    moduleName: "Paws Express",
    moduleSlug: "paws-express",
    petId: 4,
    petName: "Daisy",
    petBreed: "Beagle",
    petSize: "medium",
    ownerId: 19,
    ownerName: "Emily Chen",
    ownerPhone: "(514) 555-0606",
    checkInTime: `${today}T08:15:00`,
    checkOutTime: null,
    scheduledCheckOut: `${today}T09:00:00`,
    status: "checked-in",
    durationMinutes: 45,
    resourceName: "Van #2 — East Route",
    staffAssigned: "Chris T.",
    notes: "Gets anxious in the van — sit with her.",
    price: 18,
  },
  // Birthday Pawty
  {
    id: "csc-7",
    moduleId: "csm-birthday-pawty",
    moduleName: "Birthday Pawty",
    moduleSlug: "birthday-pawty",
    petId: 6,
    petName: "Cooper",
    petBreed: "Corgi",
    petSize: "medium",
    ownerId: 21,
    ownerName: "Natalie White",
    ownerPhone: "(514) 555-0707",
    checkInTime: `${today}T14:00:00`,
    checkOutTime: null,
    scheduledCheckOut: `${today}T16:00:00`,
    status: "scheduled",
    durationMinutes: 120,
    resourceName: "Party Room",
    staffAssigned: "Sophie L.",
    notes: "Birthday party — 6 dogs expected. Cake ordered.",
    price: 150,
  },
];
