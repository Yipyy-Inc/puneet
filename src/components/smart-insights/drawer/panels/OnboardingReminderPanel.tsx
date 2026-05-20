"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, FileSignature, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 6.4 Take Action — show stalled employee's onboarding card with
 * remaining tasks + overdue signatures. Manager can send a reminder directly.
 */

const STAFF = {
  id: "staff-5",
  name: "Amélie Dubois",
  role: "Front Desk",
  daysStalled: 9,
};

interface OnboardingTask {
  id: string;
  label: string;
  type: "task" | "signature";
  status: "pending" | "overdue";
  dueDate: string;
}

const TASKS: OnboardingTask[] = [
  { id: "ob-1", label: "Complete W-4 / tax forms", type: "signature", status: "overdue", dueDate: "May 13" },
  { id: "ob-2", label: "Read & sign Employee Handbook", type: "signature", status: "overdue", dueDate: "May 13" },
  { id: "ob-3", label: "Watch grooming safety training video", type: "task", status: "pending", dueDate: "May 22" },
];

const DEFAULT_MESSAGE = `Hi Amélie,\n\nWelcome aboard again! I noticed your onboarding has a few items still open — including ${TASKS.filter((t) => t.status === "overdue").length} that are now overdue. Could you take 15 minutes today to wrap them up? Let me know if anything is blocking you.\n\nThanks!`;

export function OnboardingReminderPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [step, setStep] = useState<"view" | "compose" | "preview">("view");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  if (step === "view") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <Link
            href={insightLinks.onboarding(STAFF.id)}
            className="inline-flex items-center gap-1 font-semibold hover:text-primary hover:underline"
          >
            {STAFF.name}
            <ExternalLink className="size-3" />
          </Link>
          <p className="text-muted-foreground text-xs">
            {STAFF.role} · Onboarding stalled {STAFF.daysStalled} days
          </p>
        </div>

        <ul className="space-y-2">
          {TASKS.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {t.type === "signature" ? (
                  <FileSignature className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                ) : (
                  <ClipboardList className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-muted-foreground text-xs">
                    Due {t.dueDate}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  t.status === "overdue"
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }
              >
                {t.status === "overdue" ? "Overdue" : "Pending"}
              </Badge>
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Send reminder"
            onPrimary={() => setStep("compose")}
            onSecondary={onCancel}
          />
        </div>
      </div>
    );
  }

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={() => setStep("view")} label="Compose reminder" />
        <div className="space-y-2">
          <Label htmlFor="ob-message">Message to {STAFF.name}</Label>
          <Textarea
            id="ob-message"
            rows={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={!message.trim()}
            secondaryLabel="Back"
            onSecondary={() => setStep("view")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("compose")} label="Confirm reminder" />
      <PreviewBeforeSend
        channel="notification"
        recipients={[`${STAFF.name} (${STAFF.role})`]}
        subject="Onboarding reminder"
        body={message}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send reminder"
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
