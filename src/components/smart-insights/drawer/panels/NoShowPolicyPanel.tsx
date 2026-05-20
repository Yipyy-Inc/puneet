"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 4.5 Take Action — two paths:
 *  1. Enable automatic no-show fee (link to Settings page for cancellation
 *     and no-show policy)
 *  2. Send no-show reminder SMS to clients with no-show history who have
 *     upcoming bookings
 */

const NO_SHOW_CLIENTS = [
  { id: "c-1201", name: "Pierre Lavoie", petName: "Otis", upcomingDate: "May 22", noShows: 3 },
  { id: "c-1202", name: "Hannah Patel", petName: "Layla", upcomingDate: "May 23", noShows: 2 },
  { id: "c-1203", name: "Marcus Wright", petName: "Diesel", upcomingDate: "Jun 02", noShows: 4 },
  { id: "c-1204", name: "Étienne Roy", petName: "Biscuit", upcomingDate: "May 28", noShows: 2 },
  { id: "c-1205", name: "Yuki Tanaka", petName: "Kuma", upcomingDate: "May 30", noShows: 2 },
  { id: "c-1206", name: "Sara Mahmoud", petName: "Theo", upcomingDate: "Jun 04", noShows: 2 },
];

type Mode = "menu" | "fee" | "reminder";

export function NoShowPolicyPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "menu") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <ClientsList />
        <div className="grid gap-3">
          <Option
            icon={<ShieldAlert className="size-5" />}
            label="Enable automatic no-show fee"
            description="Opens the cancellation & no-show policy settings page"
            onClick={() => setMode("fee")}
          />
          <Option
            icon={<MessageSquare className="size-5" />}
            label="Send no-show reminder"
            description={`Personalized SMS to ${NO_SHOW_CLIENTS.length} flagged clients with upcoming bookings`}
            onClick={() => setMode("reminder")}
          />
        </div>
        <div className="mt-auto">
          <DrawerFooter primaryLabel="Close" onPrimary={onCancel} />
        </div>
      </div>
    );
  }

  if (mode === "fee") {
    return <FeeFlow onBack={() => setMode("menu")} onComplete={() => onComplete()} />;
  }
  return <ReminderFlow onBack={() => setMode("menu")} onComplete={() => onComplete()} />;
}

function ClientsList() {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
        <ShieldAlert className="size-3.5" />
        {NO_SHOW_CLIENTS.length} flagged clients with upcoming bookings
      </div>
      <ul className="space-y-1.5 text-sm">
        {NO_SHOW_CLIENTS.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2">
            <span className="truncate">
              <Link
                href={insightLinks.client(c.id)}
                className="hover:text-primary hover:underline"
              >
                {c.name}
              </Link>{" "}
              · {c.petName}
              <span className="text-muted-foreground ml-2 text-xs">
                {c.upcomingDate}
              </span>
            </span>
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
              {c.noShows} no-shows
            </Badge>
          </li>
        ))}
      </ul>
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

function FeeFlow({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={onBack} label="Enable no-show fee" />
      <div className="space-y-3 rounded-lg border p-4 text-sm">
        <p>
          Automatic no-show fees are configured per service in your{" "}
          <span className="font-semibold">Cancellation & No-Show Policy</span>{" "}
          settings.
        </p>
        <p className="text-muted-foreground">
          Common defaults: 50% of booking value for first no-show, 100% on
          repeat. You can override per service.
        </p>
        <Button asChild variant="outline" size="sm" className="w-full">
          <a href="/facility/dashboard/settings?tab=cancellation-policy">
            <ExternalLink className="mr-1.5 size-3.5" />
            Open cancellation policy settings
          </a>
        </Button>
      </div>
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Mark as configured"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={onBack}
        />
      </div>
    </div>
  );
}

function ReminderFlow({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [template, setTemplate] = useState(
    `Hi {{firstName}}, this is Doggieville reminding you about {{petName}}'s appointment on {{date}}. To confirm, reply YES. To cancel, please give us 24 hours notice. Otherwise a no-show fee will apply. Thanks!`,
  );

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Send no-show reminder" />
        <div className="space-y-2">
          <Label htmlFor="ns-sms">SMS template</Label>
          <Textarea
            id="ns-sms"
            rows={6}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Tokens: <code>{"{{firstName}}"}</code>, <code>{"{{petName}}"}</code>,{" "}
            <code>{"{{date}}"}</code>
          </p>
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={!template.trim()}
            secondaryLabel="Back"
            onSecondary={onBack}
          />
        </div>
      </div>
    );
  }

  const first = NO_SHOW_CLIENTS[0];
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("compose")} label="Confirm SMS" />
      <PreviewBeforeSend
        channel="sms"
        recipients={NO_SHOW_CLIENTS.map((c) => `${c.name} · ${c.petName}`)}
        body={template
          .replaceAll("{{firstName}}", first.name.split(" ")[0])
          .replaceAll("{{petName}}", first.petName)
          .replaceAll("{{date}}", first.upcomingDate)}
        meta={[{ label: "Recipients", value: NO_SHOW_CLIENTS.length }]}
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
