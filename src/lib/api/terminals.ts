"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Choosing a terminal, and remembering the choice.
//
// ── THEY ARE INTERCHANGEABLE, WHICH DECIDES THE WHOLE DESIGN ──────────────
//
// A facility's terminals are identical. More of them is not more capability, it
// is more LANES: during a rush three staff charge three customers at once
// rather than queueing behind one device.
//
// So "which terminal" is never a semantic question — it is "the box in front of
// me, and one nobody else is using". That is why there is no per-service or
// per-room mapping here, and why the interesting failure is BUSY rather than
// wrong.
//
// ── REMEMBERED PER BROWSER, NOT PER USER ──────────────────────────────────
//
// The till by the door is a different physical station from the tablet in the
// back, and staff share both. What persists is therefore a property of the
// MACHINE, so it lives in that machine's storage: press once, and that station
// keeps reaching for the same box.
//
// Falling back to the facility default when storage is empty or cleared is the
// correct failure — it lands on something that works rather than on nothing.
// ============================================================================

const STORAGE_KEY = "yipyy.terminal.serial";

export interface TerminalOption {
  serial: string;
  /** What the facility calls it. Null until somebody names it. */
  label: string | null;
  /** Clover's own name — "Flex 4". Shown when there is no label. */
  model: string | null;
  isDefault: boolean;
  supported: boolean;
}

export const terminalQueries = {
  all: () => ({
    queryKey: ["clover-terminals"] as const,
    queryFn: async (): Promise<TerminalOption[]> => {
      const response = await fetch("/api/payments/clover/terminals");
      if (!response.ok) return [];
      const parsed = (await response.json().catch(() => null)) as {
        terminals?: TerminalOption[];
      } | null;
      return parsed?.terminals ?? [];
    },
    // Hardware does not come and go mid-shift.
    staleTime: 5 * 60 * 1000,
  }),
};

// ── The remembered choice ──────────────────────────────────────────────────
//
// useSyncExternalStore rather than useState + useEffect: the value lives
// outside React, and the React Compiler is explicit that synchronising external
// state INTO state during an effect is the thing not to do.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab choosing a terminal is a different station, not this one — but
  // the same tab writing is, so both are cheap to honour.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing, or storage disabled. The facility default still works.
    return null;
  }
}

/** Server-rendered HTML knows nothing about this machine. */
const readServer = () => null;

export function useTerminalChoice() {
  const stored = useSyncExternalStore(subscribe, readStored, readServer);

  const remember = useCallback((serial: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, serial);
    } catch {
      /* choosing still works for this payment; it just will not persist */
    }
    for (const listener of listeners) listener();
  }, []);

  return { stored, remember };
}

/**
 * The terminal this station should use: what it last chose, else the facility
 * default, else the only one there is.
 */
export function resolveTerminal(
  terminals: TerminalOption[],
  stored: string | null,
): TerminalOption | null {
  if (terminals.length === 0) return null;
  return (
    terminals.find((t) => t.serial === stored) ??
    terminals.find((t) => t.isDefault) ??
    terminals[0]!
  );
}

/** What to call a terminal on screen. */
export function terminalName(terminal: TerminalOption): string {
  return terminal.label ?? terminal.model ?? terminal.serial;
}

/**
 * Everything a caller needs about which terminal to charge on.
 *
 * The OWNER of the choice, deliberately. An earlier cut had the picker report
 * its resolved terminal upward through a callback, which meant calling the
 * parent's setter during render — the thing React warns about and the React
 * Compiler flags. Resolving here instead makes the picker presentational and
 * the answer available to whoever actually needs it.
 */
export function useResolvedTerminal() {
  const { data: terminals = [], isPending } = useQuery(terminalQueries.all());
  const { stored, remember } = useTerminalChoice();
  const chosen = resolveTerminal(terminals, stored);
  return { terminals, chosen, choose: remember, isPending };
}

export interface TerminalChargeResult {
  paymentId: string;
  reference: string | null;
  amountCents: number;
  cardBrand: string | null;
  cardLast4: string | null;
}

/**
 * Charge on a terminal.
 *
 * No timeout is set here on purpose. The request is held open while the
 * customer reads the screen and finds their card — a verified sale took 83
 * seconds — so the browser must wait as long as the server does.
 */
export function useChargeOnTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      deviceSerial: string;
      tipCents?: number;
    }): Promise<TerminalChargeResult> => {
      const response = await fetch("/api/payments/clover/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as
        | (Partial<TerminalChargeResult> & { error?: string; code?: string })
        | null;

      if (!response.ok) {
        const error = new Error(
          parsed?.error ?? "The terminal did not take the payment.",
        );
        // Carried so the dialog can offer another terminal rather than just
        // reporting a failure — the whole point of having several.
        (error as Error & { code?: string }).code = parsed?.code;
        throw error;
      }
      return {
        paymentId: parsed?.paymentId ?? "",
        reference: parsed?.reference ?? null,
        amountCents: parsed?.amountCents ?? 0,
        cardBrand: parsed?.cardBrand ?? null,
        cardLast4: parsed?.cardLast4 ?? null,
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
