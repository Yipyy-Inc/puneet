"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import type {
  Tag,
  TagType,
  Note,
  NoteCategory,
  NoteVisibility,
  PetNoteSubType,
} from "@/types/tags";
import { useAssignTag, useTagCatalogue, useUnassignTag } from "@/lib/api/tags";
import { useEntityNotes, useNoteMutations } from "@/lib/api/notes";
import { useShellText } from "@/lib/shell/use-shell-text";

// ========================================
// PRIORITY ORDERING
// ========================================

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  informational: 2,
};

function sortNotes(a: Note, b: Note): number {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// ========================================
// useTagsForEntity
// ========================================

/**
 * The tags on one pet, client or booking.
 *
 * ── WHAT CHANGED ON 2026-09-06 ───────────────────────────────────────────
 *
 * This used to `useState` a slice of a module-level fixture array and then
 * `push`/`splice` that array on every assign and unassign. Two consequences,
 * neither of them visible on screen: a tag applied on one page appeared on
 * another until the tab was closed, and then vanished. And the toast said
 * "assigned" either way.
 *
 * Now `/api/tags` answers, the mutations write to
 * `public.facility_tag_assignments`, and a failure shows the reason the route
 * gave rather than a success message. The RETURN SHAPE is unchanged so the
 * nineteen call sites did not have to be — `pending` is added, and every
 * consumer that wants a skeleton can now have one.
 */
export function useTagsForEntity(entityType: TagType, entityId: number) {
  const { tags: catalogue, assignments: all, pending } = useTagCatalogue();
  const assignTag = useAssignTag();
  const unassignTag = useUnassignTag();

  const assignments = useMemo(
    () =>
      all.filter((a) => a.entityType === entityType && a.entityId === entityId),
    [all, entityType, entityId],
  );

  const tags = useMemo(() => {
    const assignedTagIds = new Set(assignments.map((a) => a.tagId));
    return catalogue
      .filter((t) => assignedTagIds.has(t.id) && t.isActive)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [assignments, catalogue]);

  const hasCritical = useMemo(
    () => tags.some((t) => t.priority === "critical"),
    [tags],
  );

  const hasWarning = useMemo(
    () => tags.some((t) => t.priority === "warning"),
    [tags],
  );

  const assign = useCallback(
    (tagId: string) => {
      const tagDef = catalogue.find((t) => t.id === tagId);
      const name = tagDef?.name ?? "That tag";
      assignTag.mutate(
        { tagId, entityType, entityRef: entityId },
        {
          onSuccess: () => toast.success(`${name} added`),
          onError: (error: Error) => toast.error(error.message),
        },
      );
    },
    [assignTag, catalogue, entityType, entityId],
  );

  const unassign = useCallback(
    (assignmentId: string) => {
      const removed = assignments.find((a) => a.id === assignmentId);
      const tagDef = catalogue.find((t) => t.id === removed?.tagId);
      const name = tagDef?.name ?? "That tag";
      unassignTag.mutate(assignmentId, {
        onSuccess: () => toast.success(`${name} removed`),
        onError: (error: Error) => toast.error(error.message),
      });
    },
    [assignments, catalogue, unassignTag],
  );

  return {
    tags,
    assignments,
    hasCritical,
    hasWarning,
    assign,
    unassign,
    pending,
    saving: assignTag.isPending || unassignTag.isPending,
  };
}

/**
 * Tags for MANY entities, for a screen that renders a row per pet.
 *
 * `useTagsForEntity` is a hook, so it cannot be called inside a `.map()` — and
 * the fixture era hid that, because `getTagsForEntity(...)` was a plain
 * function a render loop could call forty times. This is the honest version:
 * one query, and a lookup the loop calls.
 */
export function useTagsByEntity() {
  const { tags: catalogue, assignments, pending } = useTagCatalogue();

  const byEntity = useMemo(() => {
    const active = new Map(
      catalogue.filter((t) => t.isActive).map((t) => [t.id, t]),
    );
    const map = new Map<string, Tag[]>();
    for (const assignment of assignments) {
      const tag = active.get(assignment.tagId);
      if (!tag) continue;
      const key = `${assignment.entityType}:${assignment.entityId}`;
      const list = map.get(key) ?? [];
      list.push(tag);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      );
    }
    return map;
  }, [catalogue, assignments]);

  const tagsFor = useCallback(
    (entityType: TagType, entityId: number | undefined): Tag[] =>
      entityId === undefined
        ? EMPTY_TAGS
        : (byEntity.get(`${entityType}:${entityId}`) ?? EMPTY_TAGS),
    [byEntity],
  );

  return { tagsFor, catalogue, pending };
}

/** A stable empty array, so a consumer's `useMemo` does not re-run every render. */
const EMPTY_TAGS: Tag[] = [];

// ========================================
// useNotesForEntity
// ========================================

/**
 * The notes on one pet, client, booking or incident.
 *
 * ── WHAT CHANGED ON 2026-09-10 ───────────────────────────────────────────
 *
 * This kept notes in `useState` seeded from the `@/data/tags-notes` fixture
 * and pushed new ones onto that module array, logging each change to an
 * in-memory audit list nothing read. "Note added" was true until the next
 * reload, and a real pet whose numeric ref matched a fixture pet showed that
 * pet's notes. Now `/api/notes` answers and every change is a row in
 * `public.notes`; a refusal shows the reason the route gave.
 *
 * The RETURN SHAPE is unchanged, so the call sites were not touched. The
 * third argument is kept for them and ignored: the facility is the entity's,
 * asserted by the database (20260910201745).
 */
export function useNotesForEntity(
  category: NoteCategory,
  entityId: number,
  _facilityId?: number,
) {
  const t = useShellText("shared");
  const { notes: fetched, pending } = useEntityNotes(category, entityId);
  const { create, update, remove } = useNoteMutations(category, entityId);

  const notesList = useMemo(() => [...fetched].sort(sortNotes), [fetched]);
  const pinnedNotes = useMemo(
    () => notesList.filter((n) => n.isPinned),
    [notesList],
  );

  const fail = useCallback(
    (error: Error) =>
      toast.error(t("noteNotSaved"), { description: error.message }),
    [t],
  );

  const addNote = useCallback(
    (params: {
      content: string;
      visibility?: NoteVisibility;
      subType?: PetNoteSubType;
      isPinned?: boolean;
    }) => {
      create.mutate(params, {
        onSuccess: () => toast.success(t("noteAdded")),
        onError: fail,
      });
    },
    [create, fail, t],
  );

  const updateNote = useCallback(
    (noteId: string, newContent: string) => {
      update.mutate(
        { id: noteId, patch: { content: newContent } },
        { onSuccess: () => toast.success(t("noteUpdated")), onError: fail },
      );
    },
    [update, fail, t],
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      remove.mutate(noteId, {
        onSuccess: () => toast.success(t("noteDeleted")),
        onError: fail,
      });
    },
    [remove, fail, t],
  );

  const togglePin = useCallback(
    (noteId: string) => {
      const note = notesList.find((n) => n.id === noteId);
      if (!note) return;
      update.mutate(
        { id: noteId, patch: { isPinned: !note.isPinned } },
        {
          onSuccess: () =>
            toast.success(
              t(note.isPinned ? "noteUnpinnedDone" : "notePinnedDone"),
            ),
          onError: fail,
        },
      );
    },
    [notesList, update, fail, t],
  );

  const toggleVisibility = useCallback(
    (noteId: string) => {
      const note = notesList.find((n) => n.id === noteId);
      if (!note) return;
      const next: NoteVisibility =
        note.visibility === "internal" ? "shared_with_customer" : "internal";
      update.mutate(
        { id: noteId, patch: { visibility: next } },
        {
          onSuccess: () =>
            toast.success(
              t(next === "internal" ? "noteInternalDone" : "noteSharedDone"),
            ),
          onError: fail,
        },
      );
    },
    [notesList, update, fail, t],
  );

  return {
    notes: notesList,
    pinnedNotes,
    noteCount: notesList.length,
    pending,
    saving: create.isPending || update.isPending || remove.isPending,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleVisibility,
  };
}
