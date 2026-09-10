"use client";

import { useState } from "react";
import { Plus, MessageSquare, StickyNote, Pin, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/shared/NoteCard";
import { AddNoteModal } from "@/components/shared/AddNoteModal";
import { NoteHistoryModal } from "@/components/shared/NoteHistoryModal";
import { useNotesForEntity } from "@/hooks/use-tags-notes";
import type { NoteCategory, PetNoteSubType, Note } from "@/data/tags-notes";
import { useTagNotePolicy } from "@/lib/api/facility-settings";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { canActOnNotes, type NoteAction } from "@/lib/settings/tag-notes";
import { cn } from "@/lib/utils";
import { useShellText } from "@/lib/shell/use-shell-text";

interface NotesListProps {
  category: NoteCategory;
  entityId: number;
  facilityId?: number;
  compact?: boolean;
  readOnly?: boolean;
  className?: string;
  /**
   * Who is looking. STAFF by default, because every call site but one is inside
   * the facility portal.
   *
   * ── WHY THIS IS A PROP AND NOT SOMETHING WE WORK OUT ─────────────────────
   *
   * The obvious version — "ask the RBAC context whether there is a facility
   * viewer" — is a trap. `useFacilityRbac()` outside its provider does not
   * return null; it FALLS BACK TO THE OWNER with all access (see the comment on
   * that hook). The customer portal has no `FacilityRbacProvider`, so asking it
   * on /customer/pets would confidently answer "you are the owner" and pass
   * every permission check.
   *
   * `readOnly` is not a substitute either: a staff surface uses it too —
   * clients/[id]/page.tsx passes `readOnly={!canAddNoteForThisPet}` — so it
   * means "cannot write here", not "is a customer".
   *
   * A customer is not governed by a facility-role grid, so `audience="customer"`
   * skips it entirely and applies the rule that actually protects them: a note
   * marked `internal` is not theirs to read.
   */
  audience?: "staff" | "customer";
}

const PET_SUBTYPES: { value: PetNoteSubType | "all"; labelKey: string }[] = [
  { value: "all", labelKey: "filterAll" },
  { value: "general", labelKey: "noteGeneral" },
  { value: "behavior", labelKey: "noteBehaviour" },
  { value: "medical", labelKey: "noteMedical" },
  { value: "feeding", labelKey: "noteFeeding" },
];

export function NotesList({
  category,
  entityId,
  facilityId = 1,
  compact = false,
  readOnly = false,
  className,
  audience = "staff",
}: NotesListProps) {
  // Above the no-access return below, so the hook order never changes.
  const t = useShellText("shared");
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleVisibility,
  } = useNotesForEntity(category, entityId, facilityId);

  const { policy, isPending: policyPending } = useTagNotePolicy();
  const { viewer } = useFacilityViewer();

  // ── THE PERMISSION GRID DECIDES SOMETHING NOW ────────────────────────────
  //
  // `noteSettings.rolePermissions` is a five-category grid of view / create /
  // edit / delete against the six facility roles, and until 2026-09-06 the
  // string `rolePermissions` appeared in exactly ONE component — the settings
  // editor that writes it. This list, the card, the button and the modal all
  // ignored it, so a facility reserving deletion to management changed nothing.
  //
  // `policyPending` is folded in deliberately: the fallback is permissive, so
  // rendering through the pending state would show an edit and a delete button
  // to somebody the facility has excluded and then take them away. A control
  // that appears and vanishes is worse than one that arrives a moment late.
  const isStaff = audience === "staff";
  const role = isStaff ? viewer.primaryRole : null;
  const allowed = (action: NoteAction) =>
    isStaff && !policyPending && canActOnNotes(policy, category, action, role);

  const canView = !isStaff || allowed("view");
  const canCreate = !readOnly && allowed("create");
  const canEdit = !readOnly && allowed("edit");
  const canDelete = !readOnly && allowed("delete");

  // A customer reads what was shared with them, and nothing else. NOTHING
  // filtered on `visibility` before this: `useNotesForEntity` returns every
  // note on the entity, and NoteCard uses the field only to render a badge that
  // says "Internal" — so /customer/pets/[petId] showed a pet's owner every
  // internal note staff had written about them, correctly labelled as internal.
  const visibleNotes = isStaff
    ? notes
    : notes.filter((n) => n.visibility === "shared_with_customer");

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
      ? visibleNotes
      : visibleNotes.filter((n) => n.subType === filterSubType);

  // A role the facility has not admitted to this category is told so, rather
  // than shown an empty list. "No notes yet" and "not yours to read" are
  // different facts, and conflating them is how somebody concludes a pet has no
  // medical history. §5d2 gives this rung the `secure` pose; at this size it is
  // a Tier 1 glyph and a sentence, because §5d1's floor is 96px of clear
  // vertical room and a notes panel in a tab is often less.
  if (!canView) {
    return (
      <div
        className={cn(
          "text-ink-tertiary flex flex-col items-center justify-center gap-2 py-8 text-center",
          className,
        )}
      >
        <Lock className="size-6" />
        <p className="text-sm">{t("notesNoAccess")}</p>
      </div>
    );
  }

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
                  aria-label={t("filterNotesBy").replace(
                    "{kind}",
                    t(st.labelKey).toLowerCase(),
                  )}
                  onClick={() => setFilterSubType(st.value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-colors",
                    filterSubType === st.value
                      ? "bg-primary text-primary-foreground"
                      : `bg-muted text-muted-foreground hover:bg-accent`,
                  )}
                >
                  {t(st.labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>
        {canCreate && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="size-3" />
            {t("addNote")}
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
          <p className="text-sm">{t("noNotesYet")}</p>
          {canCreate && <p className="mt-1 text-xs">{t("noNotesHelp")}</p>}
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
                // Withheld rather than disabled: NoteCard already renders
                // nothing for an absent callback, and §6 rule 5 is that a
                // control nobody can use should not be there to reach for.
                onEdit={canEdit ? () => setEditingNote(note) : undefined}
                onDelete={canDelete ? () => deleteNote(note.id) : undefined}
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
                        {t("pinned")}
                      </div>
                    )}
                    {pinned.map(renderNote)}
                  </>
                )}
                {hasBothSections && (
                  <div className="text-muted-foreground flex items-center gap-2 pt-2 text-xs font-medium tracking-wider uppercase">
                    {t("allNotes")}
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
