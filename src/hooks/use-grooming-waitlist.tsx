"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  groomingWaitlist as seedEntries,
  type GroomingWaitlistEntry,
  type GroomingWaitlistStatus,
} from "@/data/grooming-waitlist";

const STORAGE_KEY = "yipyy_grooming_waitlist_state";

// Default confirmation window when a slot is offered to a waitlist client.
export const DEFAULT_OFFER_WINDOW_MINUTES = 120;

type State = {
  /** New entries staff added on top of the seed. */
  added: GroomingWaitlistEntry[];
  /** Per-entry overrides (status changes, offer timestamps). */
  overrides: Record<string, Partial<GroomingWaitlistEntry>>;
};

const emptyState: State = { added: [], overrides: {} };

function loadStored(): State {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    return JSON.parse(raw) as State;
  } catch {
    return emptyState;
  }
}

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
    serviceName?: string;
  }) => GroomingWaitlistEntry | null;
  /** Mark an entry as offered with the slot info + deadline. */
  offerSlot: (
    id: string,
    slot: { startTime: string; endTime: string },
    windowMinutes?: number,
  ) => void;
}

const WaitlistContext = createContext<WaitlistContextValue | null>(null);

function mergeStatus(
  entry: GroomingWaitlistEntry,
  override?: Partial<GroomingWaitlistEntry>,
): GroomingWaitlistEntry {
  return {
    ...entry,
    ...override,
    status: override?.status ?? entry.status ?? "waiting",
  };
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function slotMatchesPreference(
  startTime: string,
  preference: GroomingWaitlistEntry["preferredTimeWindow"],
): boolean {
  if (!preference || preference === "anytime") return true;
  const h = Math.floor(timeToMin(startTime) / 60);
  if (preference === "morning") return h < 12;
  if (preference === "afternoon") return h >= 12;
  return true;
}

/** Structured time preference — new shape. Anytime/period/exact-time. */
function slotMatchesExpectedTime(
  startTime: string,
  pref: GroomingWaitlistEntry["expectedTime"],
): boolean {
  if (!pref || pref.kind === "anytime") return true;
  const startMin = timeToMin(startTime);
  if (pref.kind === "period") {
    const h = Math.floor(startMin / 60);
    if (pref.period === "morning") return h < 12;
    if (pref.period === "afternoon") return h >= 12 && h < 17;
    return h >= 17;
  }
  // exact-time: ±15 min tolerance
  return Math.abs(startMin - timeToMin(pref.time)) <= 15;
}

/** Structured date preference — new shape. ASAP/specific-date/day-of-week. */
function dateMatchesExpectedDate(
  candidateDate: string,
  pref: GroomingWaitlistEntry["expectedDate"],
  legacyDate: string | undefined,
): boolean {
  if (!pref) return !legacyDate || candidateDate === legacyDate;
  if (pref.kind === "asap") return true;
  if (pref.kind === "specific-date") return candidateDate === pref.date;
  const dow = new Date(candidateDate + "T00:00:00").getDay();
  return pref.daysOfWeek.includes(dow);
}

export function GroomingWaitlistProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadStored());
    setHydrated(true);
  }, []);

  const persist = useCallback(
    (next: State) => {
      setState(next);
      if (hydrated) {
        queueMicrotask(() =>
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
        );
      }
    },
    [hydrated],
  );

  const entries = useMemo<GroomingWaitlistEntry[]>(() => {
    const merged = [
      ...seedEntries.map((e) => mergeStatus(e, state.overrides[e.id])),
      ...state.added.map((e) => mergeStatus(e, state.overrides[e.id])),
    ];
    return merged.filter((e) => e.status !== "removed");
  }, [state]);

  const entriesForDate = useCallback(
    (date: string) => entries.filter((e) => e.date === date),
    [entries],
  );

  const addEntry = useCallback(
    (entry: GroomingWaitlistEntry) => {
      persist({
        ...state,
        added: [...state.added, { ...entry, status: entry.status ?? "waiting" }],
      });
    },
    [state, persist],
  );

  const setStatus = useCallback(
    (
      id: string,
      status: GroomingWaitlistStatus,
      patch?: Partial<GroomingWaitlistEntry>,
    ) => {
      persist({
        ...state,
        overrides: {
          ...state.overrides,
          [id]: { ...state.overrides[id], ...patch, status },
        },
      });
    },
    [state, persist],
  );

  const offerSlot = useCallback(
    (
      id: string,
      slot: { startTime: string; endTime: string },
      windowMinutes: number = DEFAULT_OFFER_WINDOW_MINUTES,
    ) => {
      const now = new Date();
      const until = new Date(now.getTime() + windowMinutes * 60_000);
      persist({
        ...state,
        overrides: {
          ...state.overrides,
          [id]: {
            ...state.overrides[id],
            status: "offered",
            offeredAt: now.toISOString(),
            offeredUntil: until.toISOString(),
            offeredSlot: `${slot.startTime}–${slot.endTime}`,
          },
        },
      });
    },
    [state, persist],
  );

  const findMatchForSlot = useCallback(
    (input: {
      date: string;
      startTime: string;
      endTime: string;
      stylistName?: string;
      stylistId?: string;
      serviceName?: string;
    }): GroomingWaitlistEntry | null => {
      const today = new Date().toISOString().split("T")[0];
      const candidates = entries
        .filter((e) => e.status === "waiting")
        // Auto-expire check.
        .filter((e) => !e.validUntil || e.validUntil >= today)
        // Date check honors structured expectedDate, falling back to legacy.
        .filter((e) =>
          dateMatchesExpectedDate(input.date, e.expectedDate, e.date),
        )
        // Service preference — match by name if the slot specifies one.
        .filter(
          (e) =>
            !input.serviceName ||
            e.serviceName.toLowerCase() === input.serviceName.toLowerCase() ||
            e.serviceName
              .toLowerCase()
              .includes(input.serviceName.toLowerCase()),
        )
        // Stylist preference — structured ids first, then legacy name fallback.
        .filter((e) => {
          if (e.preferredStylistIds && e.preferredStylistIds.length > 0) {
            return !input.stylistId
              ? false
              : e.preferredStylistIds.includes(input.stylistId);
          }
          if (e.preferredStylistName && input.stylistName) {
            return (
              e.preferredStylistName.toLowerCase() ===
              input.stylistName.toLowerCase()
            );
          }
          return true;
        })
        // Time preference — structured first, then legacy.
        .filter((e) =>
          e.expectedTime
            ? slotMatchesExpectedTime(input.startTime, e.expectedTime)
            : slotMatchesPreference(input.startTime, e.preferredTimeWindow),
        )
        // Oldest waiting first (FIFO).
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
      return candidates[0] ?? null;
    },
    [entries],
  );

  const value = useMemo<WaitlistContextValue>(
    () => ({
      entries,
      entriesForDate,
      addEntry,
      setStatus,
      offerSlot,
      findMatchForSlot,
    }),
    [entries, entriesForDate, addEntry, setStatus, offerSlot, findMatchForSlot],
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
