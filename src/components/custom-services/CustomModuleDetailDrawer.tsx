"use client";

import type { ReactNode } from "react";

import { Building, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { getCategoryMeta, PRICING_MODEL_LABELS } from "@/data/custom-services";
import { facilities } from "@/data/facilities";
import { cn } from "@/lib/utils";
import type { CustomServiceModule } from "@/types/facility";
import { CustomServiceStatusBadge } from "./CustomServiceStatusBadge";

function facilityNames(mod: CustomServiceModule): string {
  const ids = mod.facilityIds?.length ? mod.facilityIds : [mod.facilityId];
  return ids
    .map((id) => facilities.find((f) => f.id === id)?.name ?? `Facility #${id}`)
    .join(", ");
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1 border-t py-3 first:border-t-0">
      <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        {title}
      </h4>
      <div className="divide-y">{children}</div>
    </div>
  );
}

/**
 * Read-only detail view of a custom service module (Custom Module Registry +
 * facility Modules tab). Purely a viewer — no edit affordances. Opened from a
 * card's "View" action.
 */
export function CustomModuleDetailDrawer({
  module: mod,
  open,
  onOpenChange,
}: {
  module: CustomServiceModule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const catMeta = mod ? getCategoryMeta(mod.category) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        {mod && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-white">
                  <DynamicIcon name={mod.icon} className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">{mod.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    /{mod.slug}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <CustomServiceStatusBadge status={mod.status} />
                {catMeta && (
                  <Badge className={cn("border text-xs", catMeta.badgeClass)}>
                    {catMeta.name}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="gap-1 text-xs text-violet-600 dark:text-violet-400"
                >
                  <Building className="size-3" />
                  {facilityNames(mod)}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-muted-foreground gap-1 text-xs"
                >
                  <Eye className="size-3" />
                  Read-only
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {mod.description && (
                <p className="text-muted-foreground border-b py-3 text-sm">
                  {mod.description}
                </p>
              )}

              <Section title="Pricing">
                <Field
                  label="Model"
                  value={
                    PRICING_MODEL_LABELS[mod.pricing.model] ?? mod.pricing.model
                  }
                />
                <Field
                  label="Base price"
                  value={`$${mod.pricing.basePrice.toFixed(2)}`}
                />
                <Field
                  label="Taxable"
                  value={mod.pricing.taxable ? "Yes" : "No"}
                />
                <Field
                  label="Tips allowed"
                  value={mod.pricing.tipAllowed ? "Yes" : "No"}
                />
                {mod.pricing.variants && mod.pricing.variants.length > 0 && (
                  <Field
                    label="Variants"
                    value={`${mod.pricing.variants.length}`}
                  />
                )}
                {mod.pricing.addOns && mod.pricing.addOns.length > 0 && (
                  <Field
                    label="Add-ons"
                    value={`${mod.pricing.addOns.length}`}
                  />
                )}
              </Section>

              <Section title="Scheduling">
                <Field
                  label="Duration"
                  value={
                    mod.calendar.durationMode === "fixed" ? "Fixed" : "Variable"
                  }
                />
                <Field
                  label="Buffer time"
                  value={`${mod.calendar.bufferTimeMinutes} min`}
                />
                <Field
                  label="Max simultaneous"
                  value={`${mod.calendar.maxSimultaneousBookings}`}
                />
                <Field
                  label="Check-in / out"
                  value={mod.checkInOut.enabled ? "Enabled" : "Off"}
                />
                <Field
                  label="Stay-based"
                  value={mod.stayBased.enabled ? "Enabled" : "Off"}
                />
              </Section>

              <Section title="Online booking">
                <Field
                  label="Bookable online"
                  value={mod.onlineBooking.enabled ? "Yes" : "No"}
                />
                {mod.onlineBooking.enabled && (
                  <>
                    <Field
                      label="Eligible clients"
                      value={mod.onlineBooking.eligibleClients.replace(
                        /_/g,
                        " ",
                      )}
                    />
                    <Field
                      label="Approval required"
                      value={mod.onlineBooking.approvalRequired ? "Yes" : "No"}
                    />
                    <Field
                      label="Deposit"
                      value={
                        mod.onlineBooking.depositRequired
                          ? `$${(mod.onlineBooking.depositAmount ?? 0).toFixed(2)}`
                          : "None"
                      }
                    />
                  </>
                )}
              </Section>

              <Section title="Staff & care">
                <Field
                  label="Auto-assign staff"
                  value={mod.staffAssignment.autoAssign ? "Yes" : "No"}
                />
                {mod.staffAssignment.requiredRole && (
                  <Field
                    label="Required role"
                    value={mod.staffAssignment.requiredRole}
                  />
                )}
                {mod.careInstructions && (
                  <>
                    <Field
                      label="Feeding"
                      value={mod.careInstructions.feeding}
                    />
                    <Field
                      label="Medication"
                      value={mod.careInstructions.medication}
                    />
                  </>
                )}
              </Section>

              <Section title="Meta">
                <Field label="Created" value={formatDate(mod.createdAt)} />
                <Field label="Last updated" value={formatDate(mod.updatedAt)} />
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
