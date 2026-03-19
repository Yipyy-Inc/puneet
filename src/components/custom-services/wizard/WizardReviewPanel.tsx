"use client";

import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { resolveIcon } from "@/lib/service-registry";
import { getCategoryMeta, getGradientStyle, PRICING_MODEL_LABELS } from "@/data/custom-services";
import type { CustomServiceModule } from "@/lib/types";

function BooleanIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-3.5 w-3.5 text-green-600" />
  ) : (
    <X className="h-3.5 w-3.5 text-muted-foreground" />
  );
}

function SectionHeader({
  title,
  stepIndex,
  onEdit,
}: {
  title: string;
  stepIndex: number;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onEdit(stepIndex)}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </Button>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0 w-36">{label}</span>
      <span className="text-xs text-foreground text-right">{children}</span>
    </div>
  );
}

interface WizardReviewPanelProps {
  data: CustomServiceModule;
  onEditStep: (stepIndex: number) => void;
}

export function WizardReviewPanel({ data, onEditStep }: WizardReviewPanelProps) {
  const Icon = resolveIcon(data.icon);
  const gradientStyle = getGradientStyle(data.iconColor, data.iconColorTo);
  const categoryMeta = getCategoryMeta(data.category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={gradientStyle}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-base font-bold leading-tight">
            {data.name || <span className="text-muted-foreground italic">Untitled Service</span>}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">/{data.slug}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {data.description || <em>No description</em>}
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="space-y-1">
        <SectionHeader title="Basic Info" stepIndex={0} onEdit={onEditStep} />
        <Separator />
        <Row label="Category">
          <Badge variant="secondary">{categoryMeta?.name ?? data.category}</Badge>
        </Row>
        <Row label="Icon">{data.icon}</Row>
        <Row label="Internal Notes">
          {data.internalNotes ? (
            <span className="line-clamp-2">{data.internalNotes}</span>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </Row>
      </div>

      {/* Calendar */}
      <div className="space-y-1">
        <SectionHeader title="Calendar & Availability" stepIndex={1} onEdit={onEditStep} />
        <Separator />
        <Row label="Enabled"><BooleanIcon value={data.calendar.enabled} /></Row>
        {data.calendar.enabled && (
          <>
            <Row label="Duration Mode">
              <span className="capitalize">{data.calendar.durationMode}</span>
            </Row>
            <Row label="Durations">
              {data.calendar.durationOptions.map((d) => d.label).join(" · ")}
            </Row>
            <Row label="Buffer Time">{data.calendar.bufferTimeMinutes} min</Row>
            <Row label="Max Simultaneous">{data.calendar.maxSimultaneousBookings}</Row>
            <Row label="Assigned To">
              <span className="capitalize">{data.calendar.assignedTo}</span>
            </Row>
            {data.calendar.assignedResourceIds.length > 0 && (
              <Row label="Resources">
                {data.calendar.assignedResourceIds.join(", ")}
              </Row>
            )}
          </>
        )}
      </div>

      {/* Check-In/Out */}
      <div className="space-y-1">
        <SectionHeader title="Check-In / Check-Out" stepIndex={2} onEdit={onEditStep} />
        <Separator />
        <Row label="Enabled"><BooleanIcon value={data.checkInOut.enabled} /></Row>
        {data.checkInOut.enabled && (
          <>
            <Row label="Check-In Type">
              <span className="capitalize">{data.checkInOut.checkInType}</span>
            </Row>
            <Row label="Checkout Tracking">
              <BooleanIcon value={data.checkInOut.checkOutTimeTracking} />
            </Row>
            <Row label="QR Code"><BooleanIcon value={data.checkInOut.qrCodeSupport} /></Row>
          </>
        )}
      </div>

      {/* Stay-Based */}
      <div className="space-y-1">
        <SectionHeader title="Stay-Based" stepIndex={3} onEdit={onEditStep} />
        <Separator />
        <Row label="Enabled"><BooleanIcon value={data.stayBased.enabled} /></Row>
        {data.stayBased.enabled && (
          <>
            <Row label="Requires Room/Kennel">
              <BooleanIcon value={data.stayBased.requiresRoomKennel} />
            </Row>
            <Row label="Affects Kennel View">
              <BooleanIcon value={data.stayBased.affectsKennelView} />
            </Row>
            <Row label="Daily Tasks">
              <BooleanIcon value={data.stayBased.generatesDailyTasks} />
            </Row>
          </>
        )}
      </div>

      {/* Online Booking */}
      <div className="space-y-1">
        <SectionHeader title="Online Booking" stepIndex={4} onEdit={onEditStep} />
        <Separator />
        <Row label="Enabled"><BooleanIcon value={data.onlineBooking.enabled} /></Row>
        {data.onlineBooking.enabled && (
          <>
            <Row label="Eligible Clients">
              <span className="capitalize">
                {data.onlineBooking.eligibleClients.replaceAll("_", " ")}
              </span>
            </Row>
            <Row label="Approval Required">
              <BooleanIcon value={data.onlineBooking.approvalRequired} />
            </Row>
            <Row label="Max Dogs">{data.onlineBooking.maxDogsPerSession}</Row>
            <Row label="Cancel Policy">
              {data.onlineBooking.cancellationPolicy.hoursBeforeBooking}h /{" "}
              {data.onlineBooking.cancellationPolicy.feePercentage}% fee
            </Row>
            <Row label="Deposit Required">
              <BooleanIcon value={data.onlineBooking.depositRequired} />
            </Row>
            {data.onlineBooking.depositRequired && data.onlineBooking.depositAmount && (
              <Row label="Deposit Amount">${data.onlineBooking.depositAmount}</Row>
            )}
          </>
        )}
      </div>

      {/* Pricing */}
      <div className="space-y-1">
        <SectionHeader title="Pricing" stepIndex={5} onEdit={onEditStep} />
        <Separator />
        <Row label="Model">
          {PRICING_MODEL_LABELS[data.pricing.model] ?? data.pricing.model}
        </Row>
        {data.pricing.model !== "addon_only" && (
          <Row label="Base Price">${data.pricing.basePrice.toFixed(2)}</Row>
        )}
        <Row label="Taxable"><BooleanIcon value={data.pricing.taxable} /></Row>
        <Row label="Tips Allowed"><BooleanIcon value={data.pricing.tipAllowed} /></Row>
        <Row label="Membership Discount">
          <BooleanIcon value={data.pricing.membershipDiscountEligible} />
        </Row>
        {data.pricing.durationTiers && data.pricing.durationTiers.length > 0 && (
          <Row label="Duration Tiers">
            {data.pricing.durationTiers.map((t) => `${t.durationMinutes}min=$${t.price}`).join(" · ")}
          </Row>
        )}
      </div>

      {/* Staff Assignment */}
      <div className="space-y-1">
        <SectionHeader title="Staff Assignment" stepIndex={6} onEdit={onEditStep} />
        <Separator />
        <Row label="Auto-Assign"><BooleanIcon value={data.staffAssignment.autoAssign} /></Row>
        <Row label="Required Role">
          {data.staffAssignment.requiredRole === "custom"
            ? data.staffAssignment.customRoleName ?? "Custom"
            : data.staffAssignment.requiredRole}
        </Row>
        <Row label="Tasks Generated">
          {data.staffAssignment.taskGeneration.length > 0
            ? data.staffAssignment.taskGeneration.join(", ")
            : "None"}
        </Row>
        <Row label="YipyyGo Required">
          <BooleanIcon value={data.yipyyGoRequired} />
        </Row>
        <Row label="Evaluation Required">
          <BooleanIcon value={data.requiresEvaluation} />
        </Row>
        <Row label="Show in Sidebar">
          <BooleanIcon value={data.showInSidebar} />
        </Row>
      </div>
    </div>
  );
}
