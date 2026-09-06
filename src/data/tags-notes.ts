// ============================================================================
// NOTES — the fixture half that is still a fixture.
//
// ── THE TAGS ARE GONE FROM HERE ───────────────────────────────────────────
//
// This file held 76 tags, 41 assignments, a 15-colour Tailwind palette and six
// lookup helpers. On 2026-09-06 all of it moved to `public.facility_tags` and
// `public.facility_tag_assignments` — tables that had existed since
// 20260828134018 carrying zero rows while every screen read this array. Read
// them through `/api/tags`: `useTagCatalogue`, `useTagsForEntity` and
// `useTagsByEntity`. The palette a facility may choose from is now
// src/lib/tag-colors.ts, and it is the §3 status inks rather than raw Tailwind.
//
// ── WHAT IS LEFT, AND WHY IT IS STILL HERE ────────────────────────────────
//
// The NOTES. They are a separate conversion with a separate table: a note has
// edit history, a pin, a visibility a customer depends on, and — since
// 2026-09-06 — a per-role permission grid in `facility_settings` that
// `NotesList` actually enforces. Moving tags and notes in one change would have
// been two migrations and forty call sites in a diff nobody could review.
//
// So a note added on any screen still dies with the tab, and
// `useNotesForEntity` still mutates the `notes` array below. Recorded in the
// debt map; nothing here should be extended.
// ============================================================================

import { ALL_FACILITY_ROLES, type FacilityRole } from "@/lib/role-utils";

// Types re-exported from @/types/tags (single source of truth)
export type {
  NoteCategory,
  PetNoteSubType,
  NoteVisibility,
  NoteEdit,
  Note,
  NoteRolePermissions,
  TagNoteSettings,
  TagAutomationRule,
} from "@/types/tags";
import type {
  NoteCategory,
  PetNoteSubType,
  Note,
  NoteVisibility,
  TagNoteSettings,
} from "@/types/tags";

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

// Monotonic suffix so appended note ids stay unique within a millisecond.
let appendNoteSeq = 0;

/**
 * Append a structured note to the shared store (same array `useNotesForEntity`
 * reads). Used to mirror external events — e.g. a logged incident follow-up
 * conversation — into an entity's Structured Notes. Returns the created note.
 */
export function appendNote(params: {
  category: NoteCategory;
  entityId: number;
  content: string;
  facilityId?: number;
  visibility?: NoteVisibility;
  createdBy?: string;
}): Note {
  const note: Note = {
    id: `note-${new Date().getTime()}-${(appendNoteSeq += 1)}`,
    category: params.category,
    entityId: params.entityId,
    facilityId: params.facilityId ?? 1,
    content: params.content,
    visibility: params.visibility ?? "internal",
    isPinned: false,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy ?? "Current User",
    createdById: 1,
    editHistory: [],
  };
  notes.push(note);
  return note;
}
