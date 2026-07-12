"use client";

import { useSyncExternalStore } from "react";
import type { OperationsCalendarEvent } from "@/lib/operations-calendar";

// ============================================================================
// Drag-and-drop reschedule state (spec 8.1 / Task 42, Tables 85–86). Tracks the
// chip being dragged (to ghost the source) and the hovered drop zone key (to
// highlight it). Native HTML5 DnD carries the payload; this shares UI state.
// ============================================================================

let draggingEvent: OperationsCalendarEvent | null = null;
let hoverKey: string | null = null;
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

export function startCalendarDrag(event: OperationsCalendarEvent): void {
  draggingEvent = event;
  emit();
}

export function endCalendarDrag(): void {
  draggingEvent = null;
  hoverKey = null;
  emit();
}

export function setDropHoverKey(key: string | null): void {
  if (hoverKey !== key) {
    hoverKey = key;
    emit();
  }
}

export function getDraggingEvent(): OperationsCalendarEvent | null {
  return draggingEvent;
}

export function useCalendarDrag(): {
  draggingId: string | null;
  hoverKey: string | null;
} {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
  return { draggingId: draggingEvent?.id ?? null, hoverKey };
}
