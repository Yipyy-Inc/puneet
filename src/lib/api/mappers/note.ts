import { z } from "zod";

import type { Note, NoteCategory, NoteEdit } from "@/types/tags";

// ============================================================================
// public.notes ⇄ the `Note` the shared note components read.
//
// A screen names what a note is about by the numeric `ref` it already holds —
// the same convention the tag assignments use — and the route resolves that to
// the row's uuid. Staff have no `ref`, so `internal_staff` notes are not
// reachable through this seam yet; nothing renders one today.
// ============================================================================

export type NoteEntityCategory = Exclude<NoteCategory, "internal_staff">;

export const NOTE_ENTITY_TABLE: Record<
  NoteEntityCategory,
  "pets" | "clients" | "bookings" | "incidents"
> = {
  pet: "pets",
  customer: "clients",
  booking: "bookings",
  incident: "incidents",
};

export const noteEntityCategorySchema = z.enum([
  "pet",
  "customer",
  "booking",
  "incident",
]);

export const NOTE_SELECT =
  "id, category, sub_type, entity_id, content, visibility, is_pinned, edit_history, created_by_name, updated_by_name, created_at, updated_at";

export type NoteRow = {
  id: string;
  category: NoteCategory;
  sub_type: Note["subType"] | null;
  entity_id: string;
  content: string;
  visibility: Note["visibility"];
  is_pinned: boolean;
  edit_history: NoteEdit[] | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToNote(row: NoteRow, entityRef: number): Note {
  const edits = row.edit_history ?? [];
  return {
    id: row.id,
    category: row.category,
    subType: row.sub_type ?? undefined,
    entityId: entityRef,
    content: row.content,
    visibility: row.visibility,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    createdBy: row.created_by_name ?? "",
    // Only an edit to the words counts as an update: a pin or a visibility
    // change moves `updated_at` too, and "edited" over an unedited note is
    // not true.
    updatedAt: edits.length > 0 ? row.updated_at : undefined,
    updatedBy:
      edits.length > 0 ? (row.updated_by_name ?? undefined) : undefined,
    editHistory: edits,
  };
}

export const noteWriteSchema = z.object({
  category: noteEntityCategorySchema,
  entityRef: z.number().int().positive(),
  content: z.string().trim().min(1).max(5000),
  visibility: z.enum(["internal", "shared_with_customer"]).optional(),
  subType: z.enum(["general", "behavior", "medical", "feeding"]).optional(),
  isPinned: z.boolean().optional(),
});
export type NoteWrite = z.infer<typeof noteWriteSchema>;

export const notePatchSchema = z
  .object({
    content: z.string().trim().min(1).max(5000).optional(),
    visibility: z.enum(["internal", "shared_with_customer"]).optional(),
    isPinned: z.boolean().optional(),
  })
  .refine((p) => Object.keys(p).length > 0, "Nothing to change.");
export type NotePatch = z.infer<typeof notePatchSchema>;
