"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type {
  Tag,
  TagType,
  Note,
  NoteCategory,
  NoteVisibility,
  PetNoteSubType,
  NoteEdit,
} from "@/types/tags";
import { notes as allNotes } from "@/data/tags-notes";
import { useAssignTag, useTagCatalogue, useUnassignTag } from "@/lib/api/tags";
import {
  logNoteCreated,
  logNoteUpdated,
  logNoteDeleted,
  logNotePinToggled,
  logNoteVisibilityChanged,
} from "@/lib/tag-note-audit";

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

export function useNotesForEntity(
  category: NoteCategory,
  entityId: number,
  facilityId: number = 1,
) {
  const [notesList, setNotesList] = useState<Note[]>(() =>
    allNotes
      .filter((n) => n.category === category && n.entityId === entityId)
      .sort(sortNotes),
  );

  const pinnedNotes = useMemo(
    () => notesList.filter((n) => n.isPinned),
    [notesList],
  );

  const noteCount = notesList.length;

  const addNote = useCallback(
    (params: {
      content: string;
      visibility?: NoteVisibility;
      subType?: PetNoteSubType;
      isPinned?: boolean;
    }) => {
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category,
        subType: params.subType,
        entityId,
        facilityId,
        content: params.content,
        visibility: params.visibility ?? "internal",
        isPinned: params.isPinned ?? false,
        createdAt: new Date().toISOString(),
        createdBy: "Current User",
        createdById: 1,
        editHistory: [],
      };
      setNotesList((prev) => {
        const updated = [newNote, ...prev];
        return updated.sort(sortNotes);
      });
      allNotes.push(newNote);
      logNoteCreated({
        facilityId,
        noteId: newNote.id,
        category,
        targetId: entityId,
        actorId: 1,
        actorName: "Current User",
      });
      toast.success("Note added");
    },
    [category, entityId, facilityId],
  );

  const updateNote = useCallback(
    (noteId: string, newContent: string) => {
      const oldNote = notesList.find((n) => n.id === noteId);
      const oldContent = oldNote?.content ?? "";
      setNotesList((prev) =>
        prev.map((n) => {
          if (n.id !== noteId) return n;
          const edit: NoteEdit = {
            id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            noteId,
            previousContent: n.content,
            newContent,
            editedAt: new Date().toISOString(),
            editedBy: "Current User",
            editedById: 1,
          };
          return {
            ...n,
            content: newContent,
            updatedAt: new Date().toISOString(),
            updatedBy: "Current User",
            updatedById: 1,
            editHistory: [...n.editHistory, edit],
          };
        }),
      );
      logNoteUpdated({
        facilityId,
        noteId,
        actorId: 1,
        actorName: "Current User",
        changes: [
          {
            field: "content",
            oldValue: oldContent.slice(0, 100),
            newValue: newContent.slice(0, 100),
          },
        ],
      });
      toast.success("Note updated");
    },
    [facilityId, notesList],
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      setNotesList((prev) => prev.filter((n) => n.id !== noteId));
      const idx = allNotes.findIndex((n) => n.id === noteId);
      if (idx >= 0) allNotes.splice(idx, 1);
      logNoteDeleted({
        facilityId,
        noteId,
        actorId: 1,
        actorName: "Current User",
      });
      toast.success("Note deleted");
    },
    [facilityId],
  );

  const togglePin = useCallback(
    (noteId: string) => {
      setNotesList((prev) => {
        const updated = prev.map((n) =>
          n.id === noteId ? { ...n, isPinned: !n.isPinned } : n,
        );
        return updated.sort(sortNotes);
      });
      const note = notesList.find((n) => n.id === noteId);
      if (note) {
        logNotePinToggled({
          facilityId,
          noteId,
          pinned: !note.isPinned,
          actorId: 1,
          actorName: "Current User",
        });
      }
    },
    [facilityId, notesList],
  );

  const toggleVisibility = useCallback(
    (noteId: string) => {
      setNotesList((prev) =>
        prev.map((n) => {
          if (n.id !== noteId) return n;
          const newVis: NoteVisibility =
            n.visibility === "internal" ? "shared_with_customer" : "internal";
          logNoteVisibilityChanged({
            facilityId,
            noteId,
            oldVisibility: n.visibility,
            newVisibility: newVis,
            actorId: 1,
            actorName: "Current User",
          });
          return { ...n, visibility: newVis };
        }),
      );
    },
    [facilityId],
  );

  return {
    notes: notesList,
    pinnedNotes,
    noteCount,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleVisibility,
  };
}
