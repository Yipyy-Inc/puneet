"use client";

import type { ReactNode } from "react";
import { ChevronLeft, Pencil } from "lucide-react";

import { plans } from "@/data/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { BUSINESS_TYPES, SERVICES, WEEKDAYS } from "./wizard-config";
import type { FacilityDraft } from "./wizard-types";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Section({
  title,
  stepIndex,
  onEdit,
  children,
}: {
  title: string;
  stepIndex: number;
  onEdit: (index: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <button
          type="button"
          onClick={() => onEdit(stepIndex)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          <Pencil className="size-3" />
          Edit
        </button>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

export function ReviewStep({
  draft,
  onEdit,
  onBack,
  onCancel,
  onCreate,
}: {
  draft: FacilityDraft;
  onEdit: (index: number) => void;
  onBack: () => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const businessTypeLabels =
    draft.businessTypes
      .map((id) => BUSINESS_TYPES.find((b) => b.id === id)?.label)
      .filter(Boolean)
      .join(", ") || "—";
  const tierName = plans.find((p) => p.id === draft.tierId)?.name ?? "—";
  const enabledServices = SERVICES.filter((s) => draft.services[s.id]?.enabled);
  const openDays = WEEKDAYS.filter((d) => draft.schedule[d].open);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-6 sm:px-6">
          <Section title="Business Information" stepIndex={0} onEdit={onEdit}>
            <Row label="Legal name" value={draft.legalName || "—"} />
            <Row label="Display name" value={draft.displayName || "—"} />
            <Row
              label="Address"
              value={
                [draft.address, draft.city, draft.province, draft.postalCode]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
            <Row label="Time zone" value={draft.timeZone} />
            <Row label="Phone" value={draft.phone || "—"} />
            <Row label="Business types" value={businessTypeLabels} />
          </Section>

          <Section title="Plan & Trial" stepIndex={1} onEdit={onEdit}>
            <Row label="Tier" value={tierName} />
            <Row
              label="Billing"
              value={draft.billingCycle === "annual" ? "Annual" : "Monthly"}
            />
            <Row
              label="Trial"
              value={
                draft.trialEnabled
                  ? `Until ${draft.trialEndDate || "—"}`
                  : "No trial"
              }
            />
            {draft.promoCode ? (
              <Row label="Promo code" value={draft.promoCode} />
            ) : null}
          </Section>

          <Section title="Services & Pricing" stepIndex={2} onEdit={onEdit}>
            {enabledServices.length > 0 ? (
              enabledServices.map((s) => (
                <Row
                  key={s.id}
                  label={s.label}
                  value={`$${draft.services[s.id].basePrice || "0"}${
                    draft.services[s.id].additionalAnimalFee
                      ? ` (+$${draft.services[s.id].additionalAnimalFee}/extra)`
                      : ""
                  }`}
                />
              ))
            ) : (
              <Row label="Services" value="—" />
            )}
            <Row
              label="Tax rate"
              value={draft.taxRate ? `${draft.taxRate}%` : "—"}
            />
          </Section>

          <Section
            title="Operating Configuration"
            stepIndex={3}
            onEdit={onEdit}
          >
            <Row
              label="Open days"
              value={
                openDays.length > 0
                  ? openDays.map((d) => d.slice(0, 3)).join(", ")
                  : "—"
              }
            />
            <Row
              label="Check-in / out"
              value={`${draft.checkInTime} / ${draft.checkOutTime}`}
            />
            <Row label="Booking cut-off" value={draft.bookingCutoff} />
            <Row
              label="Deposit"
              value={
                draft.depositEnabled
                  ? `${draft.depositPercent || "0"}%`
                  : "Not required"
              }
            />
          </Section>

          <Section title="Primary Admin Account" stepIndex={4} onEdit={onEdit}>
            <Row
              label="Name"
              value={
                `${draft.adminFirstName} ${draft.adminLastName}`.trim() || "—"
              }
            />
            <Row label="Email" value={draft.adminEmail || "—"} />
            <Row
              label="Role"
              value={<Badge variant="secondary">Facility Admin</Badge>}
            />
          </Section>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onCreate}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Create Facility
          </Button>
        </div>
      </footer>
    </div>
  );
}
