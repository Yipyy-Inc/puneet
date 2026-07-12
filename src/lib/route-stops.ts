"use client";

import { useSyncExternalStore } from "react";

// ============================================================================
// Per-stop completion for shuttle / transport custom-module events
// (spec 7.4 / Table 83). Keyed by `${eventId}::${stopId}`.
// TODO: back with the real route-tracking service when it exists.
// ============================================================================

const completed = new Set<string>(["group-paws-express::stop-1"]);

let version = 0;
const listeners = new Set<() => void>();
function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function stopKey(eventId: string, stopId: string): string {
  return `${eventId}::${stopId}`;
}

export function isStopCompleted(eventId: string, stopId: string): boolean {
  return completed.has(stopKey(eventId, stopId));
}

export function toggleStopCompleted(eventId: string, stopId: string): void {
  const key = stopKey(eventId, stopId);
  if (completed.has(key)) {
    completed.delete(key);
  } else {
    completed.add(key);
  }
  emit();
}

/** Subscribe a component to route-stop changes (returns a change counter). */
export function useRouteStops(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}
