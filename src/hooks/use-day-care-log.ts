"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import {
  careLogKeys,
  careLogQueries,
  logCare,
  type CareLogEntry,
} from "@/lib/api/care-log";
import type { CareTaskType, TaskExecution } from "@/types/care-log";

// ============================================================================
// The Daily Care board's log, in Postgres.
//
// ── WHAT THIS REPLACES, AND HOW BAD IT WAS ────────────────────────────────
//
// `useDateCareLog` in `hooks/use-care-log.ts`, which reads `careLogStore` —
// `src/data/care-log-store.ts`, a module-level array. Not localStorage: an
// array in the JavaScript heap. Every meal, dose and kennel-clean logged at the
// kennel was gone the moment somebody navigated away, and none of it ever
// reached the stay it belonged to.
//
// Meanwhile the booking page's FEEDING and MEDICATIONS panels write the same
// events to `care_log_entries` through /api/care-log. Two screens, one concept,
// two stores — and the one staff actually stand at was the volatile one.
//
// ── THE INTERFACE IS DELIBERATELY IDENTICAL ───────────────────────────────
//
// `{ executions, log }`, the same shape the store's hook returned, so the swap
// is one import in a 1,058-line component rather than a rewrite of it. What
// changes underneath: a query instead of a snapshot, and a POST instead of an
// array push.
//
// ── TWO VOCABULARIES, AND THE JOIN BETWEEN THEM ───────────────────────────
//
// The board speaks `TaskExecution` (guestId, date, staffInitials, and a bag of
// per-type detail); the table speaks `CareLogEntry` (bookingRef, occurredOn,
// recordedByName, details jsonb). The board's `guestId` IS the booking ref now
// that guests come from real bookings, which is what makes the join possible at
// all — with fixture guests there was no ref to write against.
//
// `care` is the board's word for a round that is neither food nor medicine, and
// the table's nearest word is `other`. Everything else lines up.
// ============================================================================

/** Board task type → the column's vocabulary. */
function toTaskType(type: CareTaskType): CareLogEntry["taskType"] {
  switch (type) {
    case "feeding":
      return "feeding";
    case "medication":
      return "medication";
    case "potty":
      return "potty";
    case "addon":
      return "addon";
    case "care":
    default:
      // Kennel cleans, water refills, bedding changes, monitoring. The subtype
      // survives in `taskKey`, which is what the board reads them back by.
      return "other";
  }
}

/** The column's vocabulary → the board's. */
function toCareType(type: CareLogEntry["taskType"]): CareTaskType {
  switch (type) {
    case "feeding":
      return "feeding";
    case "medication":
      return "medication";
    case "potty":
      return "potty";
    case "addon":
      return "addon";
    default:
      return "care";
  }
}

/**
 * Initials for the avatar chip.
 *
 * Derived rather than stored: `recorded_by_name` is snapshotted on the row, so
 * a journal keeps the name it was written with, and initials are a rendering of
 * that name rather than a second fact that can disagree with it.
 */
function initialsOf(name: string | null): string {
  if (!name) return "—";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

function toExecution(entry: CareLogEntry): TaskExecution {
  return {
    id: entry.id,
    taskId: entry.taskKey,
    guestId: String(entry.bookingRef),
    bookingId: String(entry.bookingRef),
    taskType: toCareType(entry.taskType),
    date: entry.occurredOn,
    executedAt: entry.executedAt,
    staffInitials: initialsOf(entry.recordedByName),
    staffName: entry.recordedByName ?? undefined,
    outcome: entry.outcome,
    servedAt: entry.servedAt ?? undefined,
    notes: entry.notes ?? undefined,
    // The per-type extras went into `details` on the way in and come back out
    // the same shape. Spread last so a malformed bag cannot overwrite the
    // columns above it — those are the facts the table actually enforces.
    ...(entry.details as Partial<TaskExecution>),
  };
}

/** The parts of an execution that have no column of their own. */
function detailsOf(entry: Omit<TaskExecution, "id">): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  if (entry.missedReason) details.missedReason = entry.missedReason;
  if (entry.healthObservation)
    details.healthObservation = entry.healthObservation;
  if (entry.cleaning) details.cleaning = entry.cleaning;
  if (entry.waterVolume) details.waterVolume = entry.waterVolume;
  if (entry.addon) details.addon = entry.addon;
  if (entry.enrichment) details.enrichment = entry.enrichment;
  // Kept because the board renders it directly, and because a row written while
  // somebody was covering a shift should say who was standing there.
  if (entry.staffInitials) details.staffInitials = entry.staffInitials;
  return details;
}

export function useDayCareLog(date: string) {
  const queryClient = useQueryClient();
  const { data } = useQuery(careLogQueries.forDate(date));

  const executions = useMemo(() => (data ?? []).map(toExecution), [data]);

  const record = useMutation({
    mutationFn: logCare,
    // Both keys: this day's board, and the stay's own history on the booking
    // page. They are the same rows and must not disagree about them.
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({
        queryKey: careLogKeys.forDate(date),
      });
      void queryClient.invalidateQueries({
        queryKey: careLogKeys.forBooking(saved.bookingRef),
      });
    },
    onError: (error: unknown) =>
      toast.error("Not recorded", {
        description:
          error instanceof Error
            ? error.message
            : "That log did not reach the record. Try again.",
      }),
  });

  const log = useCallback(
    (entry: Omit<TaskExecution, "id">) => {
      const bookingRef = Number(entry.guestId);
      if (!Number.isFinite(bookingRef)) {
        // A fixture guest id would land here. Loud rather than silent: the
        // board is meant to be on real bookings now, and a log that quietly
        // goes nowhere is the thing this hook exists to end.
        toast.error("Not recorded", {
          description: `"${entry.guestId}" is not a booking this log can be written against.`,
        });
        return;
      }

      record.mutate({
        bookingRef,
        taskKey: entry.taskId,
        taskType: toTaskType(entry.taskType),
        outcome: String(entry.outcome),
        occurredOn: entry.date,
        executedAt: entry.executedAt,
        servedAt: entry.servedAt ?? null,
        notes: entry.notes ?? null,
        details: detailsOf(entry),
      });
    },
    [record],
  );

  return { executions, log, isSaving: record.isPending };
}
