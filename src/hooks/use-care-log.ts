"use client";

import { useSyncExternalStore, useCallback, useMemo } from "react";
import { careLogStore } from "@/data/care-log-store";
import type { TaskExecution } from "@/types/care-log";

/**
 * Subscribe to the shared care-log store. Both the Daily Care List and the
 * per-reservation Guest Journal use this hook — logging from one screen
 * triggers re-render in the other automatically.
 */
export function useCareLog() {
  const executions = useSyncExternalStore(
    careLogStore.subscribe,
    careLogStore.getSnapshot,
    careLogStore.getSnapshot,
  );

  const log = useCallback(
    (entry: Omit<TaskExecution, "id">) => careLogStore.log(entry),
    [],
  );

  return { executions, log };
}

/**
 * Subset of executions for a given guest, optionally filtered to a date.
 * Memoized against the full executions list so re-renders are cheap.
 */
export function useGuestCareLog(guestId: string, date?: string) {
  const { executions, log } = useCareLog();

  const guestExecutions = useMemo(
    () =>
      executions.filter((e) => {
        if (e.guestId !== guestId) return false;
        if (date && e.date !== date) return false;
        return true;
      }),
    [executions, guestId, date],
  );

  return { executions: guestExecutions, log };
}

/**
 * All executions for a given calendar date — used by the Daily Care List.
 */
export function useDateCareLog(date: string) {
  const { executions, log } = useCareLog();

  const dayExecutions = useMemo(
    () => executions.filter((e) => e.date === date),
    [executions, date],
  );

  return { executions: dayExecutions, log };
}
