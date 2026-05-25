/**
 * Calendar time blocks — facility-curated "this slot is unavailable" markers
 * on the training calendar. Drives the striped gray overlay that prevents
 * new sessions from being scheduled into a slot held for trainer downtime,
 * equipment maintenance, room booking conflicts, etc.
 *
 * Mock layer today: persisted via the shared TanStack Query cache so the
 * day view + the new-session dialog see new blocks instantly.
 */
import type { QueryClient } from "@tanstack/react-query";
import { trainingQueries } from "@/lib/api/training";

/** Common reasons surfaced as quick-pick chips on the Block Time dialog. */
export type BlockTimeReasonKind =
  | "trainer-unavailable"
  | "equipment-maintenance"
  | "facility-closed"
  | "private-event"
  | "other";

export const BLOCK_TIME_REASON_LABELS: Record<BlockTimeReasonKind, string> = {
  "trainer-unavailable": "Trainer unavailable",
  "equipment-maintenance": "Equipment maintenance",
  "facility-closed": "Facility closed",
  "private-event": "Private event / off-site",
  other: "Other",
};

export interface TrainingTimeBlock {
  id: string;
  /** YYYY-MM-DD — the day the block applies to. */
  date: string;
  /** HH:MM (24-hour, local). */
  startTime: string;
  endTime: string;
  /** Trainer the block is scoped to. When unset, blocks the slot across
   *  every trainer column on the day view — useful for facility-wide
   *  closures. */
  trainerId?: string;
  reasonKind: BlockTimeReasonKind;
  /** Optional free-text supplement to the picked reason — surfaced as the
   *  tooltip on the striped overlay. */
  reasonNote?: string;
  /** Who created the block — surfaced in the tooltip for accountability. */
  createdByName: string;
  createdAt: string;
}

let blockSeed = 0;
export function nextTimeBlockId(): string {
  blockSeed += 1;
  return `block-${Date.now()}-${blockSeed}`;
}

/** Add or update a block, write-through to the shared cache. */
export function fanOutTimeBlockUpsert(
  queryClient: QueryClient,
  block: TrainingTimeBlock,
): void {
  const key = trainingQueries.calendarTimeBlocks().queryKey;
  queryClient.setQueryData<TrainingTimeBlock[]>(key, (prev = []) => {
    const exists = prev.some((b) => b.id === block.id);
    if (exists) return prev.map((b) => (b.id === block.id ? block : b));
    return [...prev, block];
  });
}

/** Remove a block from the shared cache. */
export function fanOutTimeBlockDelete(
  queryClient: QueryClient,
  blockId: string,
): void {
  const key = trainingQueries.calendarTimeBlocks().queryKey;
  queryClient.setQueryData<TrainingTimeBlock[]>(key, (prev = []) =>
    prev.filter((b) => b.id !== blockId),
  );
}

/** Blocks scoped to a given trainer column on a given date. Blocks with no
 *  trainerId apply to every column (facility-wide closures). */
export function blocksForTrainerOnDate(
  blocks: TrainingTimeBlock[],
  date: string,
  trainerId: string,
): TrainingTimeBlock[] {
  return blocks.filter(
    (b) => b.date === date && (!b.trainerId || b.trainerId === trainerId),
  );
}

/** Convert HH:MM → minutes-since-midnight, used to position blocks on the
 *  day view's pixel grid. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Round a minutes-since-midnight value down to the nearest 30-minute slot.
 *  Used when generating a default endTime from a click position. */
export function snapToHalfHour(minutes: number): number {
  return Math.floor(minutes / 30) * 30;
}

export function minutesToTime(minutes: number): string {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
