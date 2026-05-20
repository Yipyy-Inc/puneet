"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, DollarSign, Megaphone, ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DrawerFooter } from "../shared/DrawerFooter";
import { ConfirmBeforeModify } from "../shared/ConfirmBeforeModify";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 4.4 Take Action — three options for a low-utilization service:
 *  1. Run a promotional campaign (opens Messaging with pre-built template)
 *  2. Adjust the price (opens Rates for that service)
 *  3. Archive the service (confirmation then deactivate)
 */

const SERVICE = {
  module: "Grooming",
  name: "Spa Bath Add-On",
  currentPrice: 42,
  bookings: 9,
  drop: 38,
  totalRevenue: 380,
};

type Mode = "menu" | "promote" | "reprice" | "archive";

export function ServiceUtilizationPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "menu") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <Link
            href={insightLinks.rates("grooming")}
            className="text-muted-foreground hover:text-primary mb-1 inline-flex items-center gap-1 text-xs uppercase tracking-wide hover:underline"
          >
            {SERVICE.module}
            <ExternalLink className="size-3" />
          </Link>
          <p className="font-semibold">{SERVICE.name}</p>
          <ul className="text-muted-foreground mt-1 grid grid-cols-2 text-xs">
            <li>Bookings: {SERVICE.bookings}</li>
            <li>Drop: {SERVICE.drop}%</li>
            <li>Price: ${SERVICE.currentPrice}</li>
            <li>Revenue: ${SERVICE.totalRevenue}/mo</li>
          </ul>
        </div>

        <div className="grid gap-3">
          <Option
            icon={<Megaphone className="size-5" />}
            label="Run a promotional campaign"
            description="Opens Messaging with a pre-built promo template for this service"
            onClick={() => setMode("promote")}
          />
          <Option
            icon={<DollarSign className="size-5" />}
            label="Adjust the price"
            description="Edit the rate directly to test demand at a different price"
            onClick={() => setMode("reprice")}
          />
          <Option
            icon={<Archive className="size-5" />}
            label="Archive the service"
            description="Removes from booking flow. Existing bookings stay scheduled."
            onClick={() => setMode("archive")}
            destructive
          />
        </div>

        <div className="mt-auto">
          <DrawerFooter primaryLabel="Close" onPrimary={onCancel} />
        </div>
      </div>
    );
  }

  if (mode === "promote") {
    return (
      <PromoteFlow onBack={() => setMode("menu")} onComplete={() => onComplete()} />
    );
  }
  if (mode === "reprice") {
    return (
      <RepriceFlow onBack={() => setMode("menu")} onComplete={() => onComplete()} />
    );
  }
  return (
    <ArchiveFlow onBack={() => setMode("menu")} onComplete={() => onComplete()} />
  );
}

function Option({
  icon,
  label,
  description,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-destructive={destructive}
      className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors data-[destructive=true]:hover:border-red-300"
    >
      <span
        data-destructive={destructive}
        className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md data-[destructive=true]:bg-red-100 data-[destructive=true]:text-red-700"
      >
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

function PromoteFlow({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState(`Try our ${SERVICE.name} — limited time`);
  const [body, setBody] = useState(
    `Hi {{firstName}},\n\nOur ${SERVICE.name} hasn't gotten the love it deserves lately — so we're running a short promo: 20% off any ${SERVICE.name} booking made in the next 14 days.\n\nBook here: doggieville.ca/book\n\nHope to see ${"{{petName}}"} soon,\nThe Doggieville team`,
  );

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Promotional campaign" />
        <div className="space-y-2">
          <Label htmlFor="promo-subject">Subject</Label>
          <Input id="promo-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-body">Message</Label>
          <Textarea
            id="promo-body"
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
            onSecondary={onBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("compose")} label="Confirm campaign" />
      <PreviewBeforeSend
        channel="email"
        recipients={["All active clients · 612"]}
        subject={subject}
        body={body.replaceAll("{{firstName}}", "[First name]").replaceAll("{{petName}}", "[Pet name]")}
        meta={[{ label: "Discount", value: "20% off" }, { label: "Expires", value: "14 days" }]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send campaign"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
        />
      </div>
    </div>
  );
}

function RepriceFlow({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [newPrice, setNewPrice] = useState<number>(35);

  const valid = newPrice > 0 && newPrice !== SERVICE.currentPrice;

  if (step === "form") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Adjust price" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Current price</Label>
            <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm font-semibold">
              ${SERVICE.currentPrice.toFixed(2)}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="re-price">New price</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="re-price"
                type="number"
                step="0.5"
                value={Number.isFinite(newPrice) ? newPrice : ""}
                onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                className="pl-7"
              />
            </div>
          </div>
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Review change"
            onPrimary={() => setStep("confirm")}
            primaryDisabled={!valid}
            secondaryLabel="Back"
            onSecondary={onBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("form")} label="Confirm price update" />
      <ConfirmBeforeModify
        title="Update service price"
        changes={[
          { field: "Service", to: `${SERVICE.module} · ${SERVICE.name}` },
          { field: "Price", from: `$${SERVICE.currentPrice.toFixed(2)}`, to: `$${newPrice.toFixed(2)}` },
        ]}
        note="The new rate applies to bookings created after this change. Existing bookings keep their original price."
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Save price"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={() => setStep("form")}
        />
      </div>
    </div>
  );
}

function ArchiveFlow({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={onBack} label="Archive service" />
      <ConfirmBeforeModify
        title="Archive this service"
        changes={[
          { field: "Service", to: `${SERVICE.module} · ${SERVICE.name}` },
          { field: "Status", from: "Active", to: "Archived" },
          { field: "Booking flow", to: "Hidden from new bookings" },
          { field: "Existing bookings", to: `${SERVICE.bookings} kept on schedule` },
        ]}
        note="You can restore the service at any time from the Services tab."
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Archive service"
          primaryDestructive
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={onBack}
        />
      </div>
    </div>
  );
}
