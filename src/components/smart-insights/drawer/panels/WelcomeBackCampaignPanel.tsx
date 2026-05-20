"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 5.2 Take Action — welcome-back offer for first-time clients who
 * haven't returned in 60 days. Spec: small discount or free add-on on second
 * visit, recipients pre-populated.
 */

const FIRST_TIMERS: { id: string; firstName: string; lastName: string; petName: string; email: string }[] = [
  { id: "c-601", firstName: "Aiden", lastName: "Murray", petName: "Pepper", email: "amurray@example.com" },
  { id: "c-602", firstName: "Sophie", lastName: "Bélanger", petName: "Mochi", email: "sbelanger@example.com" },
  { id: "c-603", firstName: "Liam", lastName: "Ferrari", petName: "Tucker", email: "lferrari@example.com" },
  { id: "c-604", firstName: "Chloé", lastName: "Tremblay", petName: "Nova", email: "ctremblay@example.com" },
  { id: "c-605", firstName: "Noah", lastName: "Singh", petName: "Bandit", email: "nsingh@example.com" },
  { id: "c-606", firstName: "Mia", lastName: "Levesque", petName: "Roxie", email: "mlevesque@example.com" },
  { id: "c-607", firstName: "Ethan", lastName: "Park", petName: "Toby", email: "epark@example.com" },
  { id: "c-608", firstName: "Zoe", lastName: "Bouchard", petName: "Hazel", email: "zbouchard@example.com" },
  { id: "c-609", firstName: "Lucas", lastName: "Côté", petName: "Finn", email: "lcote@example.com" },
  { id: "c-610", firstName: "Lily", lastName: "Kaur", petName: "Coco", email: "lkaur@example.com" },
  { id: "c-611", firstName: "Oliver", lastName: "Lemire", petName: "Penny", email: "olemire@example.com" },
  { id: "c-612", firstName: "Ava", lastName: "Roy", petName: "Oscar", email: "aroy@example.com" },
  { id: "c-613", firstName: "Jackson", lastName: "Gauthier", petName: "Stella", email: "jgauthier@example.com" },
  { id: "c-614", firstName: "Maya", lastName: "Choi", petName: "Bruno", email: "mchoi@example.com" },
  { id: "c-615", firstName: "Henry", lastName: "Beaulieu", petName: "Riley", email: "hbeaulieu@example.com" },
  { id: "c-616", firstName: "Eva", lastName: "Nguyen", petName: "Sasha", email: "enguyen@example.com" },
  { id: "c-617", firstName: "Leo", lastName: "Smith", petName: "Olive", email: "lsmith@example.com" },
  { id: "c-618", firstName: "Hannah", lastName: "Garcia", petName: "Murphy", email: "hgarcia@example.com" },
];

const DEFAULT_SUBJECT = "We loved meeting {{petName}} — come back and save";
const DEFAULT_BODY = `Hi {{firstName}},

Thanks for trying Doggieville with {{petName}}! We hope you both had a great first visit.

For your second visit, here's a thank-you: 10% off, OR a free add-on of your choice (nail trim, teeth brushing, or de-shed treatment) — your pick.

Book within 30 days to use it: doggieville.ca/book

Looking forward to seeing you again,
The Doggieville team`;

export function WelcomeBackCampaignPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  const resolved = useMemo(() => {
    const first = FIRST_TIMERS[0];
    const fn = (text: string) =>
      text
        .replaceAll("{{firstName}}", first.firstName)
        .replaceAll("{{petName}}", first.petName);
    return { subject: fn(subject), body: fn(body) };
  }, [subject, body]);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <Users className="size-3.5" />
            Recipients · {FIRST_TIMERS.length} first-timers
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FIRST_TIMERS.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                href={insightLinks.client(c.id)}
                className="inline-flex items-center rounded-md border bg-white px-2 py-0.5 text-xs hover:border-primary/40 hover:bg-primary/5"
              >
                {c.firstName} · {c.petName}
              </Link>
            ))}
            {FIRST_TIMERS.length > 10 && (
              <Link
                href={insightLinks.client()}
                className="inline-flex items-center rounded-md border bg-white px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/40"
              >
                +{FIRST_TIMERS.length - 10} more
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Tokens <code>{"{{firstName}}"}</code> and{" "}
            <code>{"{{petName}}"}</code> resolve per recipient.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
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
        recipients={FIRST_TIMERS.map((c) => `${c.firstName} ${c.lastName.charAt(0)}.`)}
        subject={resolved.subject}
        body={resolved.body}
        meta={[
          { label: "Recipients", value: FIRST_TIMERS.length },
          { label: "Offer", value: "10% off OR free add-on" },
          { label: "Expires", value: "30 days" },
        ]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send campaign"
          onPrimary={() =>
            onComplete({
              trackedMetric: "Second bookings within 30 days",
              baseline: 0,
              current: 0,
              target: FIRST_TIMERS.length,
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
