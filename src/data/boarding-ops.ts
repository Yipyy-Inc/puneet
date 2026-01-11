"use client";

export type PetType = "dog" | "cat";

export type BoardingRoomTypeId = "standard" | "deluxe" | "vip" | "cat-suite";

export interface BoardingRoomType {
  id: BoardingRoomTypeId;
  name: string;
  description: string;
  defaultCapacity: number;
  allowsShared: boolean;
  allowedPetTypes: PetType[];
}

export interface BoardingRoom {
  id: string;
  name: string;
  typeId: BoardingRoomTypeId;
  capacity: number;
  allowsShared: boolean;
  allowedPetTypes: PetType[];
  restrictions: string[];
}

export type YipyyGoPreCheckStatus =
  | "not-submitted"
  | "submitted"
  | "approved"
  | "corrections-requested";

export type PaymentStatus = "unpaid" | "deposit" | "partial" | "paid";

export type BookingRequestStatus = "new" | "in-review" | "accepted" | "declined";

export interface PreCheckAuditEvent {
  id: string;
  at: string;
  actorType: "customer" | "staff" | "system";
  actorName: string;
  action: string;
  details?: string;
}

export interface YipyyGoPreCheckForm {
  id: string;
  status: YipyyGoPreCheckStatus;
  submittedAt?: string;
  approvedAt?: string;
  belongings: string[];
  feedingInstructions: string;
  medicationInstructions: string;
  behaviorNotes: string;
  staffNotes: string;
  photoUrls: string[];
  qrCodeToken: string;
  audit: PreCheckAuditEvent[];
}

export interface BookingPetLine {
  petId: number;
  petName: string;
  petType: PetType;
  breed: string;
  evaluationRequired: boolean;
  behaviorTags: string[];
}

export interface BookingAddOnLine {
  id: string;
  name: string;
  unit: "flat" | "day";
  unitPrice: number;
  quantity: number;
}

export interface BoardingBookingRequest {
  id: string;
  createdAt: string;
  status: BookingRequestStatus;
  clientId: number;
  clientName: string;
  checkInDate: string;
  checkOutDate: string;
  requestedRoomTypeId: BoardingRoomTypeId;
  pets: BookingPetLine[];
  addOnsByPetId: Record<number, BookingAddOnLine[]>;
  paymentStatus: PaymentStatus;
  tipAmount: number;
  totalEstimate: number;
  preCheck: YipyyGoPreCheckForm;
}

export const BOARDING_ROOM_TYPES: BoardingRoomType[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Private kennel, basic bedding, standard care routine.",
    defaultCapacity: 1,
    allowsShared: false,
    allowedPetTypes: ["dog"],
  },
  {
    id: "deluxe",
    name: "Deluxe",
    description: "Bigger space with optional shared stays (multi-pet).",
    defaultCapacity: 2,
    allowsShared: true,
    allowedPetTypes: ["dog"],
  },
  {
    id: "vip",
    name: "VIP",
    description: "Premium suite, webcam-ready, additional staff checks.",
    defaultCapacity: 1,
    allowsShared: false,
    allowedPetTypes: ["dog"],
  },
  {
    id: "cat-suite",
    name: "Cat Suite",
    description: "Dedicated quiet rooms for cats only.",
    defaultCapacity: 1,
    allowsShared: false,
    allowedPetTypes: ["cat"],
  },
];

export const BOARDING_ROOMS: BoardingRoom[] = [
  {
    id: "R-STD-01",
    name: "Std 01",
    typeId: "standard",
    capacity: 1,
    allowsShared: false,
    allowedPetTypes: ["dog"],
    restrictions: ["No shared stays"],
  },
  {
    id: "R-STD-02",
    name: "Std 02",
    typeId: "standard",
    capacity: 1,
    allowsShared: false,
    allowedPetTypes: ["dog"],
    restrictions: [],
  },
  {
    id: "R-DLX-01",
    name: "Deluxe 01",
    typeId: "deluxe",
    capacity: 2,
    allowsShared: true,
    allowedPetTypes: ["dog"],
    restrictions: ["Shared allowed (same booking only)"],
  },
  {
    id: "R-DLX-02",
    name: "Deluxe 02",
    typeId: "deluxe",
    capacity: 2,
    allowsShared: true,
    allowedPetTypes: ["dog"],
    restrictions: ["Shared allowed (same booking only)"],
  },
  {
    id: "R-VIP-01",
    name: "VIP 01",
    typeId: "vip",
    capacity: 1,
    allowsShared: false,
    allowedPetTypes: ["dog"],
    restrictions: ["Quiet zone"],
  },
  {
    id: "R-CAT-01",
    name: "Cat 01",
    typeId: "cat-suite",
    capacity: 1,
    allowsShared: false,
    allowedPetTypes: ["cat"],
    restrictions: ["Cats only"],
  },
];

export const BOARDING_BOOKING_REQUESTS: BoardingBookingRequest[] = [
  {
    id: "req-001",
    createdAt: "2024-03-10T09:12:00Z",
    status: "new",
    clientId: 15,
    clientName: "John Smith",
    checkInDate: "2024-03-12",
    checkOutDate: "2024-03-15",
    requestedRoomTypeId: "deluxe",
    pets: [
      {
        petId: 1,
        petName: "Buddy",
        petType: "dog",
        breed: "Golden Retriever",
        evaluationRequired: true,
        behaviorTags: ["friendly", "group-play-ok"],
      },
      {
        petId: 3,
        petName: "Max",
        petType: "dog",
        breed: "Labrador Retriever",
        evaluationRequired: true,
        behaviorTags: ["high-energy", "food-motivated"],
      },
    ],
    addOnsByPetId: {
      1: [
        { id: "ao-play", name: "Extra Playtime", unit: "day", unitPrice: 15, quantity: 2 },
      ],
      3: [
        { id: "ao-groom", name: "Grooming", unit: "flat", unitPrice: 45, quantity: 1 },
      ],
    },
    paymentStatus: "deposit",
    tipAmount: 10,
    totalEstimate: 320,
    preCheck: {
      id: "pc-001",
      status: "submitted",
      submittedAt: "2024-03-10T09:10:00Z",
      belongings: ["Leash", "Blue Blanket", "Kong toy"],
      feedingInstructions: "Feed twice daily. Add warm water.",
      medicationInstructions: "Buddy: Apoquel 16mg at 08:00 with food.",
      behaviorNotes: "Buddy is friendly; Max can get excited at doorways.",
      staffNotes: "",
      photoUrls: [],
      qrCodeToken: "YGO-REQ-001",
      audit: [
        {
          id: "ae-001",
          at: "2024-03-10T09:10:00Z",
          actorType: "customer",
          actorName: "John Smith",
          action: "Submitted PreCheck form",
        },
      ],
    },
  },
  {
    id: "req-002",
    createdAt: "2024-03-10T11:35:00Z",
    status: "in-review",
    clientId: 28,
    clientName: "Emily Davis",
    checkInDate: "2024-03-11",
    checkOutDate: "2024-03-14",
    requestedRoomTypeId: "vip",
    pets: [
      {
        petId: 13,
        petName: "Bella",
        petType: "dog",
        breed: "French Bulldog",
        evaluationRequired: true,
        behaviorTags: ["medications", "sensitive-stomach"],
      },
    ],
    addOnsByPetId: {
      13: [{ id: "ao-photo", name: "Daily Photo Update", unit: "day", unitPrice: 5, quantity: 3 }],
    },
    paymentStatus: "unpaid",
    tipAmount: 0,
    totalEstimate: 210,
    preCheck: {
      id: "pc-002",
      status: "not-submitted",
      belongings: [],
      feedingInstructions: "",
      medicationInstructions: "",
      behaviorNotes: "",
      staffNotes: "Reminder needed: PreCheck not submitted yet.",
      photoUrls: [],
      qrCodeToken: "YGO-REQ-002",
      audit: [
        {
          id: "ae-002",
          at: "2024-03-10T11:35:00Z",
          actorType: "system",
          actorName: "System",
          action: "Created booking request",
        },
      ],
    },
  },
];

