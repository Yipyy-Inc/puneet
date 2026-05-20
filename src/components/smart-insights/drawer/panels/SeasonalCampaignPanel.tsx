"use client";

import { useState } from "react";
import { Sun, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 5.4 Take Action — early-booking campaign for a forecast demand
 * spike. Spec subject template "Summer spots are filling fast — reserve
 * yours now". Recipients default to active clients from the past 12 months.
 */

const DEFAULT_SUBJECT = "Summer spots are filling fast — reserve yours now";
const DEFAULT_BODY = `Hi {{firstName}},

Last summer was our busiest yet, and our boarding spots in mid-July typically book up 4-6 weeks ahead.

To make sure {{petName}} has a spot when you need it, you can reserve now and only pay when you check in:

→ Book early: doggieville.ca/book

We expect peak weeks of July 13–26 to fill first. Locking in your dates today means no scrambling when summer arrives.

Cheers,
The Doggieville team`;

const ACTIVE_CLIENT_COUNT = 612;

export function SeasonalCampaignPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-amber-50 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
            <Sun className="size-3.5" />
            Forecast peak: July 13 – 26
          </div>
          <p className="text-amber-900">
            Sending now (May 20) leaves an 8-week lead — well above the 6-week
            target for early-booking campaigns.
          </p>
        </div>

        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <Users className="size-3.5" />
            Default recipients
          </div>
          <p>
            <span className="font-semibold">
              {ACTIVE_CLIENT_COUNT.toLocaleString()}
            </span>{" "}
            active clients (booked at least once in the past 12 months)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            rows={11}
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
            onSecondary={onCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <PreviewBeforeSend
        channel="email"
        recipients={[
          `${ACTIVE_CLIENT_COUNT} active clients (past 12 months)`,
        ]}
        subject={subject}
        body={body
          .replaceAll("{{firstName}}", "[First name]")
          .replaceAll("{{petName}}", "[Pet name]")}
        meta={[
          { label: "Recipients", value: ACTIVE_CLIENT_COUNT },
          { label: "Lead time", value: "8 weeks" },
          { label: "Peak window", value: "Jul 13 – 26" },
        ]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send campaign"
          onPrimary={() => onComplete()}
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
        />
      </div>
    </div>
  );
}
