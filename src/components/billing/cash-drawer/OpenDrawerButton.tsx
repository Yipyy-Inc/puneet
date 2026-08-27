"use client";

import { useState } from "react";
import { Loader2, Vault } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResolvedTerminal } from "@/lib/api/terminals";

// ============================================================================
// Opening the till.
//
// ── THE DRAWER BELONGS TO THE DEVICE, NOT TO YIPYY ────────────────────────
//
// A cash drawer is plugged into a Clover terminal, so opening one is a device
// command in the same family as printing. Which terminal is the one the counter
// already chose — `useResolvedTerminal` is what the checkout uses, so the till
// and the card reader cannot disagree about which device is "this counter".
//
// ── A FACILITY WITH NO DRAWER IS TOLD SO ──────────────────────────────────
//
// Not a failure and not a retry: most Clover devices have nothing plugged into
// them, and a button that throws when pressed is the same defect as one that
// claims to have worked. The route answers 409 `no_drawer` and that sentence is
// what appears.
// ============================================================================

export function OpenDrawerButton() {
  const { chosen, isPending } = useResolvedTerminal();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // No terminal chosen means no drawer to open, and nothing useful to say —
  // the checkout is where a terminal gets picked.
  if (isPending || !chosen) return null;

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          try {
            const response = await fetch("/api/payments/clover/device", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "open-drawer",
                deviceSerial: chosen.serial,
                reason: "Opened from the Daily Register",
              }),
            });
            const body = (await response.json().catch(() => null)) as {
              opened?: boolean;
              error?: string;
            } | null;

            // Only "opened" when the device said so. Anything else says what
            // happened rather than falling back to a hopeful sentence.
            setMessage(
              body?.opened
                ? "Drawer opened."
                : (body?.error ?? "The drawer did not open."),
            );
          } catch {
            setMessage("The terminal could not be reached.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <Loader2 className="mr-2 size-3.5 animate-spin" />
        ) : (
          <Vault className="mr-2 size-3.5" />
        )}
        {busy ? "Opening…" : "Open drawer"}
      </Button>

      {message && (
        <p className="text-muted-foreground text-xs" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
