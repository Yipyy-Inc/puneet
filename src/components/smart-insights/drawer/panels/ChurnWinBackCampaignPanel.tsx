"use client";

import { useMemo, useState } from "react";
import { Users, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 5.1 Take Action — pre-configured win-back campaign.
 * Spec: recipients = the at-risk clients, subject template "We miss you and
 * [Pet Name]", body offers 15% discount on most recently booked service,
 * includes a Book Now link. Spec § 10.3 requires preview-before-send.
 *
 * After sending the card flips to Monitoring with a 30-day outcome window
 * (spec § 10.6).
 */

const AT_RISK_CLIENTS: { firstName: string; lastName: string; petName: string; email: string }[] = [
  { firstName: "Sarah", lastName: "Johnson", petName: "Max", email: "sarah.j@example.com" },
  { firstName: "Michael", lastName: "Chen", petName: "Luna", email: "mchen@example.com" },
  { firstName: "Emma", lastName: "Wilson", petName: "Bella", email: "emma.w@example.com" },
  { firstName: "David", lastName: "Martinez", petName: "Charlie", email: "dmartinez@example.com" },
  { firstName: "Lisa", lastName: "Anderson", petName: "Cooper", email: "lisa.a@example.com" },
  { firstName: "Robert", lastName: "Kim", petName: "Daisy", email: "rkim@example.com" },
  { firstName: "Jennifer", lastName: "Patel", petName: "Rocky", email: "jpatel@example.com" },
  { firstName: "Mark", lastName: "Thompson", petName: "Bailey", email: "mthompson@example.com" },
  { firstName: "Anna", lastName: "Schmidt", petName: "Buddy", email: "aschmidt@example.com" },
  { firstName: "Carlos", lastName: "Reyes", petName: "Ginger", email: "creyes@example.com" },
  { firstName: "Olivia", lastName: "Brown", petName: "Milo", email: "obrown@example.com" },
  { firstName: "Henry", lastName: "Wright", petName: "Scout", email: "hwright@example.com" },
];

const DEFAULT_SUBJECT = "We miss you and {{petName}}";

const DEFAULT_BODY = `Hi {{firstName}},

It's been a while since we saw {{petName}} at Doggieville! We've missed having them in for grooming.

To welcome you back, here's 15% off your next grooming appointment — just use code WELCOMEBACK15 when you book in the next 14 days.

Book now: doggieville.ca/book

Hope to see you and {{petName}} soon,
The Doggieville team`;

export function ChurnWinBackCampaignPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState<string>(DEFAULT_SUBJECT);
  const [body, setBody] = useState<string>(DEFAULT_BODY);

  const resolved = useMemo(() => {
    const first = AT_RISK_CLIENTS[0];
    const applyTokens = (text: string) =>
      text
        .replaceAll("{{firstName}}", first.firstName)
        .replaceAll("{{petName}}", first.petName);
    return {
      subject: applyTokens(subject),
      body: applyTokens(body),
    };
  }, [subject, body]);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <RecipientsCard />

        <div className="space-y-2">
          <Label htmlFor="subject">Subject line</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Tokens <code>{"{{firstName}}"}</code> and{" "}
            <code>{"{{petName}}"}</code> are replaced per recipient.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="font-mono text-sm leading-relaxed"
          />
        </div>

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={subject.trim() === "" || body.trim() === ""}
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
        recipients={AT_RISK_CLIENTS.map(
          (c) => `${c.firstName} ${c.lastName} <${c.email}>`,
        )}
        subject={resolved.subject}
        body={resolved.body}
        meta={[
          { label: "Recipients", value: AT_RISK_CLIENTS.length },
          { label: "Discount code", value: "WELCOMEBACK15" },
          { label: "Offer", value: "15% off grooming" },
          { label: "Tracking window", value: "30 days" },
        ]}
      />

      <p className="text-muted-foreground text-xs">
        On send, this insight switches to <b>Monitoring</b> and tracks how
        many of these 12 clients book within 30 days.
      </p>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send campaign"
          onPrimary={() =>
            onComplete({
              trackedMetric: "Bookings within 30 days",
              baseline: 0,
              current: 0,
              target: AT_RISK_CLIENTS.length,
              evaluatedAt: new Date().toISOString(),
              windowDays: 30,
            })
          }
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
        />
      </div>
    </div>
  );
}

function RecipientsCard() {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
        <Users className="size-3.5" />
        Recipients · {AT_RISK_CLIENTS.length} clients
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AT_RISK_CLIENTS.map((c) => (
          <Badge key={c.email} variant="outline" className="gap-1 bg-white">
            <Mail className="size-3" />
            {c.firstName} {c.lastName.charAt(0)}. · {c.petName}
          </Badge>
        ))}
      </div>
    </div>
  );
}
