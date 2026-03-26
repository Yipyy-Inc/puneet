"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type {
  TagType,
  TagAssignment,
  Note,
  NoteCategory,
  NoteVisibility,
  PetNoteSubType,
  NoteEdit,
} from "@/data/tags-notes";
import {
  tags as allTags,
  tagAssignments as allAssignments,
  notes as allNotes,
} from "@/data/tags-notes";
import {
  logTagAssigned,
  logTagUnassigned,
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

export function useTagsForEntity(entityType: TagType, entityId: number) {
  const [assignments, setAssignments] = useState<TagAssignment[]>(() =>
    allAssignments.filter(
      (a) => a.entityType === entityType && a.entityId === entityId,
    ),
  );

  const tags = useMemo(() => {
    const assignedTagIds = new Set(assignments.map((a) => a.tagId));
    return allTags
      .filter((t) => assignedTagIds.has(t.id) && t.isActive)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [assignments]);

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
      const newAssignment: TagAssignment = {
        id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tagId,
        entityType,
        entityId,
        assignedAt: new Date().toISOString(),
        assignedBy: "Current User",
        assignedById: 1,
      };
      setAssignments((prev) => [...prev, newAssignment]);
      // Also push to global mock array
      allAssignments.push(newAssignment);
      logTagAssigned({
        facilityId: 1,
        tagId,
        targetType: entityType,
        targetId: entityId,
        actorId: 1,
        actorName: "Current User",
      });
      const tagDef = allTags.find((t) => t.id === tagId);
      toast.success(`Tag "${tagDef?.name ?? "Tag"}" assigned`);
    },
    [entityType, entityId],
  );

  const unassign = useCallback(
    (assignmentId: string) => {
      const removed = assignments.find((a) => a.id === assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      // Also remove from global mock array
      const idx = allAssignments.findIndex((a) => a.id === assignmentId);
      if (idx >= 0) allAssignments.splice(idx, 1);
      if (removed) {
        const tagDef = allTags.find((t) => t.id === removed.tagId);
        logTagUnassigned({
          facilityId: 1,
          tagId: removed.tagId,
          targetType: entityType,
          targetId: entityId,
          actorId: 1,
          actorName: "Current User",
        });
        toast.success(`Tag "${tagDef?.name ?? "Tag"}" removed`);
      }
    },
    [assignments, entityType, entityId],
  );

  return { tags, assignments, hasCritical, hasWarning, assign, unassign };
}

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
