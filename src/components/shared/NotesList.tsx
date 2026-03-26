"use client";

import { useState } from "react";
import { Plus, MessageSquare, StickyNote, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/shared/NoteCard";
import { AddNoteModal } from "@/components/shared/AddNoteModal";
import { NoteHistoryModal } from "@/components/shared/NoteHistoryModal";
import { useNotesForEntity } from "@/hooks/use-tags-notes";
import type { NoteCategory, PetNoteSubType, Note } from "@/data/tags-notes";
import { cn } from "@/lib/utils";

interface NotesListProps {
  category: NoteCategory;
  entityId: number;
  facilityId?: number;
  compact?: boolean;
  readOnly?: boolean;
  className?: string;
}

const PET_SUBTYPES: { value: PetNoteSubType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "behavior", label: "Behavior" },
  { value: "medical", label: "Medical" },
  { value: "feeding", label: "Feeding" },
];

export function NotesList({
  category,
  entityId,
  facilityId = 1,
  compact = false,
  readOnly = false,
  className,
}: NotesListProps) {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleVisibility,
  } = useNotesForEntity(category, entityId, facilityId);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [historyNote, setHistoryNote] = useState<Note | null>(null);
  const [filterSubType, setFilterSubType] = useState<PetNoteSubType | "all">(
    "all",
  );

  const showSubTypeFilter = category === "pet";
  const showSubTypeSelector = category === "pet";

  const filteredNotes =
    filterSubType === "all"
      ? notes
      : notes.filter((n) => n.subType === filterSubType);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showSubTypeFilter && (
            <div className="flex gap-1">
              {PET_SUBTYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  role="tab"
                  aria-selected={filterSubType === st.value}
                  aria-label={`Filter by ${st.label} notes`}
                  onClick={() => setFilterSubType(st.value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-colors",
                    filterSubType === st.value
                      ? "bg-primary text-primary-foreground"
                      : `bg-muted text-muted-foreground hover:bg-accent`,
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="size-3" />
            Add Note
          </Button>
        )}
      </div>

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
          {compact ? (
            <MessageSquare className="mb-1 size-6" />
          ) : (
            <StickyNote className="mb-2 size-8" />
          )}
          <p className="text-sm">No notes yet</p>
          {!readOnly && (
            <p className="mt-1 text-xs">
              Click &quot;Add Note&quot; to create one
            </p>
          )}
        </div>
      ) : (
        <div className={cn("space-y-2", compact && "space-y-1.5")}>
          {/* Pinned notes section */}
          {(() => {
            const pinned = filteredNotes.filter((n) => n.isPinned);
            const unpinned = filteredNotes.filter((n) => !n.isPinned);
            const hasBothSections = pinned.length > 0 && unpinned.length > 0;

            const renderNote = (note: Note) => (
              <NoteCard
                key={note.id}
                note={note}
                readOnly={readOnly}
                onEdit={() => setEditingNote(note)}
                onDelete={() => deleteNote(note.id)}
                onTogglePin={() => togglePin(note.id)}
                onToggleVisibility={() => toggleVisibility(note.id)}
                onViewHistory={
                  note.editHistory.length > 0
                    ? () => setHistoryNote(note)
                    : undefined
                }
              />
            );

            return (
              <>
                {pinned.length > 0 && (
                  <>
                    {hasBothSections && (
                      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
                        <Pin className="size-3" />
                        Pinned
                      </div>
                    )}
                    {pinned.map(renderNote)}
                  </>
                )}
                {hasBothSections && (
                  <div className="text-muted-foreground flex items-center gap-2 pt-2 text-xs font-medium tracking-wider uppercase">
                    All Notes
                  </div>
                )}
                {unpinned.map(renderNote)}
              </>
            );
          })()}
        </div>
      )}

      {/* Add Note Modal */}
      <AddNoteModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        showSubType={showSubTypeSelector}
        onSave={(params) => {
          addNote(params);
        }}
      />

      {/* Edit Note Modal */}
      {editingNote && (
        <AddNoteModal
          open={!!editingNote}
          onOpenChange={(open) => {
            if (!open) setEditingNote(null);
          }}
          editNote={editingNote}
          showSubType={showSubTypeSelector}
          onSave={(params) => {
            updateNote(editingNote.id, params.content);
            setEditingNote(null);
          }}
        />
      )}

      {/* History Modal */}
      {historyNote && (
        <NoteHistoryModal
          open={!!historyNote}
          onOpenChange={(open) => {
            if (!open) setHistoryNote(null);
          }}
          edits={historyNote.editHistory}
          currentContent={historyNote.content}
        />
      )}
    </div>
  );
}
