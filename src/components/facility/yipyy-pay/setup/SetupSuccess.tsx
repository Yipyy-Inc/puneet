"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import { YipyyPayWordmark } from "../YipyyPayBrand";

// ============================================================================
// The moment it works.
//
// ── WHY IT IS WORTH A SCREEN ──────────────────────────────────────────────
//
// The facility has just connected the account their revenue lands in. The next
// thing they should see is a plain statement of what is now true — not a
// dashboard they have to read to work it out. Every line below is a fact this
// component was handed, not a stock congratulation.
//
// ── THE CONFETTI IS CSS AND IT ASKS FIRST ─────────────────────────────────
//
// Eighteen absolutely-positioned spans on a keyframe. No library, no canvas,
// nothing to load — and `motion-reduce:hidden`, because a burst of moving
// objects is a real problem for some people and this is decoration.
//
// ── AND IT LEAVES ON ITS OWN ──────────────────────────────────────────────
//
// Five seconds, then the dashboard. A celebration screen that has to be
// dismissed is a celebration screen that becomes an obstacle the second time
// somebody sees it.
// ============================================================================

const AUTO_REDIRECT_MS = 5000;

/** Deterministic scatter — no Math.random, so two renders agree. */
const PIECES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 5.6 + ((i * 37) % 11)) % 100}%`,
  delay: `${(i % 6) * 0.18}s`,
  duration: `${2.4 + ((i * 7) % 9) * 0.12}s`,
  tone: [
    "bg-sky-400",
    "bg-teal-400",
    "bg-emerald-400",
    "bg-amber-300",
    "bg-sky-300",
  ][i % 5],
  size: i % 3 === 0 ? "h-2.5 w-1.5" : "h-1.5 w-1.5",
}));

function Confetti() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
    >
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className={`absolute -top-4 rounded-[1px] ${piece.tone} ${piece.size}`}
          style={{
            left: piece.left,
            animation: `yipyy-pay-fall ${piece.duration} ease-in ${piece.delay} forwards`,
          }}
        />
      ))}
      {/* Scoped here rather than in globals.css: it exists for this one screen
          and should leave with it. */}
      <style>{`
        @keyframes yipyy-pay-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(360px) rotate(420deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function Done({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm/relaxed">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <Check className="size-3" />
      </span>
      {children}
    </li>
  );
}

export function SetupSuccess({
  overview,
  onDone,
  onDevices,
}: {
  overview: YipyyPayOverview;
  onDone: () => void;
  /** Straight to the Devices tab — the one thing still worth doing today. */
  onDevices: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_MS / 1000);

  useEffect(() => {
    const tick = setInterval(
      () => setSecondsLeft((left) => Math.max(0, left - 1)),
      1000,
    );
    const timer = setTimeout(onDone, AUTO_REDIRECT_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [onDone]);

  const scope =
    overview.config.locationScope === "all"
      ? overview.locations.length > 1
        ? `All ${overview.locations.length} locations`
        : "Your facility"
      : `${overview.config.locationIds.length} of ${overview.locations.length} locations`;

  const schedule =
    overview.config.payoutSchedule === "next_day"
      ? "Next business day"
      : "Two to three business days";

  return (
    <Card className="relative overflow-hidden">
      <Confetti />
      <CardContent className="relative space-y-6 p-8 text-center sm:p-12">
        <div className="space-y-3">
          <YipyyPayWordmark size="md" tone="ink" className="justify-center" />
          <h3 className="text-2xl font-bold text-balance">
            You can take payments.
          </h3>
          <p className="text-muted-foreground text-sm/relaxed">
            Yipyy Pay is live for{" "}
            <span className="font-medium">{overview.facility.name}</span>.
          </p>
        </div>

        <ul className="mx-auto max-w-xs space-y-2.5 text-left">
          <Done>Payment account connected</Done>
          <Done>Business details confirmed</Done>
          <Done>Payouts: {schedule}</Done>
          <Done>{scope} covered</Done>
        </ul>

        {/* The honest next action. A facility with no terminal yet is not
            finished with hardware, and the dashboard is where they do that. */}
        <p className="text-muted-foreground mx-auto max-w-sm text-sm/relaxed">
          Next: name your card terminal so staff can tell one from another at
          checkout.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" onClick={onDone}>
            Go to Yipyy Pay
            <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" size="lg" onClick={onDevices}>
            <Smartphone className="size-4" />
            Set up a terminal
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Taking you there in {secondsLeft}s.
        </p>
      </CardContent>
    </Card>
  );
}
