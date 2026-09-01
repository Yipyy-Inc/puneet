"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Info, PhoneCall } from "lucide-react";

// ============================================================================
// Porting an existing number — what we can honestly offer today.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// A five-step wizard that fabricated the entire process:
//
//   * "Instantly check if it's eligible" ran `setTimeout(1500)` and then
//     declared any number ENDING IN 0 ineligible and everything else eligible.
//     A business could have abandoned a port, or begun one, on a digit.
//   * Steps 2 and 3 collected the carrier ACCOUNT NUMBER and PIN — the
//     credentials that authorise a transfer away from a carrier — plus the
//     service address and an uploaded bill. All of it went into React state and
//     nowhere else. There is no porting backend and no table to hold it.
//   * Step 4 said "By submitting, a Letter of Authorization will be sent to
//     your email for a digital signature." Nothing sends an email.
//   * Step 5 said "Port request submitted!", showed a hardcoded
//     "In Progress — Est. May 3, 2026" and listed a MOCK_STATUS_UPDATES array
//     under the heading "Real-time status updates".
//
// The trigger card advertised "Free porting · Digital LOA · Real-time status".
//
// ── WHY A REQUEST AND NOT A FLAG ──────────────────────────────────────────
//
// There is no feature-flag mechanism in this codebase to hide it behind, and
// keeping five steps of unreachable flow "for Phase 2" is how a fabricated
// screen ships by accident. Porting arrives properly in Phase 2 with
// `communication_numbers` and a real carrier integration (P2-04); this asks for
// the one thing a person can act on now, and says plainly that a human does the
// rest.
//
// It deliberately does NOT take an account number or a PIN. Those are
// credentials, and nothing here is allowed to hold one — the same rule the
// settings domains follow.
// ============================================================================

export function NumberPortingWizard() {
  const [number, setNumber] = useState("");
  const [sent, setSent] = useState(false);

  const mailto = `mailto:support@yipyy.com?subject=${encodeURIComponent(
    "Port my existing business number",
  )}&body=${encodeURIComponent(
    `I'd like to transfer my existing business number to Yipyy.\n\nNumber: ${
      number || "(number)"
    }\n\nPlease let me know what you need from my current carrier.`,
  )}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PhoneCall className="text-primary size-4" />
          Port Your Number
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Transfer your existing business number to this platform
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2.5 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            Porting is not self-serve yet. Tell us the number and we&apos;ll
            check it with your carrier and come back to you — most business
            numbers can be transferred, and your line keeps working throughout.
          </span>
        </div>

        <div>
          <Label className="mb-2 block">
            Your current business number{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            className="max-w-xs font-mono"
            inputMode="tel"
            placeholder="+1 (555) 000-0000"
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
              setSent(false);
            }}
          />
          <p className="text-muted-foreground mt-1.5 text-xs">
            We never ask for your carrier account number or PIN here. Those are
            only ever given on a signed Letter of Authorization, which we will
            walk you through.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" asChild onClick={() => setSent(true)}>
            <a href={mailto}>Ask us to port this number</a>
          </Button>
          {sent && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Opened in your email app — nothing has been sent from here
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
