"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ─── Types & defaults ────────────────────────────────────────────────────────

export type SlotGranularityMin = 15 | 30 | 60;

export interface GroomingSchedulingSettings {
  /**
   * Master toggle for the booking dialog. When on, the time-slot grid
   * highlights only slots that satisfy the per-groomer buffer constraints
   * and don't conflict with existing appointments; everything else is
   * dimmed but still pickable (staff has the final say). When off, every
   * non-conflicting slot is treated equally.
   */
  smartSchedulingEnabled: boolean;
  /** Slot grid granularity in minutes. Drives the time-slot picker. */
  slotGranularityMin: SlotGranularityMin;
  /**
   * Default buffer added before and after each appointment in minutes when
   * Smart Scheduling is on and no per-groomer override exists. Keeps the
   * dialog functional even when the booking-rules screen hasn't been
   * populated yet.
   */
  defaultBufferMin: number;
}

const DEFAULT_SETTINGS: GroomingSchedulingSettings = {
  smartSchedulingEnabled: true,
  slotGranularityMin: 30,
  defaultBufferMin: 15,
};

const STORAGE_KEY = "settings-grooming-scheduling-v1";

// ─── localStorage adapter ────────────────────────────────────────────────────

function loadStored(): GroomingSchedulingSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Coerce slot granularity to the allowed set so an old or hand-edited
      // value can't break the slot grid.
      slotGranularityMin: ([15, 30, 60] as SlotGranularityMin[]).includes(
        parsed?.slotGranularityMin,
      )
        ? (parsed.slotGranularityMin as SlotGranularityMin)
        : DEFAULT_SETTINGS.slotGranularityMin,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface GroomingSchedulingContextValue extends GroomingSchedulingSettings {
  update: (patch: Partial<GroomingSchedulingSettings>) => void;
}

const GroomingSchedulingContext =
  createContext<GroomingSchedulingContextValue | null>(null);

export function GroomingSchedulingProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Avoid an SSR/CSR hydration mismatch — start with defaults, then
  // hydrate from localStorage in an effect after mount.
  const [settings, setSettings] =
    useState<GroomingSchedulingSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadStored());
    setHydrated(true);
  }, []);

  const update = useCallback(
    (patch: Partial<GroomingSchedulingSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        if (hydrated && typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore quota / private-mode failures
          }
        }
        return next;
      });
    },
    [hydrated],
  );

  return (
    <GroomingSchedulingContext.Provider value={{ ...settings, update }}>
      {children}
    </GroomingSchedulingContext.Provider>
  );
}

export function useGroomingScheduling(): GroomingSchedulingContextValue {
  const ctx = useContext(GroomingSchedulingContext);
  if (!ctx) {
    throw new Error(
      "useGroomingScheduling must be used inside GroomingSchedulingProvider",
    );
  }
  return ctx;
}
