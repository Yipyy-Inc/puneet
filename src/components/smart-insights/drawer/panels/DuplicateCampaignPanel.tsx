"use client";

import { useState } from "react";
import { Award, Copy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 7.1 Take Action — duplicate the source campaign and edit the
 * subject, offer, and recipient list.
 */

const SOURCE = {
  name: "Mother's Day Promo",
  sentOn: "May 8",
  openRate: "48%",
  bookings: 41,
  revenue: "$2,840",
  subject: "A gift for the moms (and the pups in their lives) 🌷",
  body: `Hi {{firstName}},\n\nHappy almost-Mother's Day! To celebrate, we're offering 20% off any grooming, daycare, or boarding booking made through May 14.\n\nBook here: doggieville.ca/book\n\nThank you for being part of the Doggieville family,\nThe Doggieville team`,
};

const AUDIENCES = [
  { value: "all-active-12mo", label: "All active clients (612)" },
  { value: "moms-day-replied", label: "Last campaign — engaged opens (187)" },
  { value: "grooming-only", label: "Grooming clients (340)" },
  { value: "boarding-only", label: "Boarding clients (215)" },
];

export function DuplicateCampaignPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState(
    "Father's Day at Doggieville — 20% off",
  );
  const [body, setBody] = useState(
    SOURCE.body.replaceAll("Mother", "Father").replaceAll("moms", "dads"),
  );
  const [audience, setAudience] = useState<string>("all-active-12mo");

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-amber-50/60 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
            <Award className="size-3.5" />
            Source campaign: {SOURCE.name}
          </div>
          <ul className="grid grid-cols-2 gap-y-1 text-xs text-amber-900">
            <li>Sent: {SOURCE.sentOn}</li>
            <li>Open rate: {SOURCE.openRate}</li>
            <li>Bookings: {SOURCE.bookings}</li>
            <li>Revenue: {SOURCE.revenue}</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dup-audience">Audience</Label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger id="dup-audience">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dup-subject">Subject</Label>
          <Input
            id="dup-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dup-body">Message</Label>
          <Textarea
            id="dup-body"
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        <Badge variant="outline" className="self-start gap-1.5">
          <Copy className="size-3" />
          Tone matches the source so engagement should track close to 48%
        </Badge>

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

  const selected = AUDIENCES.find((a) => a.value === audience);
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <PreviewBeforeSend
        channel="email"
        recipients={[selected?.label ?? ""]}
        subject={subject}
        body={body.replaceAll("{{firstName}}", "[First name]")}
        meta={[
          { label: "Cloned from", value: SOURCE.name },
          { label: "Source open rate", value: SOURCE.openRate },
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
