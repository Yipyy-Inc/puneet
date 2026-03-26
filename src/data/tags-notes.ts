// ========================================
// TAG & NOTES SYSTEM — Types, Mock Data, Helpers
// ========================================

import { ALL_FACILITY_ROLES, type FacilityRole } from "@/lib/role-utils";

// ========================================
// TAG TYPES
// ========================================

export type TagType = "pet" | "customer" | "booking";
export type TagPriority = "informational" | "warning" | "critical";
export type TagVisibility = "internal" | "client_visible";
export type TagScope = "global" | "location_specific";

export interface Tag {
  id: string;
  type: TagType;
  name: string;
  color: string; // hex color e.g. "#ef4444"
  icon: string; // lucide-react icon name from ICON_MAP
  description?: string;
  priority: TagPriority;
  visibility: TagVisibility;
  scope: TagScope;
  locationIds?: string[]; // relevant when scope = "location_specific"
  facilityId?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  createdById: number;
  updatedAt?: string;
}

export interface TagAssignment {
  id: string;
  tagId: string;
  entityType: TagType;
  entityId: number;
  assignedAt: string;
  assignedBy: string;
  assignedById: number;
  expiresAt?: string;
  notes?: string;
}

// ========================================
// NOTE TYPES
// ========================================

export type NoteCategory =
  | "pet"
  | "customer"
  | "booking"
  | "incident"
  | "internal_staff";
export type PetNoteSubType = "general" | "behavior" | "medical" | "feeding";
export type NoteVisibility = "internal" | "shared_with_customer";

export interface NoteEdit {
  id: string;
  noteId: string;
  previousContent: string;
  newContent: string;
  editedAt: string;
  editedBy: string;
  editedById: number;
}

export interface Note {
  id: string;
  category: NoteCategory;
  subType?: PetNoteSubType;
  entityId: number;
  facilityId: number;
  content: string;
  visibility: NoteVisibility;
  isPinned: boolean;
  createdAt: string;
  createdBy: string;
  createdById: number;
  updatedAt?: string;
  updatedBy?: string;
  updatedById?: number;
  editHistory: NoteEdit[];
}

// ========================================
// SETTINGS TYPES
// ========================================

export interface NoteRolePermissions {
  view: FacilityRole[];
  create: FacilityRole[];
  edit: FacilityRole[];
  delete: FacilityRole[];
}

export interface TagNoteSettings {
  facilityId: number;
  tagSettings: {
    petTagsEnabled: boolean;
    customerTagsEnabled: boolean;
    bookingTagsEnabled: boolean;
    defaultVisibility: TagVisibility;
    defaultScope: TagScope;
  };
  noteSettings: {
    rolePermissions: Record<NoteCategory, NoteRolePermissions>;
    defaultVisibility: NoteVisibility;
  };
  automationRules: AutomationRule[];
}

// Phase 2 placeholder
export interface AutomationRule {
  id: string;
  tagId: string;
  triggerType: "on_assign" | "on_remove";
  actionType: "add_task" | "send_notification" | "add_note";
  actionConfig: Record<string, unknown>;
  isActive: boolean;
}

// ========================================
// TAILWIND → HEX MIGRATION MAP
// ========================================

const TAILWIND_TO_HEX: Record<string, string> = {
  "bg-red-500": "#ef4444",
  "bg-orange-500": "#f97316",
  "bg-yellow-500": "#eab308",
  "bg-purple-500": "#a855f7",
  "bg-pink-500": "#ec4899",
  "bg-blue-500": "#3b82f6",
  "bg-amber-500": "#f59e0b",
  "bg-green-500": "#22c55e",
  "bg-rose-500": "#f43f5e",
  "bg-cyan-500": "#06b6d4",
};

// ========================================
// TAG PRESET COLORS (for color picker)
// ========================================

export const TAG_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: "Red", hex: "#ef4444" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Orange", hex: "#f97316" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Yellow", hex: "#eab308" },
  { label: "Lime", hex: "#84cc16" },
  { label: "Green", hex: "#22c55e" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Teal", hex: "#14b8a6" },
  { label: "Cyan", hex: "#06b6d4" },
  { label: "Blue", hex: "#3b82f6" },
  { label: "Indigo", hex: "#6366f1" },
  { label: "Purple", hex: "#a855f7" },
  { label: "Pink", hex: "#ec4899" },
  { label: "Slate", hex: "#64748b" },
];

// ========================================
// MOCK TAGS — Pet Tags (migrated from pet-data.ts)
// ========================================

export const tags: Tag[] = [
  // ---- PET TAGS (migrated + expanded) ----
  {
    id: "tag-001",
    type: "pet",
    name: "Aggressive",
    color: "#ef4444",
    icon: "ShieldAlert",
    description: "Requires extra supervision and careful handling",
    priority: "critical",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-002",
    type: "pet",
    name: "Escape Artist",
    color: "#f97316",
    icon: "AlertTriangle",
    description: "Known to attempt escapes, needs secure enclosure",
    priority: "warning",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-003",
    type: "pet",
    name: "Anxious",
    color: "#eab308",
    icon: "HeartPulse",
    description: "Gets nervous easily, needs calm environment",
    priority: "warning",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-004",
    type: "pet",
    name: "Senior",
    color: "#a855f7",
    icon: "Heart",
    description: "Older pet requiring gentler care",
    priority: "informational",
    visibility: "client_visible",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-005",
    type: "pet",
    name: "Puppy/Kitten",
    color: "#ec4899",
    icon: "PawPrint",
    description: "Young pet requiring extra attention",
    priority: "informational",
    visibility: "client_visible",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-006",
    type: "pet",
    name: "Medication",
    color: "#3b82f6",
    icon: "Pill",
    description: "Has ongoing medical requirements — check care instructions",
    priority: "warning",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-007",
    type: "pet",
    name: "VIP",
    color: "#f59e0b",
    icon: "Crown",
    description: "High-value client pet, prioritize service",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-008",
    type: "pet",
    name: "First Time",
    color: "#22c55e",
    icon: "Star",
    description: "New to the facility",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-009",
    type: "pet",
    name: "Reactive",
    color: "#f43f5e",
    icon: "Zap",
    description: "Reactive to other animals — keep separated",
    priority: "critical",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-010",
    type: "pet",
    name: "Special Diet",
    color: "#06b6d4",
    icon: "Utensils",
    description: "Has dietary restrictions or special food",
    priority: "warning",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "tag-011",
    type: "pet",
    name: "Needs Muzzle",
    color: "#ef4444",
    icon: "Ban",
    description: "Must wear muzzle during handling",
    priority: "critical",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-05T00:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },
  {
    id: "tag-012",
    type: "pet",
    name: "Staff Favorite",
    color: "#f59e0b",
    icon: "Star",
    description: "Beloved by the team!",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-05T00:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },
  {
    id: "tag-013",
    type: "pet",
    name: "Sensitive Skin",
    color: "#14b8a6",
    icon: "HandHeart",
    description: "Use gentle grooming products only",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-05T00:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },
  {
    id: "tag-014",
    type: "pet",
    name: "High Energy",
    color: "#f97316",
    icon: "Flame",
    description: "Needs lots of exercise and activity",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-05T00:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },

  // ---- CUSTOMER TAGS ----
  {
    id: "ctag-001",
    type: "customer",
    name: "VIP Client",
    color: "#f59e0b",
    icon: "Crown",
    description: "Top-tier customer — always prioritize",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "ctag-002",
    type: "customer",
    name: "Late Payments",
    color: "#ef4444",
    icon: "AlertCircle",
    description: "History of late or missed payments",
    priority: "warning",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "ctag-003",
    type: "customer",
    name: "Frequent Canceller",
    color: "#f97316",
    icon: "AlertTriangle",
    description: "Frequently cancels or no-shows bookings",
    priority: "warning",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "ctag-004",
    type: "customer",
    name: "High Spender",
    color: "#22c55e",
    icon: "Star",
    description: "Consistently high revenue customer",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "ctag-005",
    type: "customer",
    name: "Needs Reminder Calls",
    color: "#3b82f6",
    icon: "Megaphone",
    description: "Prefers phone calls for appointment reminders",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "ctag-006",
    type: "customer",
    name: "Staff Favorite",
    color: "#ec4899",
    icon: "Heart",
    description: "Wonderful to work with — always friendly",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },

  // ---- BOOKING TAGS ----
  {
    id: "btag-001",
    type: "booking",
    name: "VIP Visit",
    color: "#f59e0b",
    icon: "Crown",
    description: "VIP booking — extra attention required",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "btag-002",
    type: "booking",
    name: "Special Event",
    color: "#a855f7",
    icon: "PartyPopper",
    description: "Birthday, holiday, or special occasion visit",
    priority: "informational",
    visibility: "client_visible",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "btag-003",
    type: "booking",
    name: "First Time",
    color: "#22c55e",
    icon: "Star",
    description: "First booking at this facility",
    priority: "informational",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "btag-004",
    type: "booking",
    name: "Behavioral Assessment Required",
    color: "#ef4444",
    icon: "ShieldAlert",
    description: "Pet needs behavioral assessment before service",
    priority: "critical",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "btag-005",
    type: "booking",
    name: "Waiver Pending",
    color: "#f97316",
    icon: "AlertTriangle",
    description: "Required waiver not yet signed",
    priority: "warning",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
  {
    id: "btag-006",
    type: "booking",
    name: "Follow-up Required",
    color: "#3b82f6",
    icon: "MessageSquare",
    description: "Staff follow-up needed after this visit",
    priority: "warning",
    visibility: "internal",
    scope: "global",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "System",
    createdById: 0,
  },
];

// ========================================
// MOCK TAG ASSIGNMENTS
// ========================================

export const tagAssignments: TagAssignment[] = [
  // Pet tag assignments (migrated from pet-data.ts)
  {
    id: "assign-001",
    tagId: "tag-007",
    entityType: "pet",
    entityId: 1, // Buddy — VIP
    assignedAt: "2024-01-15T09:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-002",
    tagId: "tag-006",
    entityType: "pet",
    entityId: 3, // Max — Medication
    assignedAt: "2024-01-20T10:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-003",
    tagId: "tag-004",
    entityType: "pet",
    entityId: 3, // Max — Senior
    assignedAt: "2024-01-20T10:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-004",
    tagId: "tag-001",
    entityType: "pet",
    entityId: 5, // Rocky — Aggressive
    assignedAt: "2024-01-16T11:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
  {
    id: "assign-005",
    tagId: "tag-009",
    entityType: "pet",
    entityId: 5, // Rocky — Reactive
    assignedAt: "2024-01-16T11:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
  {
    id: "assign-006",
    tagId: "tag-010",
    entityType: "pet",
    entityId: 2, // Whiskers — Special Diet
    assignedAt: "2024-01-10T09:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-007",
    tagId: "tag-003",
    entityType: "pet",
    entityId: 14, // Fluffy — Anxious
    assignedAt: "2024-02-01T08:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
  {
    id: "assign-008",
    tagId: "tag-014",
    entityType: "pet",
    entityId: 1, // Buddy — High Energy
    assignedAt: "2024-02-05T09:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-009",
    tagId: "tag-012",
    entityType: "pet",
    entityId: 1, // Buddy — Staff Favorite
    assignedAt: "2024-02-05T09:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },

  // Customer tag assignments
  {
    id: "cassign-001",
    tagId: "ctag-001",
    entityType: "customer",
    entityId: 1, // VIP Client
    assignedAt: "2024-01-15T09:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "cassign-002",
    tagId: "ctag-004",
    entityType: "customer",
    entityId: 1, // High Spender
    assignedAt: "2024-01-15T09:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "cassign-003",
    tagId: "ctag-002",
    entityType: "customer",
    entityId: 5, // Late Payments
    assignedAt: "2024-02-10T14:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
  {
    id: "cassign-004",
    tagId: "ctag-003",
    entityType: "customer",
    entityId: 8, // Frequent Canceller
    assignedAt: "2024-02-12T11:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "cassign-005",
    tagId: "ctag-006",
    entityType: "customer",
    entityId: 2, // Staff Favorite
    assignedAt: "2024-01-20T10:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },

  // Booking tag assignments
  {
    id: "bassign-001",
    tagId: "btag-001",
    entityType: "booking",
    entityId: 1, // VIP Visit
    assignedAt: "2024-03-01T09:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "bassign-002",
    tagId: "btag-003",
    entityType: "booking",
    entityId: 3, // First Time
    assignedAt: "2024-03-05T10:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "bassign-003",
    tagId: "btag-004",
    entityType: "booking",
    entityId: 5, // Behavioral Assessment Required
    assignedAt: "2024-03-10T08:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
  {
    id: "bassign-004",
    tagId: "btag-005",
    entityType: "booking",
    entityId: 7, // Waiver Pending
    assignedAt: "2024-03-12T11:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "bassign-005",
    tagId: "btag-006",
    entityType: "booking",
    entityId: 2, // Follow-up Required
    assignedAt: "2024-03-15T14:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
];

// ========================================
// MOCK NOTES
// ========================================

export const notes: Note[] = [
  // Pet notes
  {
    id: "note-001",
    category: "pet",
    subType: "behavior",
    entityId: 1, // Buddy
    facilityId: 1,
    content:
      "Buddy tends to get overexcited during drop-off. Allow 10 minutes of calm-down time before introducing to play group. Responds well to treats.",
    visibility: "internal",
    isPinned: true,
    createdAt: "2024-01-20T09:30:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },
  {
    id: "note-002",
    category: "pet",
    subType: "medical",
    entityId: 3, // Max
    facilityId: 1,
    content:
      "Max takes Rimadyl 75mg with breakfast. Owner provides medication in labeled bag. Monitor for lethargy or decreased appetite — signs of reaction.",
    visibility: "internal",
    isPinned: true,
    createdAt: "2024-01-22T10:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },
  {
    id: "note-003",
    category: "pet",
    subType: "feeding",
    entityId: 2, // Whiskers
    facilityId: 1,
    content:
      "Whiskers is on a grain-free diet. Owner brings Royal Canin Gastrointestinal. Feed 1/2 cup morning, 1/2 cup evening. Do NOT mix with facility food.",
    visibility: "internal",
    isPinned: false,
    createdAt: "2024-01-15T08:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    editHistory: [],
  },
  {
    id: "note-004",
    category: "pet",
    subType: "general",
    entityId: 1, // Buddy
    facilityId: 1,
    content:
      "Buddy's owner mentioned they're moving to a new address next month. Update contact info when confirmed.",
    visibility: "internal",
    isPinned: false,
    createdAt: "2024-02-10T14:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    editHistory: [],
  },
  {
    id: "note-005",
    category: "pet",
    subType: "behavior",
    entityId: 5, // Rocky
    facilityId: 1,
    content:
      "Rocky shows resource guarding behavior around food bowls. Always feed in isolated area. Do not approach while eating.",
    visibility: "internal",
    isPinned: true,
    createdAt: "2024-01-16T12:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    editHistory: [],
  },
  {
    id: "note-006",
    category: "pet",
    subType: "general",
    entityId: 14, // Fluffy
    facilityId: 1,
    content:
      "Fluffy has been doing much better with anxiety since starting daycare. Great improvement over last 3 visits!",
    visibility: "shared_with_customer",
    isPinned: false,
    createdAt: "2024-02-15T16:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },

  // Customer notes
  {
    id: "note-007",
    category: "customer",
    entityId: 1,
    facilityId: 1,
    content:
      "Premium customer since 2022. Always tips staff generously. Prefers text communication over phone calls.",
    visibility: "internal",
    isPinned: true,
    createdAt: "2024-01-10T09:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },
  {
    id: "note-008",
    category: "customer",
    entityId: 5,
    facilityId: 1,
    content:
      "Has outstanding invoice from December. Spoke with customer on 2/10 — promised to pay by end of month. Follow up if not received.",
    visibility: "internal",
    isPinned: true,
    createdAt: "2024-02-10T15:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    updatedAt: "2024-02-15T10:00:00Z",
    updatedBy: "Sarah Johnson",
    updatedById: 1,
    editHistory: [
      {
        id: "edit-001",
        noteId: "note-008",
        previousContent:
          "Has outstanding invoice from December. Need to follow up.",
        newContent:
          "Has outstanding invoice from December. Spoke with customer on 2/10 — promised to pay by end of month. Follow up if not received.",
        editedAt: "2024-02-15T10:00:00Z",
        editedBy: "Sarah Johnson",
        editedById: 1,
      },
    ],
  },
  {
    id: "note-009",
    category: "customer",
    entityId: 2,
    facilityId: 1,
    content:
      "Always arrives 15 minutes early. Very detail-oriented about pet care. Appreciates thorough report cards.",
    visibility: "internal",
    isPinned: false,
    createdAt: "2024-01-25T11:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },

  // Booking notes
  {
    id: "note-010",
    category: "booking",
    entityId: 1,
    facilityId: 1,
    content:
      "Owner requests early morning drop-off at 7 AM (before normal hours). Manager approved. Assign front desk to open early.",
    visibility: "internal",
    isPinned: true,
    createdAt: "2024-03-01T10:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },
  {
    id: "note-011",
    category: "booking",
    entityId: 3,
    facilityId: 1,
    content:
      "First time boarding. Owner is anxious — please send extra photo updates during the stay. At least 3 per day.",
    visibility: "internal",
    isPinned: false,
    createdAt: "2024-03-05T11:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    editHistory: [],
  },
  {
    id: "note-012",
    category: "booking",
    entityId: 5,
    facilityId: 1,
    content:
      "Behavioral assessment scheduled before grooming. Groomer must be present during evaluation. Do NOT proceed with grooming if assessment fails.",
    visibility: "internal",
    isPinned: true,
    createdAt: "2024-03-10T09:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },
  {
    id: "note-013",
    category: "booking",
    entityId: 2,
    facilityId: 1,
    content:
      "Pet showed mild limping after daycare session. Follow up with owner about vet check. Document any further observations.",
    visibility: "shared_with_customer",
    isPinned: false,
    createdAt: "2024-03-15T15:00:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
    editHistory: [],
  },

  // Incident notes
  {
    id: "note-014",
    category: "incident",
    entityId: 1, // incident ID
    facilityId: 1,
    content:
      "Reviewed security camera footage. Incident occurred during free play in yard 2 at approximately 2:15 PM. Two dogs involved.",
    visibility: "internal",
    isPinned: false,
    createdAt: "2024-02-20T16:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },

  // Internal staff notes
  {
    id: "note-015",
    category: "internal_staff",
    entityId: 1, // staff member ID
    facilityId: 1,
    content:
      "Completed Fear Free certification. Excellent with anxious dogs. Consider assigning high-anxiety pets to this team member.",
    visibility: "internal",
    isPinned: false,
    createdAt: "2024-02-01T09:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },
  {
    id: "note-016",
    category: "internal_staff",
    entityId: 2, // staff member ID
    facilityId: 1,
    content:
      "Great at handling large breed dogs. Very patient during grooming sessions. Consider for difficult grooming appointments.",
    visibility: "internal",
    isPinned: false,
    createdAt: "2024-02-05T10:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
    editHistory: [],
  },
];

// ========================================
// DEFAULT SETTINGS
// ========================================

const MANAGEMENT_ROLES: FacilityRole[] = ["owner", "manager"];

export const defaultTagNoteSettings: TagNoteSettings = {
  facilityId: 1,
  tagSettings: {
    petTagsEnabled: true,
    customerTagsEnabled: true,
    bookingTagsEnabled: true,
    defaultVisibility: "internal",
    defaultScope: "global",
  },
  noteSettings: {
    defaultVisibility: "internal",
    rolePermissions: {
      pet: {
        view: ALL_FACILITY_ROLES,
        create: ALL_FACILITY_ROLES,
        edit: [...MANAGEMENT_ROLES, "front_desk"],
        delete: MANAGEMENT_ROLES,
      },
      customer: {
        view: [...MANAGEMENT_ROLES, "front_desk"],
        create: [...MANAGEMENT_ROLES, "front_desk"],
        edit: MANAGEMENT_ROLES,
        delete: MANAGEMENT_ROLES,
      },
      booking: {
        view: ALL_FACILITY_ROLES,
        create: ALL_FACILITY_ROLES,
        edit: [...MANAGEMENT_ROLES, "front_desk"],
        delete: MANAGEMENT_ROLES,
      },
      incident: {
        view: [...MANAGEMENT_ROLES, "front_desk"],
        create: [...MANAGEMENT_ROLES, "front_desk"],
        edit: MANAGEMENT_ROLES,
        delete: MANAGEMENT_ROLES,
      },
      internal_staff: {
        view: MANAGEMENT_ROLES,
        create: MANAGEMENT_ROLES,
        edit: MANAGEMENT_ROLES,
        delete: MANAGEMENT_ROLES,
      },
    },
  },
  automationRules: [],
};

// ========================================
// HELPER FUNCTIONS
// ========================================

const PRIORITY_ORDER: Record<TagPriority, number> = {
  critical: 0,
  warning: 1,
  informational: 2,
};

/** Get all tags assigned to an entity, sorted by priority (critical first). */
export function getTagsForEntity(entityType: TagType, entityId: number): Tag[] {
  const assignedTagIds = new Set(
    tagAssignments
      .filter((a) => a.entityType === entityType && a.entityId === entityId)
      .map((a) => a.tagId),
  );

  return tags
    .filter((t) => assignedTagIds.has(t.id) && t.isActive)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

/** Get tag assignments for an entity. */
export function getAssignmentsForEntity(
  entityType: TagType,
  entityId: number,
): TagAssignment[] {
  return tagAssignments.filter(
    (a) => a.entityType === entityType && a.entityId === entityId,
  );
}

/** Get a single tag by ID. */
export function getTagById(tagId: string): Tag | undefined {
  return tags.find((t) => t.id === tagId);
}

/** Get all tag definitions of a given type. */
export function getTagsByType(type: TagType): Tag[] {
  return tags.filter((t) => t.type === type && t.isActive);
}

/** Check if an entity has any critical-priority tags assigned. */
export function hasCriticalTags(
  entityType: TagType,
  entityId: number,
): boolean {
  return getTagsForEntity(entityType, entityId).some(
    (t) => t.priority === "critical",
  );
}

/** Check if an entity has any warning-priority tags assigned. */
export function hasWarningTags(entityType: TagType, entityId: number): boolean {
  return getTagsForEntity(entityType, entityId).some(
    (t) => t.priority === "warning",
  );
}

/** Get all notes for an entity, with optional sub-type filter. Pinned notes first. */
export function getNotesForEntity(
  category: NoteCategory,
  entityId: number,
  filterSubType?: PetNoteSubType,
): Note[] {
  return notes
    .filter(
      (n) =>
        n.category === category &&
        n.entityId === entityId &&
        (filterSubType == null || n.subType === filterSubType),
    )
    .sort((a, b) => {
      // Pinned first
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      // Then by date descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/** Get only pinned notes for an entity. */
export function getPinnedNotes(
  category: NoteCategory,
  entityId: number,
): Note[] {
  return notes.filter(
    (n) => n.category === category && n.entityId === entityId && n.isPinned,
  );
}

/** Get note count for an entity. */
export function getNoteCount(category: NoteCategory, entityId: number): number {
  return notes.filter((n) => n.category === category && n.entityId === entityId)
    .length;
}

// ========================================
// BACKWARD COMPATIBILITY — Legacy PetTag shape
// ========================================

export interface LegacyPetTag {
  id: string;
  name: string;
  color: string; // tailwind color class e.g. "bg-blue-500"
  description?: string;
}

export interface LegacyPetTagAssignment {
  id: string;
  petId: number;
  tagId: string;
  assignedAt: string;
  assignedBy: string;
  assignedById: number;
}

const HEX_TO_TAILWIND: Record<string, string> = Object.fromEntries(
  Object.entries(TAILWIND_TO_HEX).map(([tw, hex]) => [hex, tw]),
);

/** Get legacy-format pet tags for backward compatibility. */
export function getLegacyPetTags(): LegacyPetTag[] {
  return tags
    .filter((t) => t.type === "pet" && t.isActive)
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: HEX_TO_TAILWIND[t.color] ?? "bg-gray-500",
      description: t.description,
    }));
}

/** Get legacy-format pet tag assignments for backward compatibility. */
export function getLegacyPetTagAssignments(): LegacyPetTagAssignment[] {
  return tagAssignments
    .filter((a) => a.entityType === "pet")
    .map((a) => ({
      id: a.id,
      petId: a.entityId,
      tagId: a.tagId,
      assignedAt: a.assignedAt,
      assignedBy: a.assignedBy,
      assignedById: a.assignedById,
    }));
}
