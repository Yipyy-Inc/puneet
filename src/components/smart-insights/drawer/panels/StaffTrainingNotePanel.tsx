"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 4.1 Take Action — staff training note to grooming + front desk
 * staff via Messaging. Note reminds them to offer grooming at every boarding
 * check-in and includes the upsell script.
 */

const STAFF_RECIPIENTS = [
  { id: "staff-001", name: "Mike Chen", role: "Senior Evaluator" },
  { id: "staff-003", name: "David Wilson", role: "Grooming Lead" },
  { id: "staff-005", name: "Tom Anderson", role: "Daycare Supervisor" },
  { id: "staff-006", name: "Manager One", role: "Facility Manager" },
];

const DEFAULT_SUBJECT = "Reminder: Offer grooming at every boarding check-in";

const DEFAULT_BODY = `Hi team,

Quick reminder — our data shows that when we offer grooming at boarding check-in, 78% of clients say yes. But we're only offering it 42% of the time. That gap is worth ~$3,400/mo.

The script that works:
"While {{petName}} is with us, would you like to add a bath & brush, or a full grooming so they go home spa-fresh? Our groomers have an opening on day [X] of their stay."

Key reminders:
• Mention it at check-in, not pick-up.
• Reference the pet by name.
• Offer a specific day during the stay, not "sometime."
• Don't push — one ask, one offer.

Let's hit 80% offer rate by month-end.

Thanks!`;

export function StaffTrainingNotePanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <Users className="size-3.5" />
            Recipients · {STAFF_RECIPIENTS.length} staff
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STAFF_RECIPIENTS.map((s) => (
              <Link
                key={s.id}
                href={insightLinks.staff(s.id)}
                className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-0.5 text-xs hover:border-primary/40 hover:bg-primary/5"
              >
                <GraduationCap className="size-3" />
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-subject">Subject</Label>
          <Input
            id="note-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note-body">Training note</Label>
          <Textarea
            id="note-body"
            rows={14}
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
        channel="notification"
        recipients={STAFF_RECIPIENTS.map((s) => `${s.name} (${s.role})`)}
        subject={subject}
        body={body}
        meta={[
          { label: "Channel", value: "Messaging module" },
          { label: "Pinned", value: "7 days" },
        ]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send to team"
          onPrimary={() => onComplete()}
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
        />
      </div>
    </div>
  );
}
