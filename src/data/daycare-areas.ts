import type { DaycarePlayArea, DaycareSection } from "@/types/rooms";

const FACILITY_ID = 11;

// ── Play Areas (parks / locations) ────────────────────────────────────────────

export const daycarePlayAreas: DaycarePlayArea[] = [
  {
    id: "area-indoor",
    facilityId: FACILITY_ID,
    name: "Indoor Park",
    description: "Climate-controlled indoor play space — open year-round",
    isActive: true,
    sortOrder: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=480&fit=crop",
  },
  {
    id: "area-outdoor",
    facilityId: FACILITY_ID,
    name: "Outdoor Yard",
    description: "Open-air supervised play area — seasonal",
    isActive: true,
    sortOrder: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=480&fit=crop",
  },
];

// ── Sections (subdivisions of a play area, each with its own capacity) ────────

export const daycareSections: DaycareSection[] = [
  // ── Indoor Park ──────────────────────────────────────────────────────────────
  {
    id: "sec-indoor-small",
    playAreaId: "area-indoor",
    facilityId: FACILITY_ID,
    name: "Small Dogs",
    capacity: 20,
    description: "Cozy section for dogs under 20 lbs",
    isActive: true,
    sortOrder: 1,
    color: "emerald",
    rules: [
      {
        id: "rule-is-1",
        type: "max_weight",
        value: 20,
        clientMessage: "This section is reserved for dogs under 20 lbs.",
        enabled: true,
      },
      {
        id: "rule-is-2",
        type: "pet_type",
        value: "dog",
        clientMessage: "This section is for dogs only.",
        enabled: true,
      },
    ],
  },
  {
    id: "sec-indoor-medium",
    playAreaId: "area-indoor",
    facilityId: FACILITY_ID,
    name: "Medium Dogs",
    capacity: 30,
    description: "Active section for dogs 20–50 lbs",
    isActive: true,
    sortOrder: 2,
    color: "blue",
    rules: [
      {
        id: "rule-im-1",
        type: "min_weight",
        value: 20,
        clientMessage: "This section is for dogs 20 lbs and above.",
        enabled: true,
      },
      {
        id: "rule-im-2",
        type: "max_weight",
        value: 50,
        clientMessage: "This section is for dogs up to 50 lbs.",
        enabled: true,
      },
      {
        id: "rule-im-3",
        type: "pet_type",
        value: "dog",
        clientMessage: "This section is for dogs only.",
        enabled: true,
      },
    ],
  },
  {
    id: "sec-indoor-large",
    playAreaId: "area-indoor",
    facilityId: FACILITY_ID,
    name: "Large Dogs",
    capacity: 50,
    description: "Spacious section for dogs over 50 lbs",
    isActive: true,
    sortOrder: 3,
    color: "amber",
    rules: [
      {
        id: "rule-il-1",
        type: "min_weight",
        value: 50,
        clientMessage: "This section is for dogs 50 lbs and above.",
        enabled: true,
      },
      {
        id: "rule-il-2",
        type: "pet_type",
        value: "dog",
        clientMessage: "This section is for dogs only.",
        enabled: true,
      },
    ],
  },

  // ── Outdoor Yard ─────────────────────────────────────────────────────────────
  {
    id: "sec-outdoor-main",
    playAreaId: "area-outdoor",
    facilityId: FACILITY_ID,
    name: "Main Yard",
    capacity: 25,
    description: "Open outdoor play for all sizes",
    isActive: true,
    sortOrder: 1,
    color: "orange",
    rules: [
      {
        id: "rule-om-1",
        type: "pet_type",
        value: "dog",
        clientMessage: "Outdoor yard is for dogs only.",
        enabled: true,
      },
    ],
  },
  {
    id: "sec-outdoor-agility",
    playAreaId: "area-outdoor",
    facilityId: FACILITY_ID,
    name: "Agility Zone",
    capacity: 10,
    description: "Obstacle course for energetic dogs",
    isActive: true,
    sortOrder: 2,
    color: "violet",
    rules: [
      {
        id: "rule-oa-1",
        type: "min_weight",
        value: 15,
        clientMessage: "Agility zone is for dogs 15 lbs and above.",
        enabled: true,
      },
      {
        id: "rule-oa-2",
        type: "pet_type",
        value: "dog",
        clientMessage: "Agility zone is for dogs only.",
        enabled: true,
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSectionsForArea(playAreaId: string): DaycareSection[] {
  return daycareSections
    .filter((s) => s.playAreaId === playAreaId && s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getTotalDaycareCapacity(): number {
  return daycareSections
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + s.capacity, 0);
}
