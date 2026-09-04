"use client";

import { useCallback, useEffect, useState } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";

// ============================================================================
// The three contexts, the density, and the column budget.
// docs/design-system/design-system.md §5m, §5n, §6 rule 6.
//
// §5m does not describe three widths, it describes three PEOPLE:
//
//   <= 599px     phone    floor staff, standing, a leash in the other hand
//   600-1023px   tablet   check-in desk, shared device, an owner watching
//   >= 1024px    desktop  back office, seated, mouse, hours at a time
//
// Everything below follows from which of those three you are.
// ============================================================================

export type TableContext = "phone" | "tablet" | "desktop";
export type Density = "compact" | "balanced" | "roomy";

/** §5n — three things move, and nothing else. Font size never does (rule 16). */
export const DENSITY = {
  compact: { row: "h-10", cell: "px-3.5 py-2", avatar: 24 },
  balanced: { row: "h-12", cell: "px-4 py-3", avatar: 32 },
  roomy: { row: "h-14", cell: "p-4", avatar: 32 },
} as const satisfies Record<
  Density,
  { row: string; cell: string; avatar: number }
>;

/**
 * §6 rule 6 / §5m: "A table that will not fit LOSES COLUMNS, it does not
 * scroll." Seven at desktop, five at tablet, four fields on a card below.
 *
 * The reason the ban holds even at nine columns is worth keeping in front of
 * whoever raises these numbers: a sideways-scrolling table pushes the
 * IDENTITY column out of view, and identity is the column that makes the
 * other eight legible.
 */
export const COLUMN_BUDGET: Record<TableContext, number> = {
  phone: 4,
  tablet: 5,
  desktop: 7,
};

/**
 * Which of §5m's three contexts this is.
 *
 * `serverDefault` is desktop on both queries, so the server and the hydration
 * render agree on the widest layout and the real match takes over immediately
 * after. Guessing narrow on the server would make every desktop load flash a
 * card list.
 */
export function useTableContext(): TableContext {
  const isPhone = useMediaQuery("(max-width: 599px)", false);
  const isBelowDesktop = useMediaQuery("(max-width: 1023px)", false);
  if (isPhone) return "phone";
  if (isBelowDesktop) return "tablet";
  return "desktop";
}

const STORAGE_PREFIX = "yipyy.table.density.";

function isDensity(value: unknown): value is Density {
  return value === "compact" || value === "balanced" || value === "roomy";
}

/**
 * The density actually in force, plus the setter for the saved preference.
 *
 * ── BELOW 1024px THE PREFERENCE IS IGNORED, NOT OVERWRITTEN ───────────────
 *
 * §5n: "Below 1024px the preference is ignored and roomy wins." Ignored is the
 * operative word — a manager who set compact on their desk machine and then
 * opens the same screen on the check-in tablet gets roomy there and compact
 * again when they sit back down. Writing roomy into storage on the tablet
 * would silently destroy their choice.
 *
 * So `density` is what the table renders and `preference` is what the user
 * picked; they differ on purpose, and the control that sets it is only
 * offered where it applies.
 *
 * ── PER USER, AND THE HONEST LIMIT ────────────────────────────────────────
 *
 * §5n calls this "a per-table preference saved per user, not a global theme",
 * and per-table is exactly what `tableId` gives. Per USER is where this falls
 * short: localStorage is per browser, so the same person on a second device
 * starts from the default. A row in Postgres would fix that and is a
 * migration, an API route and an RLS policy — worth doing, and deliberately
 * not smuggled into a design stage. Recorded in WORK_ORDER.md stage 9.
 *
 * Without a `tableId` nothing is persisted at all: a table that cannot name
 * itself must not write to a key some other table would read back.
 */
export function useDensityPreference(tableId?: string): {
  density: Density;
  preference: Density;
  setPreference: (next: Density) => void;
  /** False below 1024px, where §5n says the preference does not apply. */
  canChoose: boolean;
} {
  const context = useTableContext();
  const [preference, setStored] = useState<Density>("balanced");

  // Read after mount, never during render: localStorage does not exist on the
  // server, and seeding state from it would make the hydration render
  // disagree with the server's.
  useEffect(() => {
    if (!tableId) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + tableId);
      if (isDensity(raw)) setStored(raw);
    } catch {
      // Private mode, or storage disabled. The default is a working table.
    }
  }, [tableId]);

  const setPreference = useCallback(
    (next: Density) => {
      setStored(next);
      if (!tableId) return;
      try {
        window.localStorage.setItem(STORAGE_PREFIX + tableId, next);
      } catch {
        // Not being able to REMEMBER the choice must not stop it applying.
      }
    },
    [tableId],
  );

  return {
    density: context === "desktop" ? preference : "roomy",
    preference,
    setPreference,
    canChoose: context === "desktop",
  };
}
