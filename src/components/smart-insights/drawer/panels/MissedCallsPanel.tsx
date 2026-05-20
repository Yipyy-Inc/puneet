"use client";

import { useState } from "react";
import { ArrowLeft, PhoneMissed, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 3.7 Take Action — call log filtered to Missed status + bulk
 * callback SMS to callers who did NOT leave a voicemail (matched against
 * client profiles by phone number).
 */

interface MissedCall {
  id: string;
  phone: string;
  matchedClient?: string;
  time: string;
  voicemail: boolean;
}

const MISSED_CALLS: MissedCall[] = [
  { id: "MC-1", phone: "+1 514-555-0144", matchedClient: "Pierre Lavoie", time: "8:42 AM", voicemail: false },
  { id: "MC-2", phone: "+1 514-555-0289", time: "9:11 AM", voicemail: false },
  { id: "MC-3", phone: "+1 514-555-0211", matchedClient: "Hannah Patel", time: "11:03 AM", voicemail: true },
  { id: "MC-4", phone: "+1 514-555-0426", matchedClient: "Yuki Tanaka", time: "11:18 AM", voicemail: false },
  { id: "MC-5", phone: "+1 514-555-0512", matchedClient: "Marie Tremblay", time: "11:32 AM", voicemail: false },
  { id: "MC-6", phone: "+1 438-555-0199", time: "11:47 AM", voicemail: false },
  { id: "MC-7", phone: "+1 514-555-0703", matchedClient: "Owen Park", time: "12:08 PM", voicemail: true },
  { id: "MC-8", phone: "+1 514-555-0844", matchedClient: "Sofia Diaz", time: "12:22 PM", voicemail: false },
  { id: "MC-9", phone: "+1 438-555-0317", time: "12:36 PM", voicemail: false },
  { id: "MC-10", phone: "+1 514-555-0976", matchedClient: "Iris Khoury", time: "12:51 PM", voicemail: false },
  { id: "MC-11", phone: "+1 514-555-1023", matchedClient: "Henry Kim", time: "1:09 PM", voicemail: false },
];

const NO_VOICEMAIL = MISSED_CALLS.filter((c) => !c.voicemail);

const DEFAULT_SMS = `Hi! This is Doggieville — we missed your call earlier today. How can we help? Reply here or call us back at (514) 555-0100. — The Doggieville team`;

type Mode = "log" | "callback";

export function MissedCallsPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [mode, setMode] = useState<Mode>("log");

  if (mode === "log") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-red-50 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-900">
            <PhoneMissed className="size-3.5" />
            {MISSED_CALLS.length} missed today
          </div>
          <p className="text-red-900">
            {NO_VOICEMAIL.length} callers did <b>not</b> leave a voicemail —
            they're the prime targets for a callback SMS.
          </p>
        </div>

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {MISSED_CALLS.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {c.matchedClient ?? <span className="italic">Unknown caller</span>}
                </p>
                <p className="text-muted-foreground text-xs">
                  {c.phone} · {c.time}
                </p>
              </div>
              {c.voicemail ? (
                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800">
                  Voicemail
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                  No VM
                </Badge>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setMode("callback")}
          className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
        >
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
            <MessageSquare className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Send callback SMS</span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              "We missed your call, how can we help?" to {NO_VOICEMAIL.length}{" "}
              callers without a voicemail
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
    <CallbackFlow onBack={() => setMode("log")} onComplete={() => onComplete()} />
  );
}

function CallbackFlow({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [body, setBody] = useState(DEFAULT_SMS);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Send callback SMS" />
        <div className="space-y-2">
          <Label htmlFor="callback-body">Message</Label>
          <Textarea
            id="callback-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={!body.trim()}
            secondaryLabel="Back"
            onSecondary={onBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("compose")} label="Confirm SMS" />
      <PreviewBeforeSend
        channel="sms"
        recipients={NO_VOICEMAIL.map(
          (c) => `${c.matchedClient ?? "Unknown"} · ${c.phone}`,
        )}
        body={body}
        meta={[
          { label: "Recipients", value: NO_VOICEMAIL.length },
          {
            label: "Matched clients",
            value: NO_VOICEMAIL.filter((c) => c.matchedClient).length,
          },
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
