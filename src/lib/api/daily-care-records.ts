"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Daily Care floor records — shift notes, pet flags, head counts — from
// Postgres (`/api/daily-care/records`).
//
// ── WHY THE STORES STAY ───────────────────────────────────────────────────
//
// Twenty call sites read `shiftNotesStore`, `petFlagsStore` and
// `headCountStore` synchronously through `useSyncExternalStore`. They were
// the whole truth, and one browser tab's. Now they are a CACHE of this route:
// `useDailyCareRecordsSync(date)` hydrates them when the board loads the day,
// and every mutator in the stores writes through here, putting its change
// back if the write is refused. The call sites did not have to change to
// become real.
// ============================================================================

export type DailyCareRecordKind = "shift_note" | "pet_flag" | "head_count";

export interface DailyCareRecord {
  id: string;
  kind: DailyCareRecordKind;
  subject: string;
  payload: Record<string, unknown>;
  createdByName: string | null;
  createdAt: string;
}

type Hydrator = (date: string, records: DailyCareRecord[]) => void;
const hydrators = new Set<Hydrator>();

/** A store registers here to be filled when a day's records arrive. */
export function onDailyCareRecords(hydrate: Hydrator): () => void {
  hydrators.add(hydrate);
  return () => hydrators.delete(hydrate);
}

let errorHandler: ((message?: string) => void) | null = null;

/** The board says a write failed, in its own words; the stores cannot. */
export function setDailyCareWriteErrorHandler(
  handler: ((message?: string) => void) | null,
) {
  errorHandler = handler;
}

export function reportDailyCareWriteError(error: unknown) {
  errorHandler?.(error instanceof Error ? error.message : undefined);
}

async function fail(response: Response, fallback: string): Promise<never> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  throw new Error(body?.error ?? fallback);
}

export async function writeDailyCareRecord(input: {
  date: string;
  kind: DailyCareRecordKind;
  subject?: string;
  payload: Record<string, unknown>;
}): Promise<DailyCareRecord> {
  const response = await fetch("/api/daily-care/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) await fail(response, "That was not saved.");
  return (await response.json()) as DailyCareRecord;
}

export async function removePetFlag(date: string, subject: string) {
  const response = await fetch(
    `/api/daily-care/records?date=${date}&subject=${encodeURIComponent(subject)}`,
    { method: "DELETE" },
  );
  if (!response.ok) await fail(response, "That flag was not taken down.");
}

/** Load a day's records and fill the stores with them. */
export function useDailyCareRecordsSync(date: string) {
  const { data } = useQuery({
    queryKey: ["daily-care-records", date],
    queryFn: async (): Promise<DailyCareRecord[]> => {
      const response = await fetch(`/api/daily-care/records?date=${date}`);
      if (response.status === 401) return [];
      if (!response.ok) await fail(response, "The day could not be loaded.");
      return (await response.json()) as DailyCareRecord[];
    },
  });

  useEffect(() => {
    if (!data) return;
    for (const hydrate of hydrators) hydrate(date, data);
  }, [data, date]);
}
