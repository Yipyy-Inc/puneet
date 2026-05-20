"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, XCircle, MailX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 3.3 Take Action — review this week's cancellations, then one-click
 * win-back message to clients who cancelled.
 */

interface CancellationRow {
  id: string;
  clientId: string;
  clientName: string;
  petName: string;
  date: string;
  service: string;
  reason: string;
  value: number;
  email: string;
}

const CANCELLATIONS: CancellationRow[] = [
  { id: "C-1", clientId: "c-1001", clientName: "Aiden Mac", petName: "Bo", date: "May 14", service: "Grooming", reason: "Client cancelled — no reason", value: 85, email: "amac@example.com" },
  { id: "C-2", clientId: "c-1002", clientName: "Léa Marchand", petName: "Mango", date: "May 14", service: "Daycare", reason: "Sick pet", value: 45, email: "lmarchand@example.com" },
  { id: "C-3", clientId: "c-1003", clientName: "Thomas Ko", petName: "Pepper", date: "May 15", service: "Grooming", reason: "Client cancelled — no reason", value: 95, email: "tko@example.com" },
  { id: "C-4", clientId: "c-1004", clientName: "Maya Singh", petName: "Charlie", date: "May 15", service: "Boarding", reason: "Travel change", value: 220, email: "msingh@example.com" },
  { id: "C-5", clientId: "c-1005", clientName: "Hugo Brisson", petName: "Otis", date: "May 16", service: "Daycare", reason: "Client cancelled — no reason", value: 45, email: "hbrisson@example.com" },
  { id: "C-6", clientId: "c-1006", clientName: "Sara Khan", petName: "Layla", date: "May 16", service: "Grooming", reason: "Client cancelled — no reason", value: 85, email: "skhan@example.com" },
  { id: "C-7", clientId: "c-1007", clientName: "Eli Ross", petName: "Cooper", date: "May 17", service: "Training", reason: "Client cancelled — no reason", value: 60, email: "eross@example.com" },
  { id: "C-8", clientId: "c-1008", clientName: "Nora Diaz", petName: "Daisy", date: "May 17", service: "Daycare", reason: "Sick pet", value: 45, email: "ndiaz@example.com" },
  { id: "C-9", clientId: "c-1009", clientName: "Owen Park", petName: "Luna", date: "May 18", service: "Grooming", reason: "Client cancelled — no reason", value: 95, email: "opark@example.com" },
  { id: "C-10", clientId: "c-1010", clientName: "Bea Klein", petName: "Olive", date: "May 18", service: "Boarding", reason: "Travel change", value: 175, email: "bklein@example.com" },
  { id: "C-11", clientId: "c-1011", clientName: "Felix Owen", petName: "Theo", date: "May 19", service: "Grooming", reason: "Client cancelled — no reason", value: 95, email: "fowen@example.com" },
  { id: "C-12", clientId: "c-1012", clientName: "Lucas Roy", petName: "Hazel", date: "May 19", service: "Daycare", reason: "Client cancelled — no reason", value: 45, email: "lroy@example.com" },
  { id: "C-13", clientId: "c-1013", clientName: "Iris Khoury", petName: "Sage", date: "May 20", service: "Grooming", reason: "Client cancelled — no reason", value: 95, email: "ikhoury@example.com" },
  { id: "C-14", clientId: "c-1014", clientName: "Daniel Wu", petName: "Rumi", date: "May 20", service: "Daycare", reason: "Client cancelled — no reason", value: 45, email: "dwu@example.com" },
  { id: "C-15", clientId: "c-1015", clientName: "Mia Pierre", petName: "Atlas", date: "May 20", service: "Boarding", reason: "Client cancelled — no reason", value: 175, email: "mpierre@example.com" },
  { id: "C-16", clientId: "c-1016", clientName: "Noah Lee", petName: "Tucker", date: "May 20", service: "Grooming", reason: "Client cancelled — no reason", value: 85, email: "nlee@example.com" },
  { id: "C-17", clientId: "c-1017", clientName: "Zoe Bauer", petName: "Echo", date: "May 20", service: "Training", reason: "Schedule conflict", value: 60, email: "zbauer@example.com" },
  { id: "C-18", clientId: "c-1018", clientName: "Adam Cohen", petName: "Joey", date: "May 20", service: "Daycare", reason: "Client cancelled — no reason", value: 45, email: "acohen@example.com" },
];

const REVENUE_LOST = CANCELLATIONS.reduce((s, c) => s + c.value, 0);
const NO_REASON_COUNT = CANCELLATIONS.filter((c) =>
  c.reason.includes("no reason"),
).length;

type Mode = "review" | "winback";

export function CancellationsReviewPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [mode, setMode] = useState<Mode>("review");

  if (mode === "review") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-red-50 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-900">
            <XCircle className="size-3.5" />
            {CANCELLATIONS.length} cancellations · ${REVENUE_LOST} lost
          </div>
          <p className="text-red-900">
            {NO_REASON_COUNT} of {CANCELLATIONS.length} marked "client cancelled
            — no reason given".
          </p>
        </div>

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {CANCELLATIONS.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <Link
                    href={insightLinks.client(c.clientId)}
                    className="hover:text-primary hover:underline"
                  >
                    {c.clientName}
                  </Link>{" "}
                  · {c.petName}
                </p>
                <p className="text-muted-foreground text-xs">
                  {c.date} · {c.service} · {c.reason}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold">${c.value}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setMode("winback")}
          className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
        >
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
            <MailX className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Send win-back to all</span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              Pre-drafted message to all {CANCELLATIONS.length} clients who
              cancelled
            </span>
          </span>
        </button>

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Mark reviewed"
            onPrimary={() => onComplete()}
            onSecondary={onCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <WinbackFlow onBack={() => setMode("review")} onComplete={() => onComplete()} />
  );
}

function WinbackFlow({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState(
    "We'd love to reschedule {{petName}}'s visit",
  );
  const [body, setBody] = useState(
    `Hi {{firstName}},\n\nSorry we missed {{petName}} this week. We'd love to get you rescheduled at a time that works better.\n\nAs a thank-you for sticking with us, here's 10% off your next visit if you rebook within 14 days.\n\nBook now: doggieville.ca/book\n\nHope to see you soon,\nThe Doggieville team`,
  );

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Win-back campaign" />
        <div className="space-y-2">
          <Label htmlFor="wb-subject">Subject</Label>
          <Input id="wb-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wb-body">Message</Label>
          <Textarea
            id="wb-body"
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={!subject.trim() || !body.trim()}
            secondaryLabel="Back"
            onSecondary={onBack}
          />
        </div>
      </div>
    );
  }

  const first = CANCELLATIONS[0];
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("compose")} label="Confirm send" />
      <PreviewBeforeSend
        channel="email"
        recipients={CANCELLATIONS.map((c) => `${c.clientName} <${c.email}>`)}
        subject={subject
          .replaceAll("{{firstName}}", first.clientName.split(" ")[0])
          .replaceAll("{{petName}}", first.petName)}
        body={body
          .replaceAll("{{firstName}}", first.clientName.split(" ")[0])
          .replaceAll("{{petName}}", first.petName)}
        meta={[
          { label: "Recipients", value: CANCELLATIONS.length },
          { label: "Offer", value: "10% off" },
        ]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send campaign"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
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
