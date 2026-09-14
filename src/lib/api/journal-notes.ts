"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// A guest journal's free-text notes — `daily_care_records` of kind
// journal_note, subject the booking ref, one row per note on its day.
//
// They were `src/data/journal-notes-store.ts`: an array in one browser tab, so
// "Owner called — told them Bella is doing great" was gone for the next shift.
// ============================================================================

export interface JournalNote {
  id: string;
  guestId: string;
  /** ISO date "YYYY-MM-DD" the note belongs to. */
  date: string;
  /** "HH:MM" within that day. */
  time: string;
  author: string;
  text: string;
  /** ISO timestamp when the note was added. */
  createdAt: string;
}

const NO_NOTES: JournalNote[] = [];

export const journalNoteKeys = {
  forGuest: (guestId: string) => ["journal-notes", guestId] as const,
};

async function fail(response: Response, fallback: string): Promise<never> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  throw new Error(body?.error ?? fallback);
}

export function useJournalNotes(guestId: string) {
  const query = useQuery({
    queryKey: journalNoteKeys.forGuest(guestId),
    queryFn: async (): Promise<JournalNote[]> => {
      const response = await fetch(
        `/api/daily-care/records?kind=journal_note&subject=${encodeURIComponent(guestId)}`,
      );
      if (!response.ok)
        await fail(response, "The journal could not be loaded.");
      const records = (await response.json()) as {
        id: string;
        occurredOn: string;
        payload: Record<string, unknown>;
        createdByName: string | null;
        createdAt: string;
      }[];
      return records.map((r) => ({
        id: r.id,
        guestId,
        date: r.occurredOn,
        time: String(r.payload.time ?? r.createdAt.slice(11, 16)),
        author: r.createdByName ?? "",
        text: String(r.payload.text ?? ""),
        createdAt: r.createdAt,
      }));
    },
  });
  return { notes: query.data ?? NO_NOTES, isPending: query.isPending };
}

export function useAddJournalNote(guestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; time: string; text: string }) => {
      const response = await fetch("/api/daily-care/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: input.date,
          kind: "journal_note",
          subject: guestId,
          payload: { text: input.text, time: input.time },
        }),
      });
      if (!response.ok) await fail(response, "That note was not saved.");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: journalNoteKeys.forGuest(guestId),
      }),
  });
}
