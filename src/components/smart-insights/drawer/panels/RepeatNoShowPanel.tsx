"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowLeft,
  CalendarClock,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { ConfirmBeforeModify } from "../shared/ConfirmBeforeModify";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 5.3 Take Action — repeat no-show client flag.
 * Spec gives two paths in the drawer:
 *  1. Send personalized SMS reminder confirming booking + cancellation policy
 *  2. Require a deposit (one-time override) — opens each booking in sequence
 *     with a deposit collection prompt.
 */

interface FlaggedBooking {
  bookingId: string;
  clientId: string;
  clientName: string;
  petName: string;
  phone: string;
  date: string;
  service: string;
  noShowCount: number;
  value: number;
}

const FLAGGED: FlaggedBooking[] = [
  { bookingId: "BK-22481", clientId: "c-901", clientName: "Pierre Lavoie", petName: "Otis", phone: "+1 514-555-0144", date: "May 22, 9:30 AM", service: "Grooming – Full", noShowCount: 3, value: 135 },
  { bookingId: "BK-22517", clientId: "c-902", clientName: "Hannah Patel", petName: "Layla", phone: "+1 514-555-0211", date: "May 23, 11:00 AM", service: "Daycare", noShowCount: 2, value: 45 },
  { bookingId: "BK-22634", clientId: "c-903", clientName: "Etienne Roy", petName: "Biscuit", phone: "+1 514-555-0319", date: "May 28, 2:00 PM", service: "Boarding (2 nights)", noShowCount: 2, value: 220 },
  { bookingId: "BK-22708", clientId: "c-904", clientName: "Yuki Tanaka", petName: "Kuma", phone: "+1 514-555-0426", date: "May 30, 10:00 AM", service: "Grooming – Bath & Brush", noShowCount: 2, value: 80 },
  { bookingId: "BK-22791", clientId: "c-905", clientName: "Marcus Wright", petName: "Diesel", phone: "+1 514-555-0532", date: "Jun 02, 3:30 PM", service: "Training (1 session)", noShowCount: 4, value: 160 },
];

const DEFAULT_SMS = `Hi {{firstName}}, this is Doggieville confirming {{petName}}'s appointment on {{date}}. Our cancellation policy: please give 24-hour notice or a no-show fee may apply. Reply YES to confirm, or call us at (514) 555-0100. Thanks!`;

type Mode = "menu" | "sms" | "deposit";

export function RepeatNoShowPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "menu") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <FlaggedList />
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setMode("sms")}
            className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
          >
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
              <MessageSquare className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Send appointment reminder</span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Personalized SMS confirming the booking and citing your cancellation policy
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("deposit")}
            className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
          >
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
              <DollarSign className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Require a deposit (one-time)</span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Adds a deposit requirement to each flagged booking
              </span>
            </span>
          </button>
        </div>
        <div className="mt-auto">
          <DrawerFooter primaryLabel="Close" onPrimary={onCancel} />
        </div>
      </div>
    );
  }

  if (mode === "sms") {
    return <SmsFlow onBack={() => setMode("menu")} onComplete={() => onComplete()} />;
  }

  return (
    <DepositFlow
      onBack={() => setMode("menu")}
      onComplete={() => onComplete()}
    />
  );
}

function FlaggedList() {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
        <AlertOctagon className="size-3.5" />
        {FLAGGED.length} flagged bookings
      </div>
      <ul className="space-y-2">
        {FLAGGED.map((b) => (
          <li
            key={b.bookingId}
            className="flex items-center justify-between gap-3 rounded-md border bg-white p-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                <Link
                  href={insightLinks.client(b.clientId)}
                  className="hover:text-primary hover:underline"
                >
                  {b.clientName}
                </Link>{" "}
                · {b.petName}
              </p>
              <p className="text-muted-foreground text-xs">
                <CalendarClock className="mr-1 inline size-3" />
                {b.date} ·{" "}
                <Link
                  href={insightLinks.booking(b.bookingId)}
                  className="hover:text-primary hover:underline"
                >
                  {b.bookingId}
                </Link>{" "}
                · {b.service}
              </p>
            </div>
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
              {b.noShowCount} no-shows
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SmsFlow({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [template, setTemplate] = useState(DEFAULT_SMS);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Send appointment reminder" />
        <div className="space-y-2">
          <Label htmlFor="sms-body">SMS template</Label>
          <Textarea
            id="sms-body"
            rows={6}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Tokens <code>{"{{firstName}}"}</code>, <code>{"{{petName}}"}</code>,{" "}
            <code>{"{{date}}"}</code> resolve per recipient.
          </p>
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={!template.trim()}
            secondaryLabel="Back"
            onSecondary={onBack}
          />
        </div>
      </div>
    );
  }

  const first = FLAGGED[0];
  const resolved = template
    .replaceAll("{{firstName}}", first.clientName.split(" ")[0])
    .replaceAll("{{petName}}", first.petName)
    .replaceAll("{{date}}", first.date);

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("compose")} label="Confirm SMS" />
      <PreviewBeforeSend
        channel="sms"
        recipients={FLAGGED.map((b) => `${b.clientName} (${b.phone})`)}
        body={resolved}
        meta={[
          { label: "Recipients", value: FLAGGED.length },
          { label: "Channel", value: "SMS" },
        ]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send to all"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
        />
      </div>
    </div>
  );
}

function DepositFlow({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  const [amount, setAmount] = useState<number>(25);
  const [idx, setIdx] = useState<number>(0);
  const [step, setStep] = useState<"sequence" | "confirm">("sequence");

  const current = FLAGGED[idx];
  const isLast = idx === FLAGGED.length - 1;

  if (step === "sequence") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Require deposit" />
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            Booking {idx + 1} of {FLAGGED.length}
          </div>
          <p className="font-semibold">
            {current.clientName} · {current.petName}
          </p>
          <p className="text-muted-foreground text-xs">
            {current.date} · {current.service} · ${current.value} total
          </p>
          <p className="text-xs">
            <span className="text-muted-foreground">No-show history: </span>
            <span className="font-semibold text-red-700">
              {current.noShowCount} no-shows
            </span>
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deposit-amount">Deposit amount</Label>
          <div className="relative">
            <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
              $
            </span>
            <Input
              id="deposit-amount"
              type="number"
              min={0}
              step={5}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              className="pl-7"
            />
          </div>
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel={isLast ? "Review all" : "Apply & next booking"}
            onPrimary={() => {
              if (isLast) setStep("confirm");
              else setIdx((i) => i + 1);
            }}
            primaryDisabled={!amount || amount <= 0}
            secondaryLabel={idx === 0 ? "Back" : "Previous"}
            onSecondary={() => {
              if (idx === 0) onBack();
              else setIdx((i) => i - 1);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("sequence")} label="Confirm deposit overrides" />
      <ConfirmBeforeModify
        title="Apply deposit override to all flagged bookings"
        changes={FLAGGED.map((b) => ({
          field: b.bookingId,
          to: `${b.clientName} · ${b.petName} · $${amount} deposit`,
        }))}
        note="The clients will receive a payment request via their preferred channel. Bookings without a paid deposit by 24h before the appointment will be auto-cancelled."
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Apply all"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={() => setStep("sequence")}
        />
      </div>
    </div>
  );
}

function BackHeader({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-xs uppercase tracking-wide transition-colors"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </button>
  );
}
