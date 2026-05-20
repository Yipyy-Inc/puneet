"use client";

import { useState } from "react";
import { ArrowLeft, MailWarning, UserX, Pencil, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { ConfirmBeforeModify } from "../shared/ConfirmBeforeModify";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 7.2 Take Action — three options in the drawer:
 *  1. Segment and suppress non-openers (auto-create suppression list)
 *  2. Test a new subject line approach (campaign builder + best-practice
 *     suggestions in a side panel)
 *  3. Review campaign frequency (last 30 days)
 */

const NON_OPENERS_90D = 418;

const SUBJECT_SUGGESTIONS = [
  "Lead with the value, not the brand name — open rates climb ~30% when the subject describes what the reader gets.",
  "Use a number — \"3 things…\" or \"$15 off…\" outperforms generic openers.",
  "Test personalization with pet name vs. owner name. Pet name often wins in pet-services email.",
  "Keep it under 50 characters — anything longer truncates on mobile preview.",
];

const FREQUENCY_LOG = [
  { sentOn: "May 15", name: "Spring grooming special", openRate: "9%" },
  { sentOn: "May 04", name: "New trainer welcome", openRate: "12%" },
  { sentOn: "Apr 22", name: "Daycare anniversary", openRate: "11%" },
  { sentOn: "Apr 11", name: "April newsletter", openRate: "14%" },
  { sentOn: "Apr 03", name: "Easter weekend hours", openRate: "16%" },
];

type Mode = "menu" | "suppress" | "subject" | "frequency";

export function ListHealthPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "menu") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-red-50 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-900">
            <MailWarning className="size-3.5" />
            Last 3 campaigns averaged 11% open · benchmark 15%
          </div>
          <p className="text-red-900">
            {NON_OPENERS_90D} clients haven't opened any email in 90 days.
          </p>
        </div>
        <div className="grid gap-3">
          <Option
            icon={<UserX className="size-5" />}
            label="Suppress non-openers"
            description={`Auto-create a suppression list for ${NON_OPENERS_90D} chronic non-openers`}
            onClick={() => setMode("suppress")}
          />
          <Option
            icon={<Pencil className="size-5" />}
            label="Test a new subject line"
            description="Opens campaign builder with subject-line best practices in a side panel"
            onClick={() => setMode("subject")}
          />
          <Option
            icon={<Activity className="size-5" />}
            label="Review campaign frequency"
            description={`See how many campaigns were sent in the past 30 days (${FREQUENCY_LOG.length})`}
            onClick={() => setMode("frequency")}
          />
        </div>
        <div className="mt-auto">
          <DrawerFooter primaryLabel="Close" onPrimary={onCancel} />
        </div>
      </div>
    );
  }

  if (mode === "suppress") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={() => setMode("menu")} label="Suppress non-openers" />
        <ConfirmBeforeModify
          title="Create suppression list"
          changes={[
            { field: "List name", to: `Non-openers · 90 days · ${new Date().toLocaleDateString()}` },
            { field: "Members", to: `${NON_OPENERS_90D} clients` },
            { field: "Applied to", to: "Next campaign by default" },
          ]}
          note="Suppressed clients won't receive your next email. You can lift the suppression anytime from Messaging → Lists. SMS is unaffected."
        />
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Create list"
            onPrimary={() => onComplete()}
            secondaryLabel="Back"
            onSecondary={() => setMode("menu")}
          />
        </div>
      </div>
    );
  }

  if (mode === "subject") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={() => setMode("menu")} label="Subject-line best practices" />
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <p className="font-semibold">Suggestions</p>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1.5 pl-5 text-xs">
            {SUBJECT_SUGGESTIONS.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
          A new campaign builder will open with this side panel pinned. Pick
          your audience and try a new subject line approach.
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Open campaign builder"
            onPrimary={() => onComplete()}
            secondaryLabel="Back"
            onSecondary={() => setMode("menu")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setMode("menu")} label="Campaign frequency · 30 days" />
      <ul className="space-y-2">
        {FREQUENCY_LOG.map((c, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
          >
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground text-xs">Sent {c.sentOn}</p>
            </div>
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
              {c.openRate}
            </Badge>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
        {FREQUENCY_LOG.length} campaigns in the past 30 days is on the high
        end. Consider trimming to 2–3 monthly campaigns and giving each one a
        clearer value proposition.
      </p>
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Mark reviewed"
          onPrimary={() => onComplete()}
          secondaryLabel="Back"
          onSecondary={() => setMode("menu")}
        />
      </div>
    </div>
  );
}

function Option({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
    >
      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs">{description}</span>
      </span>
    </button>
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
