"use client";

import { useState } from "react";
import { CalendarClock, Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 5.5 Take Action — notify clients whose packages expire soon.
 * Spec template: "Your package expires on [date] and you have [X] sessions
 * remaining — book now so you do not lose them."
 */

interface ExpiringHolder {
  firstName: string;
  lastName: string;
  petName: string;
  packageName: string;
  expiryDate: string;
  sessionsRemaining: number;
  phone: string;
}

const HOLDERS: ExpiringHolder[] = [
  { firstName: "Catherine", lastName: "Léger", petName: "Joey", packageName: "Grooming 5-pack", expiryDate: "Jun 8", sessionsRemaining: 2, phone: "+1 514-555-0123" },
  { firstName: "Alexandre", lastName: "Picard", petName: "Roxy", packageName: "Daycare 10-pack", expiryDate: "Jun 12", sessionsRemaining: 4, phone: "+1 514-555-0234" },
  { firstName: "Isabelle", lastName: "Bouchard", petName: "Maple", packageName: "Grooming 5-pack", expiryDate: "Jun 15", sessionsRemaining: 1, phone: "+1 514-555-0345" },
  { firstName: "Daniel", lastName: "Ouellet", petName: "Chase", packageName: "Training 6-pack", expiryDate: "Jun 17", sessionsRemaining: 3, phone: "+1 514-555-0456" },
  { firstName: "Camille", lastName: "Fortin", petName: "Willow", packageName: "Daycare 10-pack", expiryDate: "Jun 18", sessionsRemaining: 5, phone: "+1 514-555-0567" },
  { firstName: "Mathieu", lastName: "Roy", petName: "Zeus", packageName: "Boarding 3-pack", expiryDate: "Jun 19", sessionsRemaining: 2, phone: "+1 514-555-0678" },
  { firstName: "Audrey", lastName: "Beaulieu", petName: "Mia", packageName: "Grooming 5-pack", expiryDate: "Jun 20", sessionsRemaining: 3, phone: "+1 514-555-0789" },
  { firstName: "Vincent", lastName: "Dubois", petName: "Hank", packageName: "Daycare 10-pack", expiryDate: "Jun 19", sessionsRemaining: 3, phone: "+1 514-555-0890" },
];

const DEFAULT_TEMPLATE = `Hi {{firstName}}, your {{packageName}} for {{petName}} expires {{expiryDate}} and you still have {{sessionsRemaining}} session(s) remaining. Book now so you don't lose them: doggieville.ca/book. Reply STOP to opt out.`;

const TOTAL_SESSIONS_AT_RISK = HOLDERS.reduce(
  (sum, h) => sum + h.sessionsRemaining,
  0,
);

export function ExpiringPackagePanel({ onComplete, onCancel }: InsightPanelProps) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <Package className="size-3.5" />
            {HOLDERS.length} clients · {TOTAL_SESSIONS_AT_RISK} sessions at risk
          </div>
          <ul className="space-y-1.5 text-sm">
            {HOLDERS.slice(0, 4).map((h) => (
              <li key={h.phone} className="flex justify-between gap-2">
                <span className="truncate">
                  {h.firstName} {h.lastName.charAt(0)}. · {h.petName}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  <CalendarClock className="mr-0.5 inline size-3" />
                  {h.expiryDate} · {h.sessionsRemaining} left
                </span>
              </li>
            ))}
            {HOLDERS.length > 4 && (
              <li className="text-muted-foreground pl-2 text-xs">
                +{HOLDERS.length - 4} more clients
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiry-template">SMS template (per recipient)</Label>
          <Textarea
            id="expiry-template"
            rows={6}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Tokens: <code>{"{{firstName}}"}</code>,{" "}
            <code>{"{{petName}}"}</code>, <code>{"{{packageName}}"}</code>,{" "}
            <code>{"{{expiryDate}}"}</code>,{" "}
            <code>{"{{sessionsRemaining}}"}</code>
          </p>
        </div>

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={!template.trim()}
            onSecondary={onCancel}
          />
        </div>
      </div>
    );
  }

  const first = HOLDERS[0];
  const resolved = template
    .replaceAll("{{firstName}}", first.firstName)
    .replaceAll("{{petName}}", first.petName)
    .replaceAll("{{packageName}}", first.packageName)
    .replaceAll("{{expiryDate}}", first.expiryDate)
    .replaceAll("{{sessionsRemaining}}", String(first.sessionsRemaining));

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <PreviewBeforeSend
        channel="sms"
        recipients={HOLDERS.map((h) => `${h.firstName} ${h.lastName.charAt(0)}.`)}
        body={resolved}
        meta={[
          { label: "Recipients", value: HOLDERS.length },
          { label: "Sessions at risk", value: TOTAL_SESSIONS_AT_RISK },
        ]}
      />
      <p className="text-muted-foreground text-xs">
        Each recipient sees their own dates and remaining session count.
      </p>
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send to all"
          onPrimary={() => onComplete()}
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
        />
      </div>
    </div>
  );
}
