import type {
  RoomCategory,
  FacilityRoom,
  GroomingStation,
} from "@/types/rooms";

const FACILITY_ID = 11;

// ── Room Categories ────────────────────────────────────────────────────────────

export const roomCategories: RoomCategory[] = [
  // ── Boarding ──────────────────────────────────────────────────────────────
  {
    id: "cat-private-care",
    facilityId: FACILITY_ID,
    service: "boarding",
    name: "Private Care Suite",
    description:
      "Exclusive private suites for premium guests — multi-large-dog stays or dogs 80 lbs+",
    color: "amber",
    sortOrder: 1,
    defaultCapacity: 2,
    defaultBasePrice: 125,
    visibleToClients: true,
    imageUrl: "/rooms/room-3.jpg",
    rules: [
      {
        id: "rule-pcs-1",
        type: "min_weight",
        value: 80,
        clientMessage:
          "Private Care Suites are reserved for dogs 80 lbs or more, or multiple large dogs. For smaller dogs, please choose a Suite.",
        enabled: true,
      },
      {
        id: "rule-pcs-2",
        type: "pet_type",
        value: "dog",
        clientMessage: "Private Care Suites accommodate dogs only.",
        enabled: true,
      },
    ],
  },
  {
    id: "cat-deluxe",
    facilityId: FACILITY_ID,
    service: "boarding",
    name: "Deluxe Suite",
    description:
      "Spacious suites with premium bedding — ideal for dogs 40–80 lbs or multi-pet stays",
    color: "violet",
    sortOrder: 2,
    defaultCapacity: 2,
    defaultBasePrice: 85,
    visibleToClients: true,
    imageUrl: "/rooms/room-2.jpg",
    rules: [
      {
        id: "rule-ds-1",
        type: "max_pets",
        value: 2,
        clientMessage:
          "Deluxe Suites accommodate up to 2 pets from the same household.",
        enabled: true,
      },
      {
        id: "rule-ds-2",
        type: "min_weight",
        value: 40,
        clientMessage:
          "Deluxe Suites are designed for dogs 40 lbs and above. For smaller dogs, please select a Suite.",
        enabled: true,
      },
    ],
  },
  {
    id: "cat-suite",
    facilityId: FACILITY_ID,
    service: "boarding",
    name: "Suite",
    description:
      "Comfortable private suites — best for dogs up to 80 lbs, single pet per booking",
    color: "blue",
    sortOrder: 3,
    defaultCapacity: 1,
    defaultBasePrice: 55,
    visibleToClients: true,
    imageUrl: "/rooms/room-1.jpg",
    rules: [
      {
        id: "rule-s-1",
        type: "max_weight",
        value: 80,
        clientMessage:
          "Suites are designed for dogs up to 80 lbs. For larger dogs, please select a Deluxe Suite.",
        enabled: true,
      },
      {
        id: "rule-s-2",
        type: "single_pet_only",
        value: 1,
        clientMessage:
          "Suites accommodate one pet per booking. Multi-pet stays are available in Deluxe Suites.",
        enabled: true,
      },
    ],
  },
  {
    id: "cat-condo",
    facilityId: FACILITY_ID,
    service: "boarding",
    name: "Condominium",
    description:
      "Standard comfortable kennels — economical and efficient for all dogs up to 60 lbs",
    color: "slate",
    sortOrder: 4,
    defaultCapacity: 1,
    defaultBasePrice: 38,
    visibleToClients: true,
    imageUrl:
      "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=800&h=480&fit=crop",
    rules: [
      {
        id: "rule-c-1",
        type: "max_weight",
        value: 60,
        clientMessage:
          "Condominiums are best suited for dogs up to 60 lbs. For larger dogs, please select a Suite.",
        enabled: true,
      },
      {
        id: "rule-c-2",
        type: "single_pet_only",
        value: 1,
        clientMessage:
          "Condominiums are single-pet only. For multi-pet stays please choose a Deluxe Suite.",
        enabled: true,
      },
    ],
  },
];
// Note: daycare play areas and sections are managed in src/data/daycare-areas.ts

// ── Individual Room Units ──────────────────────────────────────────────────────

export const facilityRooms: FacilityRoom[] = [
  // Private Care Suites (1 unit)
  {
    id: "room-pcs-01",
    categoryId: "cat-private-care",
    facilityId: FACILITY_ID,
    name: "Private Care 01",
    active: true,
  },

  // Deluxe Suites (5 units)
  {
    id: "room-ds-01",
    categoryId: "cat-deluxe",
    facilityId: FACILITY_ID,
    name: "Deluxe 01",
    active: true,
  },
  {
    id: "room-ds-02",
    categoryId: "cat-deluxe",
    facilityId: FACILITY_ID,
    name: "Deluxe 02",
    active: true,
  },
  {
    id: "room-ds-03",
    categoryId: "cat-deluxe",
    facilityId: FACILITY_ID,
    name: "Deluxe 03",
    active: true,
  },
  {
    id: "room-ds-04",
    categoryId: "cat-deluxe",
    facilityId: FACILITY_ID,
    name: "Deluxe 04",
    active: true,
  },
  {
    id: "room-ds-05",
    categoryId: "cat-deluxe",
    facilityId: FACILITY_ID,
    name: "Deluxe 05",
    active: false,
    staffNotes: "Under renovation until May 2026",
  },

  // Suites (8 units)
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `room-s-${String(i + 1).padStart(2, "0")}`,
    categoryId: "cat-suite",
    facilityId: FACILITY_ID,
    name: `Suite ${String(i + 1).padStart(2, "0")}`,
    active: true,
  })),

  // Condominiums (15 units, last 2 inactive)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `room-c-${String(i + 1).padStart(2, "0")}`,
    categoryId: "cat-condo",
    facilityId: FACILITY_ID,
    name: `Condo ${String(i + 1).padStart(2, "0")}`,
    active: i < 13,
    ...(i >= 13 ? { staffNotes: "Pending deep clean & inspection" } : {}),
  })),
];
// Note: daycare room units are now modelled as DaycareSection in src/data/daycare-areas.ts

// ── Grooming Stations ──────────────────────────────────────────────────────────

export const groomingStations: GroomingStation[] = [
  {
    id: "gs-t-01",
    facilityId: FACILITY_ID,
    type: "table",
    name: "Table 1",
    active: true,
  },
  {
    id: "gs-t-02",
    facilityId: FACILITY_ID,
    type: "table",
    name: "Table 2",
    active: true,
  },
  {
    id: "gs-t-03",
    facilityId: FACILITY_ID,
    type: "table",
    name: "Table 3",
    active: true,
  },
  {
    id: "gs-t-04",
    facilityId: FACILITY_ID,
    type: "table",
    name: "Table 4",
    active: false,
    staffNotes: "Awaiting replacement hydraulic lift",
  },
  {
    id: "gs-tub-01",
    facilityId: FACILITY_ID,
    type: "tub",
    name: "Tub 1",
    active: true,
  },
  {
    id: "gs-tub-02",
    facilityId: FACILITY_ID,
    type: "tub",
    name: "Tub 2",
    active: true,
  },
  {
    id: "gs-dryer-01",
    facilityId: FACILITY_ID,
    type: "cage_dryer",
    name: "Cage Dryer 1",
    active: true,
  },
  {
    id: "gs-dryer-02",
    facilityId: FACILITY_ID,
    type: "stand_dryer",
    name: "Stand Dryer 1",
    active: true,
  },
];

// ── Helper functions ───────────────────────────────────────────────────────────

export function getRoomsForCategory(categoryId: string): FacilityRoom[] {
  return facilityRooms.filter((r) => r.categoryId === categoryId);
}

export function getBoardingCapacityStats() {
  const boardingCats = roomCategories.filter(
    (c) => c.facilityId === FACILITY_ID && c.service === "boarding",
  );
  return boardingCats.map((cat) => {
    const units = facilityRooms.filter((r) => r.categoryId === cat.id);
    const active = units.filter((r) => r.active);
    return {
      categoryId: cat.id,
      name: cat.name,
      color: cat.color,
      totalUnits: units.length,
      activeUnits: active.length,
      totalCapacity: active.reduce(
        (sum, r) => sum + (r.capacity ?? cat.defaultCapacity),
        0,
      ),
    };
  });
}

/** @deprecated Use getTotalDaycareCapacity() from src/data/daycare-areas.ts instead */
export function getDaycareCapacityStats() {
  return [];
}
