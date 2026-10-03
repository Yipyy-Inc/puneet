"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { AddNoteModal } from "@/components/shared/AddNoteModal";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Note } from "@/data/tags-notes";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { useNotesForEntity } from "@/hooks/use-tags-notes";
import { useTagNotePolicy } from "@/lib/api/facility-settings";
import { formatRelative } from "@/lib/i18n/format";
import { canActOnNotes, type NoteAction } from "@/lib/settings/tag-notes";
import { useShellText } from "@/lib/shell/use-shell-text";

import { DetailsCard, DetailsCardHeader } from "./details-card";
import { HistoryCard } from "./history-card";
import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// Notes & history, as the mock draws them: a line to add a note for staff and
// its blue "Add note", the notes as quiet panels with who wrote them, then the
// booking's history.
//
// The booking's own notes (`notes`, category booking), under the facility's
// note permissions — the grid that decides who may view, add, edit and delete
// (tag-notes settings). What the mock leaves out stays reachable on a
// persistent ⋯, never on hover (§6 rule 5): edit, pin, share or unshare with
// the client, delete.
// ============================================================================

export function NotesTab({ d }: { d: BookingDetails }) {
  const { t, locale } = d.text;
  const shared = useShellText("shared");
  const booking = d.booking;
  const {
    notes,
    pending,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleVisibility,
  } = useNotesForEntity("booking", booking?.id ?? 0, 1);
  const { policy, isPending: policyPending } = useTagNotePolicy();
  const { viewer } = useFacilityViewer();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  if (!booking) return null;

  const allowed = (action: NoteAction) =>
    !policyPending &&
    canActOnNotes(policy, "booking", action, viewer.primaryRole);
  const canView = allowed("view");
  const canCreate = allowed("create");
  const canEdit = allowed("edit");
  const canDelete = allowed("delete");

  const add = () => {
    const content = draft.trim();
    if (!content) return;
    addNote({ content });
    setDraft("");
  };

  const ordered = [...notes].sort((a, b) =>
    a.isPinned === b.isPinned
      ? b.createdAt.localeCompare(a.createdAt)
      : a.isPinned
        ? -1
        : 1,
  );

  return (
    <>
      <DetailsCard>
        <DetailsCardHeader title={t("notesTitle")} />
        <div className="flex flex-col gap-3 px-5 py-4">
          {canCreate ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                add();
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("notePlaceholder")}
                aria-label={t("notePlaceholder")}
                className="min-w-0 flex-1 [--bd-field-h:42px]"
              />
              <Button
                type="submit"
                variant="bd-cta"
                size="bd-42"
                disabled={!draft.trim()}
              >
                {t("addNote")}
              </Button>
            </form>
          ) : null}
          {!canView ? (
            <p className="text-ink-tertiary text-[14px]">
              {shared("notesNoAccess")}
            </p>
          ) : pending ? (
            <Skeleton className="h-14 w-full rounded-[12px]" />
          ) : ordered.length === 0 ? (
            <p className="text-ink-disabled text-[14px]">
              {shared("noNotesYet")}
            </p>
          ) : (
            ordered.map((note) => (
              <div
                key={note.id}
                className="bg-surface-inset border-line-soft flex items-start justify-between gap-2 rounded-[12px] border px-3.5 py-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[14px] leading-normal whitespace-pre-wrap">
                    {note.content}
                  </span>
                  <span className="text-ink-disabled flex flex-wrap items-center gap-x-2 text-[12px]">
                    <span>
                      {[note.createdBy, formatRelative(note.createdAt, locale)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {note.isPinned ? (
                      <Chip tone="neutral" size="bd-tag">
                        {shared("pinned")}
                      </Chip>
                    ) : null}
                    {note.visibility === "shared_with_customer" ? (
                      <Chip tone="accent" size="bd-tag">
                        {t("noteSharedWithClient")}
                      </Chip>
                    ) : null}
                  </span>
                </div>
                {canEdit || canDelete ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="mock-icon-34"
                        aria-label={t("noteActions")}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="border-line-strong rounded-[14px] p-1.5 shadow-(--bd-sh-menu)"
                    >
                      {canEdit ? (
                        <DropdownMenuItem onSelect={() => setEditing(note)}>
                          {t("edit")}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onSelect={() => togglePin(note.id)}>
                        {note.isPinned ? t("noteUnpin") : t("notePin")}
                      </DropdownMenuItem>
                      {canEdit ? (
                        <DropdownMenuItem
                          onSelect={() => toggleVisibility(note.id)}
                        >
                          {note.visibility === "shared_with_customer"
                            ? t("noteMakeInternal")
                            : t("noteShareWithClient")}
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => deleteNote(note.id)}
                        >
                          {t("noteDelete")}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            ))
          )}
        </div>
      </DetailsCard>
      <HistoryCard bookingRef={booking.id} />
      {editing ? (
        <AddNoteModal
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          editNote={editing}
          showSubType={false}
          onSave={(params) => {
            updateNote(editing.id, params.content);
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}
