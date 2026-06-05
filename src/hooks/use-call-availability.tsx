"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CallAvailability } from "@/types/staff";
import { DEFAULT_AVAILABILITY_TIMEOUT_MIN } from "@/lib/calling/availability";

const STORAGE_KEY = "yipyy-call-availability:v1";

interface CallAvailabilityValue {
  /** The current (logged-in) staff member's call status. */
  status: CallAvailability;
  /** Minutes before busy/away auto-resets to available. */
  timeoutMinutes: number;
  /** Seconds remaining until auto-reset, or null when available. */
  secondsUntilReset: number | null;
  setStatus: (status: CallAvailability) => void;
  setTimeoutMinutes: (minutes: number) => void;
  /** Manually return to available before the timeout elapses. */
  resetToAvailable: () => void;
}

const CallAvailabilityContext = createContext<CallAvailabilityValue | null>(null);

interface Persisted {
  status: CallAvailability;
  timeoutMinutes: number;
  since: number | null; // epoch ms when busy/away was set
}

export function CallAvailabilityProvider({ children }: { children: ReactNode }) {
  const [status, setStatusState] = useState<CallAvailability>("available");
  const [timeoutMinutes, setTimeoutMinutesState] = useState(
    DEFAULT_AVAILABILITY_TIMEOUT_MIN,
  );
  const [since, setSince] = useState<number | null>(null);
  const [secondsUntilReset, setSecondsUntilReset] = useState<number | null>(null);
  const hydrated = useRef(false);

  // Restore from localStorage on mount (and auto-reset if already elapsed).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        const mins = p.timeoutMinutes || DEFAULT_AVAILABILITY_TIMEOUT_MIN;
        setTimeoutMinutesState(mins);
        const elapsed =
          p.since != null && Date.now() - p.since >= mins * 60_000;
        if (p.status && p.status !== "available" && p.since != null && !elapsed) {
          setStatusState(p.status);
          setSince(p.since);
        }
      }
    } catch {
      /* ignore malformed storage */
    }
    hydrated.current = true;
  }, []);

  // Persist whenever state changes (after hydration).
  useEffect(() => {
    if (!hydrated.current) return;
    const payload: Persisted = { status, timeoutMinutes, since };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [status, timeoutMinutes, since]);

  const resetToAvailable = useCallback(() => {
    setStatusState("available");
    setSince(null);
    setSecondsUntilReset(null);
  }, []);

  const setStatus = useCallback((next: CallAvailability) => {
    setStatusState(next);
    setSince(next === "available" ? null : Date.now());
  }, []);

  const setTimeoutMinutes = useCallback((minutes: number) => {
    setTimeoutMinutesState(minutes);
  }, []);

  // Drive the auto-reset countdown while busy/away. setState only happens
  // inside the interval callback (subscribing to an external timer), never
  // synchronously in the effect body.
  useEffect(() => {
    if (status === "available" || since == null) return;
    const deadline = since + timeoutMinutes * 60_000;
    const tick = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        resetToAvailable();
      } else {
        setSecondsUntilReset(Math.ceil(remaining / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, since, timeoutMinutes, resetToAvailable]);

  return (
    <CallAvailabilityContext.Provider
      value={{
        status,
        timeoutMinutes,
        // Only meaningful while busy/away.
        secondsUntilReset: status === "available" ? null : secondsUntilReset,
        setStatus,
        setTimeoutMinutes,
        resetToAvailable,
      }}
    >
      {children}
    </CallAvailabilityContext.Provider>
  );
}

const FALLBACK: CallAvailabilityValue = {
  status: "available",
  timeoutMinutes: DEFAULT_AVAILABILITY_TIMEOUT_MIN,
  secondsUntilReset: null,
  setStatus: () => {},
  setTimeoutMinutes: () => {},
  resetToAvailable: () => {},
};

export function useCallAvailability(): CallAvailabilityValue {
  return useContext(CallAvailabilityContext) ?? FALLBACK;
}
