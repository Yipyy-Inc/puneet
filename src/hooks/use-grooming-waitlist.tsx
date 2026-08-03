"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  GroomingWaitlistEntry,
  GroomingWaitlistStatus,
} from "@/data/grooming-waitlist";
import {
  dateMatchesPreference,
  dateNotExcluded,
  stylistMatchesPreference,
  timeMatchesPreference,
} from "@/lib/grooming-waitlist-matcher";
import { stylistIdForStaff } from "@/lib/api/grooming";
import { WAITLIST_OFFER_WINDOW_MINUTES } from "@/lib/grooming-waitlist-offer";

// ============================================================================
// The grooming waitlist, from Postgres.
//
// THE CONTEXT SHAPE IS UNCHANGED. Five components consume this hook — the
// check-in board, the calendar, the panel, the appointment detail page and the
// booking dialog — and all seven members still mean what they meant. The same
// approach as useGroomingStations: swap the source, leave the call sites alone.
//
// WHAT CHANGED BEHIND IT:
//
//   * `entries` is a query, not a seed array merged with a localStorage bag of
//     overrides. The old provider kept the mock's nine entries and layered
//     per-id patches on top, so a queue lived in one browser and "Remove" only
//     removed it for the person who clicked.
//
//   * THE MATCHING FUNCTIONS ARE NO LONGER DUPLICATED HERE. This file used to
//     carry its own `slotMatchesPreference` / `dateMatchesExpectedDate` beside
//     the ones in grooming-waitlist-matcher.ts, and they had already drifted:
//     the local copy treated `asap` as matching ANY date, including yesterday's,
//     while the matcher required the date to be today or later. Two answers to
//     "does this client want this slot" is one answer too many, so the local
//     pair is gone and the matcher's is imported.
//
//   * `entriesForDate` NOW ASKS THE PREFERENCE, not the anchor date. It used to
//     be `e.date === date`, which is wrong for three of the four preference
//     kinds: an ASAP client added yesterday vanished from today's board while
//     still waiting, and a Tue/Thu client only ever appeared on one Tuesday.
//     The anchor is where the calendar hangs its count; who is waiting FOR a
//     given day is a question only the preference can answer.
//
//   * The callbacks are still void-returning and safe to call unawaited. They
//     fire a request and invalidate rather than patching the cache, because the
//     offer deadline is stamped by the database (20260806100000, Decision 4) —
//     a local guess at `offeredUntil` would be wrong by exactly the round trip.
// ============================================================================

const BASE = "/api/grooming/waitlist";

export const groomingWaitlistKeys = {
  all: ["grooming-waitlist"] as const,
};

// Default confirmation window when a slot is offered — 4 hours per Spec
// Table 96. Sent to the server, which stamps the deadline from it.
export const DEFAULT_OFFER_WINDOW_MINUTES = WAITLIST_OFFER_WINDOW_MINUTES;

interface WaitlistContextValue {
  entries: GroomingWaitlistEntry[];
  entriesForDate: (date: string) => GroomingWaitlistEntry[];
  addEntry: (entry: GroomingWaitlistEntry) => void;
  setStatus: (
    id: string,
    status: GroomingWaitlistStatus,
    patch?: Partial<GroomingWaitlistEntry>,
  ) => void;
  /**
   * Auto-match: given a date and a freed slot, find the highest-priority
   * "waiting" entry whose preferences fit. Returns the entry without changing
   * state — caller decides when to call `offerSlot`.
   */
  findMatchForSlot: (input: {
    date: string;
    startTime: string;
    endTime: string;
    stylistName?: string;
    stylistId?: string;
    serviceName?: string;
  }) => GroomingWaitlistEntry | null;
  /** Mark an entry as offered with the slot info + deadline. */
  offerSlot: (
    id: string,
    slot: { startTime: string; endTime: string },
    windowMinutes?: number,
  ) => void;
  /**
   * Expire the current offer and hand the freed slot to the next matching
   * client (Table 96 "no response in 4h → offer to next person"). Returns the
   * newly-offered entry, or null if nobody else qualifies.
   */
  expireAndOfferNext: (
    expiredId: string,
    slot: {
      date: string;
      startTime: string;
      endTime: string;
      stylistName?: string;
      stylistId?: string;
      serviceName?: string;
    },
    windowMinutes?: number,
  ) => GroomingWaitlistEntry | null;
}

const WaitlistContext = createContext<WaitlistContextValue | null>(null);

async function json<T>(
  url: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

/**
 * The route emits STAFF legacy ids in `preferredStylistIds`; the screens compare
 * against stylist ids. Remapped here rather than server-side because
 * `stylistIdForStaff` reads the mock stylist list, and the same seam already
 * exists for appointments (src/lib/api/grooming.ts).
 *
 * A preferred groomer who is not one of the mock stylists keeps its staff id
 * rather than being dropped — it then matches no slot, which is visible, where
 * silently emptying the list would turn "only Amy" into "anyone".
 */
async function fetchWaitlist(): Promise<GroomingWaitlistEntry[]> {
  const rows = await json<GroomingWaitlistEntry[]>(BASE);
  return rows.map((entry) => ({
    ...entry,
    preferredStylistIds: (entry.preferredStylistIds ?? []).map(
      (staffId) => stylistIdForStaff(staffId) ?? staffId,
    ),
  }));
}

/** Slot descriptor a freed appointment offers to the waitlist. */
type SlotMatchInput = {
  date: string;
  startTime: string;
  endTime: string;
  stylistName?: string;
  stylistId?: string;
  serviceName?: string;
};

/**
 * Highest-priority "waiting" entry whose preferences fit the freed slot, FIFO
 * by `addedAt`. `excludeId` skips an entry (e.g. the one whose offer just
 * expired) so the handoff moves to the next person. Pure — no state writes.
 */
function pickNextMatch(
  entries: GroomingWaitlistEntry[],
  input: SlotMatchInput,
  excludeId?: string,
): GroomingWaitlistEntry | null {
  const today = new Date().toISOString().split("T")[0];
  const candidates = entries
    .filter((e) => (e.status ?? "waiting") === "waiting")
    .filter((e) => e.id !== excludeId)
    .filter((e) => !e.validUntil || e.validUntil >= today)
    .filter((e) =>
      dateMatchesPreference(input.date, e.expectedDate, e.date, today),
    )
    .filter((e) => dateNotExcluded(input.date, e.excludedDates))
    .filter(
      (e) =>
        !input.serviceName ||
        e.serviceName.toLowerCase() === input.serviceName.toLowerCase() ||
        e.serviceName.toLowerCase().includes(input.serviceName.toLowerCase()),
    )
    .filter((e) =>
      stylistMatchesPreference(
        input.stylistId ?? "",
        input.stylistName ?? "",
        e,
      ),
    )
    .filter((e) =>
      timeMatchesPreference(
        input.startTime,
        e.expectedTime,
        e.preferredTimeWindow,
      ),
    )
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  return candidates[0] ?? null;
}

export function GroomingWaitlistProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: groomingWaitlistKeys.all,
    queryFn: fetchWaitlist,
    // The queue changes when anyone at the facility books, cancels or offers.
    // Same cadence as the stations query, which the same board renders beside.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: groomingWaitlistKeys.all });
  }, [queryClient]);

  const { mutate: create } = useMutation({
    mutationFn: (entry: GroomingWaitlistEntry) =>
      json<GroomingWaitlistEntry>(BASE, {
        method: "POST",
        body: {
          clientId: entry.clientId,
          petId: entry.petId,
          petName: entry.petName,
          petBreed: entry.petBreed,
          ownerName: entry.ownerName,
          ownerPhone: entry.ownerPhone,
          ownerEmail: entry.ownerEmail,
          serviceName: entry.serviceName,
          expectedDate: entry.expectedDate,
          expectedTime: entry.expectedTime,
          excludedDates: entry.excludedDates,
          preferredStylistIds: entry.preferredStylistIds,
          validUntil: entry.validUntil,
          postalCode: entry.postalCode,
          source: entry.source,
          // `notes` is the legacy twin of `comment` and is not stored
          // (20260806100000, Decision 1). Read here so an older caller that
          // still sets it does not silently lose the text.
          comment: entry.comment ?? entry.notes,
        },
      }),
    onSuccess: invalidate,
  });

  const { mutate: patch } = useMutation({
    mutationFn: (input: { id: string; body: Record<string, unknown> }) =>
      json<GroomingWaitlistEntry>(`${BASE}/${encodeURIComponent(input.id)}`, {
        method: "PATCH",
        body: input.body,
      }),
    onSuccess: invalidate,
  });

  /**
   * Who is waiting for this specific day. Asks each entry's preference rather
   * than comparing its anchor date — see the header: the anchor is one day, the
   * preference is the rule, and three of the four kinds admit more than one day.
   */
  const entriesForDate = useCallback(
    (date: string) => {
      const today = new Date().toISOString().split("T")[0];
      return entries.filter(
        (e) =>
          (!e.validUntil || e.validUntil >= today) &&
          dateMatchesPreference(date, e.expectedDate, e.date, today) &&
          dateNotExcluded(date, e.excludedDates),
      );
    },
    [entries],
  );

  const addEntry = useCallback(
    (entry: GroomingWaitlistEntry) => create(entry),
    [create],
  );

  const setStatus = useCallback(
    (id: string, status: GroomingWaitlistStatus) => {
      // The `patch` argument is deliberately not forwarded. Every field it was
      // ever used to carry — offeredAt, offeredUntil, offeredSlot — is now the
      // server's, and `offerSlot` below is the way to set the one that is still
      // caller-supplied. Kept in the signature so the call sites compile.
      patch({ id, body: { status } });
    },
    [patch],
  );

  const offerSlot = useCallback(
    (
      id: string,
      slot: { startTime: string; endTime: string },
      windowMinutes: number = DEFAULT_OFFER_WINDOW_MINUTES,
    ) => {
      patch({
        id,
        body: {
          status: "offered",
          offeredSlot: `${slot.startTime}–${slot.endTime}`,
          offerWindowMinutes: windowMinutes,
        },
      });
    },
    [patch],
  );

  const findMatchForSlot = useCallback(
    (input: SlotMatchInput): GroomingWaitlistEntry | null =>
      pickNextMatch(entries, input),
    [entries],
  );

  const expireAndOfferNext = useCallback(
    (
      expiredId: string,
      slot: SlotMatchInput,
      windowMinutes: number = DEFAULT_OFFER_WINDOW_MINUTES,
    ): GroomingWaitlistEntry | null => {
      // Next person in line for the same slot, skipping the one who lapsed.
      // Computed from the cache so the caller still gets an answer to render
      // immediately; the two writes below are what make it true.
      const next = pickNextMatch(entries, slot, expiredId);
      patch({ id: expiredId, body: { status: "expired" } });
      if (next) {
        patch({
          id: next.id,
          body: {
            status: "offered",
            offeredSlot: `${slot.startTime}–${slot.endTime}`,
            offerWindowMinutes: windowMinutes,
          },
        });
      }
      return next;
    },
    [entries, patch],
  );

  const value = useMemo<WaitlistContextValue>(
    () => ({
      entries,
      entriesForDate,
      addEntry,
      setStatus,
      offerSlot,
      findMatchForSlot,
      expireAndOfferNext,
    }),
    [
      entries,
      entriesForDate,
      addEntry,
      setStatus,
      offerSlot,
      findMatchForSlot,
      expireAndOfferNext,
    ],
  );

  return (
    <WaitlistContext.Provider value={value}>
      {children}
    </WaitlistContext.Provider>
  );
}

export function useGroomingWaitlist(): WaitlistContextValue {
  const ctx = useContext(WaitlistContext);
  if (!ctx) {
    throw new Error(
      "useGroomingWaitlist must be used inside GroomingWaitlistProvider",
    );
  }
  return ctx;
}
