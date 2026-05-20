"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CalendarRange,
  Heart,
  Newspaper,
  Sun,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 7.3 Take Action — three starting-point campaign types per spec:
 *  1. Monthly newsletter
 *  2. Seasonal promotion
 *  3. "Thinking of you" check-in (clients last seen 30–60 days ago)
 */

interface CampaignTemplate {
  id: "newsletter" | "promotion" | "checkin";
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultSubject: string;
  defaultBody: string;
  audience: string;
  audienceCount: number;
}

const TEMPLATES: CampaignTemplate[] = [
  {
    id: "newsletter",
    label: "Monthly newsletter",
    description: "Recap of what's new + staff highlight + reminder to book",
    icon: <Newspaper className="size-5" />,
    defaultSubject: "Doggieville · May newsletter",
    defaultBody: `Hi {{firstName}},\n\nHere's what's new at Doggieville this month:\n\n• Lucas joined our grooming team (welcome!)\n• New playgroup schedule for daycare\n• Summer boarding spots are filling — reserve early\n\nThanks for being part of our pack,\nThe Doggieville team`,
    audience: "All active clients",
    audienceCount: 612,
  },
  {
    id: "promotion",
    label: "Seasonal promotion",
    description: "Limited-time discount tied to the time of year",
    icon: <Sun className="size-5" />,
    defaultSubject: "First-week-of-summer special: 15% off",
    defaultBody: `Hi {{firstName}},\n\nSummer's almost here, and {{petName}} deserves a fresh start. Book any grooming service in the next 7 days and save 15%.\n\nUse code SUMMER15 at checkout.\n\nBook here: doggieville.ca/book\n\nCheers,\nThe Doggieville team`,
    audience: "All active clients",
    audienceCount: 612,
  },
  {
    id: "checkin",
    label: "\"Thinking of you\" check-in",
    description: "Gentle re-engagement for clients last seen 30–60 days ago",
    icon: <Heart className="size-5" />,
    defaultSubject: "Just checking in on {{petName}}",
    defaultBody: `Hi {{firstName}},\n\nIt's been about a month since we last saw {{petName}}. We were just thinking about them — hope they're doing well.\n\nIf it's time for another visit, we'd love to see you both. Book here: doggieville.ca/book\n\nNo pressure — just wanted to say hi.\n\nThe Doggieville team`,
    audience: "Clients last seen 30–60 days ago",
    audienceCount: 84,
  },
];

export function NewCampaignSuggestionsPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [selectedId, setSelectedId] = useState<CampaignTemplate["id"] | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [step, setStep] = useState<"pick" | "compose" | "preview">("pick");

  const selected = TEMPLATES.find((t) => t.id === selectedId);

  if (step === "pick") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-amber-50/60 p-3 text-sm text-amber-900">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            <CalendarRange className="size-3.5" />
            32 days since the last campaign
          </div>
          <p>Pick a starting point — you can customize once you've chosen.</p>
        </div>

        <div className="grid gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedId(t.id);
                setSubject(t.defaultSubject);
                setBody(t.defaultBody);
                setStep("compose");
              }}
              className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
            >
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                {t.icon}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{t.label}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {t.description} · {t.audience} ({t.audienceCount})
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <DrawerFooter primaryLabel="Close" onPrimary={onCancel} />
        </div>
      </div>
    );
  }

  if (step === "compose" && selected) {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={() => setStep("pick")} label={selected.label} />
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <p className="font-semibold">{selected.audience}</p>
          <p className="text-muted-foreground text-xs">
            {selected.audienceCount} recipients
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ncs-subject">Subject</Label>
          <Input
            id="ncs-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ncs-body">Message</Label>
          <Textarea
            id="ncs-body"
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
            onSecondary={() => setStep("pick")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("compose")} label="Confirm send" />
      <PreviewBeforeSend
        channel="email"
        recipients={[`${selected?.audience} · ${selected?.audienceCount} clients`]}
        subject={subject
          .replaceAll("{{firstName}}", "[First name]")
          .replaceAll("{{petName}}", "[Pet name]")}
        body={body
          .replaceAll("{{firstName}}", "[First name]")
          .replaceAll("{{petName}}", "[Pet name]")}
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
