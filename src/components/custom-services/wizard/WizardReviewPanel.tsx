"use client";

import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  getModuleWorkflowQuestionnaire,
  getCategoryMeta,
  getGradientStyle,
  PRICING_MODEL_LABELS,
} from "@/data/custom-services";
import { taxRates } from "@/data/settings";
import { PublishControls } from "./PublishControls";
import type { CustomServiceModule } from "@/types/facility";

function BooleanIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="size-3.5 text-green-600" />
  ) : (
    <X className="text-muted-foreground size-3.5" />
  );
}

function SectionHeader({
  title,
  stepId,
  onEdit,
}: {
  title: string;
  stepId: string;
  onEdit: (stepId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onEdit(stepId)}
        className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
      >
        <Pencil className="size-3" />
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
      <span className="text-muted-foreground w-36 shrink-0 text-xs">
        {label}
      </span>
      <span className="text-foreground text-right text-xs">{children}</span>
    </div>
  );
}

interface WizardReviewPanelProps {
  data: CustomServiceModule;
  onEditStep: (stepId: string) => void;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function WizardReviewPanel({
  data,
  onEditStep,
  onChange,
}: WizardReviewPanelProps) {
  const gradientStyle = getGradientStyle(data.iconColor, data.iconColorTo);
  const categoryMeta = getCategoryMeta(data.category);
  const workflow = getModuleWorkflowQuestionnaire(data);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-border bg-card flex items-center gap-4 rounded-xl border p-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={gradientStyle}
        >
          <DynamicIcon name={data.icon} className="size-7" />
        </div>
        <div>
          <h2 className="text-base/tight font-bold">
            {data.name || (
              <span className="text-muted-foreground italic">
                Untitled Service
              </span>
            )}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">/{data.slug}</p>
          <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
            {data.description || <em>No description</em>}
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="space-y-1">
        <SectionHeader title="Basic Info" stepId="basic" onEdit={onEditStep} />
        <Separator />
        <Row label="Category">
          <Badge variant="secondary">
            {categoryMeta?.name ?? data.category}
          </Badge>
        </Row>
        <Row label="Icon">{data.icon}</Row>
        <Row label="Sidebar Label">
          {data.sidebarLabel?.trim() ? (
            data.sidebarLabel
          ) : (
            <span className="text-muted-foreground italic">
              {data.name || "Full name"}
            </span>
          )}
        </Row>
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
        <SectionHeader
          title="Workflow Questionnaire"
          stepId="workflow"
          onEdit={onEditStep}
        />
        <Separator />
        <Row label="Completed">
          <BooleanIcon value={workflow.questionnaireCompleted} />
        </Row>
        <Row label="Calendar">
          {workflow.appearsOnCalendar ? "Visible" : "Hidden"}
        </Row>
        <Row label="Time slots">
          {workflow.requiresTimeSlots ? "Required" : "Open/day-based"}
        </Row>
        <Row label="Resource">
          {workflow.requiresResource
            ? `${workflow.resourceType ?? "Resource"} (${workflow.resourceIds.length})`
            : "Not required"}
        </Row>
        <Row label="Check-in/out">
          {workflow.requiresCheckInOut ? "Required" : "Not required"}
        </Row>
        <Row label="Task templates">
          {workflow.generatesTasks
            ? `${workflow.taskTemplates.length} template(s)`
            : "Disabled"}
        </Row>
        <Row label="Add-ons">
          {workflow.allowsAddOns
            ? `${workflow.allowedAddOnIds.length} selected`
            : "Disabled"}
        </Row>
        <Row label="Online booking">
          {workflow.bookableOnline
            ? `Enabled${workflow.onlineLeadTimeHours ? ` (${workflow.onlineLeadTimeHours}h lead)` : ""}`
            : "Internal only"}
        </Row>
        <Row label="Capacity/heatmap">
          {workflow.affectsCapacityHeatmap
            ? `Enabled${workflow.capacityCeilingPerHour ? ` (${workflow.capacityCeilingPerHour}/hour)` : ""}`
            : "Excluded"}
        </Row>
        <Row label="Payment at booking">
          {workflow.paymentTiming === "at_booking"
            ? "Charged at booking"
            : workflow.paymentTiming === "deposit_only"
              ? "Deposit only"
              : "Invoiced later"}
        </Row>
        <Row label="Waiver/consent">
          {workflow.requiresWaiver ? "Required before booking" : "Not required"}
        </Row>
      </div>

      {/* Calendar */}
      <div className="space-y-1">
        <SectionHeader
          title="Calendar & Availability"
          stepId="calendar"
          onEdit={onEditStep}
        />
        <Separator />
        <Row label="Enabled">
          <BooleanIcon value={data.calendar.enabled} />
        </Row>
        {data.calendar.enabled && (
          <>
            <Row label="Duration Mode">
              <span className="capitalize">{data.calendar.durationMode}</span>
            </Row>
            <Row label="Durations">
              {data.calendar.durationOptions.map((d) => d.label).join(" · ")}
            </Row>
            <Row label="Buffer Time">{data.calendar.bufferTimeMinutes} min</Row>
            <Row label="Max Simultaneous">
              {data.calendar.maxSimultaneousBookings}
            </Row>
            <Row label="Assigned To">
              <span className="capitalize">{data.calendar.assignedTo}</span>
            </Row>
            {data.calendar.assignedResourceIds.length > 0 && (
              <Row label="Resources">
                {data.calendar.assignedResourceIds.join(", ")}
              </Row>
            )}
            {data.calendar.operatingHoursOverride?.enabled && (
              <Row label="Operating Hours">
                Custom (
                {
                  data.calendar.operatingHoursOverride.days.filter(
                    (d) => d.isOpen,
                  ).length
                }{" "}
                day(s) open)
              </Row>
            )}
            {data.calendar.bookingWindow && (
              <Row label="Booking Window">
                {data.calendar.bookingWindow.maxAdvanceDays}d ahead ·{" "}
                {data.calendar.bookingWindow.minAdvanceHours}h notice
              </Row>
            )}
            {data.calendar.recurrence && (
              <Row label="Recurrence">
                {data.calendar.recurrence.mode === "recurring"
                  ? `${data.calendar.recurrence.frequency === "biweekly" ? "Bi-weekly" : "Weekly"} (max ${data.calendar.recurrence.maxSessions})`
                  : "One-time"}
              </Row>
            )}
          </>
        )}
      </div>

      {/* Check-In/Out — only when the questionnaire enabled this step */}
      {data.checkInOut.enabled && (
        <div className="space-y-1">
          <SectionHeader
            title="Check-In / Check-Out"
            stepId="checkin"
            onEdit={onEditStep}
          />
          <Separator />
          <Row label="Enabled">
            <BooleanIcon value={data.checkInOut.enabled} />
          </Row>
          <Row label="Check-In Type">
            <span className="capitalize">{data.checkInOut.checkInType}</span>
          </Row>
          <Row label="Checkout Tracking">
            <BooleanIcon value={data.checkInOut.checkOutTimeTracking} />
          </Row>
          <Row label="QR Code">
            <BooleanIcon value={data.checkInOut.qrCodeSupport} />
          </Row>
          {data.checkInOut.checkInLocation && (
            <Row label="Check-In Location">
              <span className="capitalize">
                {data.checkInOut.checkInLocation.replaceAll("_", " ")}
              </span>
            </Row>
          )}
          {data.checkInOut.lateArrivalPolicy && (
            <Row label="Late Arrival">
              <span className="capitalize">
                {data.checkInOut.lateArrivalPolicy.graceMinutes}m grace ·{" "}
                {data.checkInOut.lateArrivalPolicy.action.replaceAll("_", " ")}
              </span>
            </Row>
          )}
          <Row label="Departure Notice">
            <BooleanIcon
              value={data.checkInOut.departureNotification?.enabled ?? false}
            />
          </Row>
        </div>
      )}

      {/* Stay-Based — only when enabled (the step is skipped otherwise) */}
      {data.stayBased.enabled && (
        <div className="space-y-1">
          <SectionHeader title="Stay-Based" stepId="stay" onEdit={onEditStep} />
          <Separator />
          <Row label="Requires Room/Kennel">
            <BooleanIcon value={data.stayBased.requiresRoomKennel} />
          </Row>
          <Row label="Affects Kennel View">
            <BooleanIcon value={data.stayBased.affectsKennelView} />
          </Row>
          <Row label="Daily Tasks">
            <BooleanIcon value={data.stayBased.generatesDailyTasks} />
          </Row>
          {data.stayBased.roomSpaceType && (
            <Row label="Space Type">
              {data.stayBased.roomSpaceType === "custom"
                ? data.stayBased.customRoomSpaceLabel || "Custom"
                : data.stayBased.roomSpaceType
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
            </Row>
          )}
          {data.stayBased.capacityPerSpace != null && (
            <Row label="Capacity/Space">
              {data.stayBased.capacityPerSpace} pet(s)
            </Row>
          )}
          {data.stayBased.earlyLateAccess && (
            <Row label="Early/Late Access">
              {[
                data.stayBased.earlyLateAccess.earlyCheckIn && "Early check-in",
                data.stayBased.earlyLateAccess.lateCheckOut && "Late check-out",
              ]
                .filter(Boolean)
                .join(" · ") || "Not offered"}
            </Row>
          )}
        </div>
      )}

      {/* Online Booking — only when the questionnaire enabled this step */}
      {data.onlineBooking.enabled && (
        <div className="space-y-1">
          <SectionHeader
            title="Online Booking"
            stepId="booking"
            onEdit={onEditStep}
          />
          <Separator />
          <Row label="Enabled">
            <BooleanIcon value={data.onlineBooking.enabled} />
          </Row>
          <>
            <Row label="Eligible Clients">
              <span className="capitalize">
                {data.onlineBooking.eligibleClients.replaceAll("_", " ")}
              </span>
            </Row>
            <Row label="Approval Required">
              <BooleanIcon value={data.onlineBooking.approvalRequired} />
            </Row>
            <Row label="Max Pets">{data.onlineBooking.maxDogsPerSession}</Row>
            <Row label="Waitlist">
              {data.onlineBooking.waitlist?.enabled
                ? `Enabled${data.onlineBooking.waitlist.maxSize ? ` (max ${data.onlineBooking.waitlist.maxSize})` : ""}${data.onlineBooking.waitlist.autoConfirm ? " · auto-confirm" : ""}`
                : "Off"}
            </Row>
            {data.onlineBooking.requiredDocuments &&
              data.onlineBooking.requiredDocuments.length > 0 && (
                <Row label="Required Docs">
                  {data.onlineBooking.requiredDocuments
                    .map((d) => d.replaceAll("_", " "))
                    .join(", ")}
                </Row>
              )}
            <Row label="Cancel Policy">
              {data.onlineBooking.cancellationPolicy.hoursBeforeBooking}h /{" "}
              {data.onlineBooking.cancellationPolicy.feePercentage}% fee
            </Row>
            <Row label="Deposit Required">
              <BooleanIcon value={data.onlineBooking.depositRequired} />
            </Row>
            {data.onlineBooking.depositRequired &&
              data.onlineBooking.depositAmount && (
                <Row label="Deposit Amount">
                  ${data.onlineBooking.depositAmount}
                  {data.onlineBooking.depositType === "percentage" ? "%" : ""}
                  {data.onlineBooking.depositRefundPolicy &&
                    ` · ${
                      data.onlineBooking.depositRefundPolicy.refundable
                        ? `refundable${data.onlineBooking.depositRefundPolicy.refundableUpToHours ? ` ≤${data.onlineBooking.depositRefundPolicy.refundableUpToHours}h` : ""}`
                        : "non-refundable"
                    }`}
                </Row>
              )}
          </>
        </div>
      )}

      {/* Pricing */}
      <div className="space-y-1">
        <SectionHeader title="Pricing" stepId="pricing" onEdit={onEditStep} />
        <Separator />
        <Row label="Model">
          {PRICING_MODEL_LABELS[data.pricing.model] ?? data.pricing.model}
        </Row>
        {data.pricing.model !== "addon_only" && (
          <Row label="Base Price">${data.pricing.basePrice.toFixed(2)}</Row>
        )}
        <Row label="Taxable">
          <BooleanIcon value={data.pricing.taxable} />
        </Row>
        {data.pricing.taxable &&
          (() => {
            const rate =
              taxRates.find((t) => t.id === data.pricing.taxRateId) ??
              taxRates.find((t) => t.isDefault);
            return rate ? (
              <Row label="Tax Rate">
                {rate.name} ({rate.rate}%)
              </Row>
            ) : null;
          })()}
        <Row label="Tips Allowed">
          <BooleanIcon value={data.pricing.tipAllowed} />
        </Row>
        <Row label="Membership Discount">
          <BooleanIcon value={data.pricing.membershipDiscountEligible} />
        </Row>
        {data.pricing.durationTiers &&
          data.pricing.durationTiers.length > 0 && (
            <Row label="Duration Tiers">
              {data.pricing.durationTiers
                .map((t) => `${t.durationMinutes}min=$${t.price}`)
                .join(" · ")}
            </Row>
          )}
        {data.pricing.billingTrigger && (
          <Row label="Billing Trigger">
            <span className="capitalize">
              {data.pricing.billingTrigger.replaceAll("_", " ")}
            </span>
          </Row>
        )}
        {data.pricing.packagePricing?.enabled && (
          <Row label="Packages">
            {data.pricing.packagePricing.packages.length} configured
          </Row>
        )}
        {(data.pricing.peakPricingEnabled ||
          data.pricing.model === "dynamic") && (
          <Row label="Peak Pricing">
            {data.pricing.peakPricingRules?.length
              ? `${data.pricing.peakPricingRules.length} rule(s)`
              : "Enabled"}
          </Row>
        )}
        {data.pricing.paymentMethods &&
          data.pricing.paymentMethods.length > 0 && (
            <Row label="Payment Methods">
              <span className="capitalize">
                {data.pricing.paymentMethods
                  .map((m) => m.replaceAll("_", " "))
                  .join(", ")}
              </span>
            </Row>
          )}
      </div>

      {/* Staff Assignment */}
      <div className="space-y-1">
        <SectionHeader
          title="Staff Assignment"
          stepId="staff"
          onEdit={onEditStep}
        />
        <Separator />
        <Row label="Auto-Assign">
          <BooleanIcon value={data.staffAssignment.autoAssign} />
        </Row>
        <Row label="Required Role">
          {data.staffAssignment.requiredRole === "custom"
            ? (data.staffAssignment.customRoleName ?? "Custom")
            : data.staffAssignment.requiredRole}
        </Row>
        {data.staffAssignment.requiredQualification && (
          <Row label="Qualification">
            {data.staffAssignment.requiredQualification === "custom"
              ? (data.staffAssignment.customQualification ?? "Custom")
              : data.staffAssignment.requiredQualification.replaceAll("_", " ")}
          </Row>
        )}
        {data.staffAssignment.staffToPetRatio != null && (
          <Row label="Staff-to-Pet Ratio">
            1 : {data.staffAssignment.staffToPetRatio}
          </Row>
        )}
        <Row label="Tasks Generated">
          {data.staffAssignment.taskGeneration.length > 0
            ? data.staffAssignment.taskGeneration.join(", ")
            : "None"}
        </Row>
        <Row label="YipyyGo Required">
          <BooleanIcon value={data.yipyyGoRequired} />
        </Row>
        <Row label="Evaluation Required">
          {data.requiresEvaluation ? (
            <span className="capitalize">
              {data.evaluationType === "custom"
                ? (data.customEvaluationLabel ?? "Custom")
                : (data.evaluationType ?? "temperament").replaceAll("_", " ")}
            </span>
          ) : (
            <BooleanIcon value={false} />
          )}
        </Row>
        <Row label="Show in Sidebar">
          <BooleanIcon value={data.showInSidebar} />
        </Row>
      </div>

      {/* Eligibility, Dependencies & Capacity */}
      <div className="space-y-1">
        <SectionHeader
          title="Rules & Capacity"
          stepId="eligibility"
          onEdit={onEditStep}
        />
        <Separator />
        <Row label="Eligibility Rules">
          {data.eligibilityRules?.enabled
            ? `${data.eligibilityRules.conditions.length} condition(s)`
            : "No restriction"}
        </Row>
        <Row label="Dependency">
          {data.serviceDependencies?.addonOnly
            ? "Add-on only"
            : data.serviceDependencies?.requiresServices?.length
              ? `Requires ${data.serviceDependencies.requiresServices[0].moduleName}`
              : "Standalone"}
        </Row>
        {data.serviceDependencies?.minClientTenureDays ? (
          <Row label="Client Tenure">
            ≥ {data.serviceDependencies.minClientTenureDays} days
          </Row>
        ) : null}
        {data.capacity?.enabled && (
          <Row label="Capacity">
            {data.capacity.maxPerSlot ?? 1} pets ·{" "}
            {data.capacity.maxConcurrentSessions ?? 1} concurrent
            {data.capacity.overbookingBufferPercent
              ? ` · +${data.capacity.overbookingBufferPercent}% buffer`
              : ""}
          </Row>
        )}
        {data.geographicRestriction?.enabled && (
          <Row label="Service Area">
            {data.geographicRestriction.mode === "radius"
              ? `${data.geographicRestriction.radius ?? 0} ${data.geographicRestriction.radiusUnit ?? "mi"} radius`
              : `${data.geographicRestriction.postalCodes?.length ?? 0} area(s)`}
          </Row>
        )}
      </div>

      <Separator />

      {/* Publish mode, validation & notification */}
      <PublishControls data={data} onChange={onChange} />
    </div>
  );
}
