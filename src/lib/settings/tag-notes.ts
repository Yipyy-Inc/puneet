import { z } from "zod";

import {
  noteCategoryEnum,
  noteVisibilityEnum,
  tagAutomationRuleSchema,
  tagScopeEnum,
  tagVisibilityEnum,
} from "@/types/tags";
import type { NoteCategory } from "@/types/tags";

// ============================================================================
// A facility's tag and note policy: which tag types it uses, what a new tag or
// note defaults to, and WHO MAY READ, WRITE, EDIT AND DELETE a note of each
// category.
//
// ── WHERE THIS USED TO LIVE ───────────────────────────────────────────────
//
// `useState(defaultTagNoteSettings)`, and nowhere else. The screen has switches
// and a full permission grid, and every one of them was discarded on reload.
//
// ── AND THE PERMISSIONS DECIDED NOTHING EVEN BEFORE THAT ─────────────────
//
// This is the part worth reading twice, because it is why persisting the
// settings alone would have made things WORSE rather than better.
//
// `noteSettings.rolePermissions` is a five-category grid — pet, customer,
// booking, incident, internal_staff — each with view / create / edit / delete
// against the six facility roles. Measured 2026-09-06: the string
// `rolePermissions` appeared in exactly one component, the settings editor
// itself. NotesList, NoteCard, NotesButton and AddNoteModal never read it. So a
// facility could say "only management may delete a pet note", watch the grid
// save, and every kennel tech still had the delete button.
//
// Storing an inert permission is not an improvement on discarding one — it is a
// more durable lie, and `check:inert-permissions` exists for exactly this
// shape. So the domain landed WITH `canActOnNotes()` below being called by the
// surface that renders those controls. The setting and its enforcement are one
// change on purpose.
//
// ── WHAT IS NOT STORED ────────────────────────────────────────────────────
//
// `facilityId`. It is row metadata, and a facility id inside a facility-scoped
// row is the shape `check:facility-from-session` exists to prevent — see the
// same note on lib/settings/yipyy-go.ts.
// ============================================================================

/** view / create / edit / delete, each naming the facility roles allowed. */
const noteRolePermissionsSchema = z.object({
  view: z.array(z.string()),
  create: z.array(z.string()),
  edit: z.array(z.string()),
  delete: z.array(z.string()),
});

export const tagNoteSettingsSchema = z.object({
  tagSettings: z.object({
    petTagsEnabled: z.boolean(),
    customerTagsEnabled: z.boolean(),
    bookingTagsEnabled: z.boolean(),
    defaultVisibility: tagVisibilityEnum,
    defaultScope: tagScopeEnum,
  }),
  noteSettings: z.object({
    rolePermissions: z.record(noteCategoryEnum, noteRolePermissionsSchema),
    defaultVisibility: noteVisibilityEnum,
  }),
  automationRules: z.array(tagAutomationRuleSchema),
});

export type TagNotePolicy = z.infer<typeof tagNoteSettingsSchema>;

export type NoteAction = "view" | "create" | "edit" | "delete";

// ── THE DEFAULT IS SPELLED OUT HERE, NOT IMPORTED FROM THE FIXTURE ───────
//
// The obvious version was `const { facilityId, ...policy } =
// defaultTagNoteSettings` off `@/data/tags-notes`. It typechecked, and it broke
// the BUILD:
//
//   Error [DataCloneError]: Attempted to call ALL_FACILITY_ROLES() from the
//   server but ALL_FACILITY_ROLES is on the client
//   Failed to collect page data for /api/facility/settings
//
// `src/lib/role-utils.ts` is a `"use client"` module, `@/data/tags-notes`
// imports it for `ALL_FACILITY_ROLES`, and this file is reached by
// `lib/settings/domains.ts` — which the SERVER settings route imports to
// validate a write. A domain module is server-side code, so it may not pull a
// fixture that reaches a client boundary.
//
// Spelling the roles out is also the more honest shape: a fallback that a
// facility's data is measured against should not move because a fixture was
// edited.
const MANAGEMENT: string[] = ["owner", "manager"];
const FRONT_OF_HOUSE: string[] = [...MANAGEMENT, "front_desk"];
const EVERYONE: string[] = [
  "owner",
  "manager",
  "front_desk",
  "groomer",
  "trainer",
  "kennel_tech",
];

/**
 * What a facility that has never opened this screen uses: permissive for `view`
 * and `create`, with `delete` reserved to management.
 *
 * Cloned on every read — the domain fallback is handed straight to a component
 * that will edit it.
 */
export function defaultTagNotePolicy(): TagNotePolicy {
  return structuredClone({
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
          view: EVERYONE,
          create: EVERYONE,
          edit: FRONT_OF_HOUSE,
          delete: MANAGEMENT,
        },
        customer: {
          view: FRONT_OF_HOUSE,
          create: FRONT_OF_HOUSE,
          edit: MANAGEMENT,
          delete: MANAGEMENT,
        },
        booking: {
          view: EVERYONE,
          create: EVERYONE,
          edit: FRONT_OF_HOUSE,
          delete: MANAGEMENT,
        },
        incident: {
          view: FRONT_OF_HOUSE,
          create: FRONT_OF_HOUSE,
          edit: MANAGEMENT,
          delete: MANAGEMENT,
        },
        internal_staff: {
          view: MANAGEMENT,
          create: MANAGEMENT,
          edit: MANAGEMENT,
          delete: MANAGEMENT,
        },
      },
    },
    automationRules: [],
  }) as TagNotePolicy;
}

/** The inert value the registry hands out. See `defaultTagNotePolicy()`. */
export const DEFAULT_TAG_NOTE_POLICY: TagNotePolicy = defaultTagNotePolicy();

/**
 * May a member of staff holding `role` do `action` to a note of `category`?
 *
 * ── THE TWO WAYS THIS COULD BE WRONG, AND WHY IT FAILS OPEN ──────────────
 *
 * A category missing from the grid means the facility's stored row predates it,
 * not that nobody may touch it. Failing CLOSED there would hide every incident
 * note from every role the moment a category is added, on a screen staff use to
 * record what happened to an animal. So an absent category is permitted, and
 * the grid is the thing that narrows.
 *
 * That is the same argument SHIPPED_VACCINATION_RULES makes in reverse: an
 * unset FEE fails safe by charging nothing, an unset RULE fails open. This is a
 * rule about reading a note, not about money.
 *
 * `role` is nullable because the caller may not have one — see the `audience`
 * prop on NotesList. A caller with no facility role is not staff, and is not
 * governed by a facility-role grid; it must be gated by audience instead, which
 * is why this returns false rather than guessing.
 */
export function canActOnNotes(
  policy: TagNotePolicy,
  category: NoteCategory,
  action: NoteAction,
  role: string | null | undefined,
): boolean {
  if (!role) return false;
  const permissions = policy.noteSettings.rolePermissions[category];
  if (!permissions) return true; // category not in the grid — see above
  return permissions[action].includes(role);
}
