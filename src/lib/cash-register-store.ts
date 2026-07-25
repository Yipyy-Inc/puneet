"use client";

import { useSyncExternalStore } from "react";
import {
  mockRegisterSessions,
  type CashMovement,
  type ClosingCount,
  type OpeningCount,
  type RegisterSession,
} from "@/data/cash-drawer";
import { payments } from "@/data/payments";
import {
  classifyVariance,
  computeTrackedTotal,
  getActiveSession,
  liveCashCaptured,
} from "@/lib/cash-register";

// ============================================================================
// Shared, reactive register-session state (mock). Mirrors the clock-store
// pattern so the facility Daily Register page, the employee register page, and
// the login open-gate all read/write ONE source of truth — otherwise the gate
// can't know whether today's drawer has been counted open.
// TODO: back with the real cash-drawer service when a backend exists.
// ============================================================================

let sessions: RegisterSession[] = [...mockRegisterSessions];
let seq = 0;
// Set when a close-reminder is requested (e.g. on clock-out with the register
// still open); the RegisterCloseReminder reads it to pop the close-count flow.
let pendingCloseSessionId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Local YYYY-MM-DD — the natural key for "today's" register session. */
export function todayBusinessDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getRegisterSessions(): RegisterSession[] {
  return sessions;
}

/** Today's session for a location, whatever its status (open or already
 *  closed for the day) — null if the day hasn't been opened yet. */
export function getTodaySession(
  facilityId: number,
  locationId: string,
): RegisterSession | null {
  const today = todayBusinessDate();
  return (
    sessions.find(
      (s) =>
        s.facilityId === facilityId &&
        s.locationId === locationId &&
        s.businessDate === today,
    ) ?? null
  );
}

export function openRegister(
  facilityId: number,
  locationId: string,
  opening: OpeningCount,
): RegisterSession {
  const businessDate = todayBusinessDate();
  seq += 1;
  const session: RegisterSession = {
    id: `rs-${businessDate}-${seq}`,
    facilityId,
    locationId,
    businessDate,
    status: "open",
    opening,
    closing: null,
    movements: [],
    capturedTxns: [],
    cashCaptured: 0,
    trackedTotal: 0,
    variance: null,
    varianceStatus: null,
    managerNote: "",
    lockedAt: null,
  };
  sessions = [session, ...sessions];
  emit();
  return session;
}

export function addMovement(sessionId: string, movement: CashMovement): void {
  sessions = sessions.map((s) =>
    s.id === sessionId ? { ...s, movements: [...s.movements, movement] } : s,
  );
  emit();
}

export function removeMovement(sessionId: string, movementId: string): void {
  sessions = sessions.map((s) =>
    s.id === sessionId
      ? { ...s, movements: s.movements.filter((m) => m.id !== movementId) }
      : s,
  );
  emit();
}

export function closeRegister(
  sessionId: string,
  closing: ClosingCount,
  managerNote: string,
): void {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const live = liveCashCaptured(session, payments);
  const tracked = computeTrackedTotal(
    session.opening.floatTotal,
    live.total,
    session.movements,
  );
  const variance = closing.drawerTotal - tracked;
  sessions = sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          status: "closed",
          closing,
          capturedTxns: live.txns,
          cashCaptured: live.total,
          trackedTotal: tracked,
          variance,
          varianceStatus: classifyVariance(variance),
          managerNote,
          lockedAt: new Date().toISOString(),
        }
      : s,
  );
  // Closing satisfies any outstanding close-reminder for this session.
  if (pendingCloseSessionId === sessionId) pendingCloseSessionId = null;
  emit();
}

/** Request the close-count reminder for a session (fired on clock-out /
 *  logout while the register is still open). */
export function requestRegisterClose(sessionId: string): void {
  pendingCloseSessionId = sessionId;
  emit();
}

export function clearRegisterClosePrompt(): void {
  if (pendingCloseSessionId !== null) {
    pendingCloseSessionId = null;
    emit();
  }
}

/** The session id awaiting a close-count reminder, or null. */
export function usePendingRegisterCloseSessionId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => pendingCloseSessionId,
    () => null,
  );
}

export function updateManagerNote(sessionId: string, note: string): void {
  sessions = sessions.map((s) =>
    s.id === sessionId ? { ...s, managerNote: note } : s,
  );
  emit();
}

/** All sessions, reactive. */
export function useRegisterSessions(): RegisterSession[] {
  return useSyncExternalStore(
    subscribe,
    () => sessions,
    () => sessions,
  );
}

/** The currently-open session for a location (any business date) — used by the
 *  register page's active-session view. */
export function useActiveRegisterSession(
  facilityId: number,
  locationId: string,
): RegisterSession | null {
  const all = useRegisterSessions();
  return getActiveSession(all, facilityId, locationId);
}

/** Whether TODAY's drawer has been counted open — the login-gate's question.
 *  A stale session left open from a prior day does NOT count as today's open. */
export function useIsRegisterOpenToday(
  facilityId: number,
  locationId: string,
): boolean {
  const all = useRegisterSessions();
  const today = todayBusinessDate();
  return all.some(
    (s) =>
      s.facilityId === facilityId &&
      s.locationId === locationId &&
      s.businessDate === today &&
      s.status === "open",
  );
}
