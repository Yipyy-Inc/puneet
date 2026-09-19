"use client";

import { CalendarClock, MessageSquare } from "lucide-react";

import { NoteCard } from "@/components/shared/NoteCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityNotes } from "@/lib/api/notes";
import { useCustomerText } from "@/lib/customer/use-customer-text";

// ============================================================================
// The notes on this booking the customer may read: the facility's shared
// notes, and their own (add_owner_booking_note). Postgres, under RLS — the
// list cards read staff notes from a fixture, which were nobody's.
// ============================================================================

export function BookingNotesCard({
  bookingRef,
  canWrite,
  onNote,
}: {
  bookingRef: number;
  canWrite: boolean;
  onNote: (kind: "note" | "change_dates") => void;
}) {
  const { t } = useCustomerText("bookingDetail");
  const { notes, pending, failed } = useEntityNotes("booking", bookingRef);

  return (
    <section className="bg-card border-line shadow-card rounded-3xl border p-5">
      <h2 className="text-heading text-[17px] font-bold">{t("notesTitle")}</h2>
      <div className="mt-3 space-y-2">
        {pending ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : failed ? (
          <p className="text-ink-tertiary text-[13.5px]">
            {t("notesLoadFailed")}
          </p>
        ) : notes.length === 0 ? (
          <p className="text-ink-tertiary text-[13.5px]">{t("notesEmpty")}</p>
        ) : (
          notes.map((note) => <NoteCard key={note.id} note={note} readOnly />)
        )}
      </div>
      {canWrite && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onNote("change_dates")}>
            <CalendarClock className="size-4" aria-hidden />
            {t("askToChangeDates")}
          </Button>
          <Button variant="outline" onClick={() => onNote("note")}>
            <MessageSquare className="size-4" aria-hidden />
            {t("leaveNote")}
          </Button>
        </div>
      )}
    </section>
  );
}
