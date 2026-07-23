"use client";

import { useState } from "react";
import {
  BookOpenCheck,
  Coins,
  Landmark,
  Link2,
  PawPrint,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuickBooksAccessModal } from "./QuickBooksAccessModal";

// Step 0 — the pre-connection entry point (Section 3A). Carries the visual
// weight of clover-integration-card.tsx: a branded header block, one clear
// primary action, and no configuration surface until the facility has actually
// connected.

const BENEFITS = [
  {
    Icon: Coins,
    title: "Every dollar tracked",
    body: "Sales, tips, deposits, gift cards and refunds all land in the right account — not lumped into one line at month end.",
  },
  {
    Icon: Sparkles,
    title: "No more manual entry",
    body: "Nobody retypes yesterday's takings. Each payment posts itself the moment it's taken.",
  },
  {
    Icon: BookOpenCheck,
    title: "Your accountant will love it",
    body: "Real QuickBooks sales receipts and invoices, itemised per service, reconciled to the cent.",
  },
] as const;

export function QuickBooksEntryPoint({
  onConnect,
}: {
  /** Opens the consent modal. The modal itself is mounted by the parent view,
   *  not here: approving updates the connection store, which routes this
   *  component off screen — and it would take the modal, and its success
   *  panel, down with it. */
  onConnect: () => void;
}) {
  const [accessOpen, setAccessOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Branded header: QuickBooks ↔ Yipyy ─────────────────────────── */}
      <Card className="border-emerald-500/20">
        <CardContent className="space-y-6 py-8 text-center">
          <div className="flex items-center justify-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-green-700 text-white shadow-sm">
              <Landmark className="size-7" />
            </span>
            <Link2 className="text-muted-foreground size-5 shrink-0" />
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-sm">
              <PawPrint className="size-7" />
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              QuickBooks Online
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-sm">
              Sync every sale, payment, and refund from Yipyy directly to your
              QuickBooks account — automatically, accurately, and in real time.
            </p>
          </div>

          <div className="space-y-3">
            {/* Connecting, its pending state, the success panel and the
                failure/"Try again" path all live inside the consent modal —
                the same place the facility grants access. */}
            <Button
              size="lg"
              onClick={onConnect}
              className="h-12 bg-emerald-600 px-8 text-base text-white hover:bg-emerald-700"
            >
              Connect to QuickBooks
            </Button>
            <div>
              <button
                type="button"
                onClick={() => setAccessOpen(true)}
                className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
              >
                What will Yipyy access in QuickBooks?
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Why bother ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {BENEFITS.map(({ Icon, title, body }) => (
          <Card key={title}>
            <CardContent className="space-y-2 py-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Icon className="size-4.5" />
              </span>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-muted-foreground text-xs/relaxed">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <QuickBooksAccessModal open={accessOpen} onOpenChange={setAccessOpen} />
    </div>
  );
}
