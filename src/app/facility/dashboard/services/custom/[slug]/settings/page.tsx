"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCustomServices } from "@/hooks/use-custom-services";
import { resolveIcon } from "@/lib/service-registry";
import { getCategoryMeta, getGradientStyle, PRICING_MODEL_LABELS } from "@/data/custom-services";
import {
  Edit,
  Info,
  Calendar,
  DollarSign,
  Settings,
  LogIn,
  CheckCircle2,
  XCircle,
  UserCheck,
} from "lucide-react";


function StatusRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {enabled ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-medium text-success">Yes</span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">No</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function CustomServiceSettingsPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const module = getModuleBySlug(slug ?? "");

  if (!module) return null;

  const Icon = resolveIcon(module.icon);
  const editHref = `/facility/dashboard/services/custom/${module.slug}/edit`;

  const categoryMeta = getCategoryMeta(module.category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configuration for {module.name}
          </p>
        </div>
        <Link href={editHref}>
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            Edit in Wizard
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Basic Info
                </CardTitle>
                <CardDescription>
                  Identity and classification of this service
                </CardDescription>
              </div>
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-lg shrink-0"
                style={{
                  ...getGradientStyle(module.iconColor, module.iconColorTo),
                }}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold">{module.name}</p>
                <p className="text-xs text-muted-foreground">/{module.slug}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">
                  {categoryMeta?.name ?? module.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    module.status === "active"
                      ? "default"
                      : module.status === "disabled"
                        ? "destructive"
                        : "secondary"
                  }
                  className="capitalize"
                >
                  {module.status}
                </Badge>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground shrink-0">
                  Description
                </span>
                <span className="font-medium text-right ml-4 line-clamp-2">
                  {module.description || "—"}
                </span>
              </div>
            </div>

            {module.internalNotes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Internal Notes
                  </p>
                  <p className="text-sm">{module.internalNotes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </CardTitle>
                <CardDescription>
                  Pricing model and base rate
                </CardDescription>
              </div>
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <Badge variant="secondary">
                {PRICING_MODEL_LABELS[module.pricing.model] ??
                  module.pricing.model}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Price</span>
              <span className="font-semibold">
                ${module.pricing.basePrice.toFixed(2)}
              </span>
            </div>
            <Separator />
            <StatusRow label="Taxable" enabled={module.pricing.taxable} />
            <StatusRow label="Tips Allowed" enabled={module.pricing.tipAllowed} />
            <StatusRow
              label="Membership Discounts"
              enabled={module.pricing.membershipDiscountEligible}
            />
            <StatusRow
              label="Deposit Required"
              enabled={module.onlineBooking.depositRequired}
            />
          </CardContent>
        </Card>

        {/* Operational Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Operational Config
                </CardTitle>
                <CardDescription>
                  Calendar, check-in, and booking settings
                </CardDescription>
              </div>
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Calendar */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                  Calendar
                </span>
              </div>
              <div className="space-y-1 pl-5">
                <StatusRow
                  label="Calendar Enabled"
                  enabled={module.calendar.enabled}
                />
                {module.calendar.enabled && (
                  <>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Duration Mode
                      </span>
                      <span className="capitalize font-medium">
                        {module.calendar.durationMode}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Buffer Time
                      </span>
                      <span className="font-medium">
                        {module.calendar.bufferTimeMinutes} min
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Max Simultaneous
                      </span>
                      <span className="font-medium">
                        {module.calendar.maxSimultaneousBookings}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Check-In/Out */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <LogIn className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                  Check-In / Out
                </span>
              </div>
              <div className="space-y-1 pl-5">
                <StatusRow
                  label="Check-In/Out Enabled"
                  enabled={module.checkInOut.enabled}
                />
                {module.checkInOut.enabled && (
                  <>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Check-In Type</span>
                      <span className="capitalize font-medium">
                        {module.checkInOut.checkInType}
                      </span>
                    </div>
                    <StatusRow
                      label="QR Code Support"
                      enabled={module.checkInOut.qrCodeSupport}
                    />
                    <StatusRow
                      label="Checkout Time Tracking"
                      enabled={module.checkInOut.checkOutTimeTracking}
                    />
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Online Booking */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                  Online Booking
                </span>
              </div>
              <div className="space-y-1 pl-5">
                <StatusRow
                  label="Online Booking"
                  enabled={module.onlineBooking.enabled}
                />
                {module.onlineBooking.enabled && (
                  <>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Eligible Clients
                      </span>
                      <span className="capitalize font-medium">
                        {module.onlineBooking.eligibleClients.replace(/_/g, " ")}
                      </span>
                    </div>
                    <StatusRow
                      label="Approval Required"
                      enabled={module.onlineBooking.approvalRequired}
                    />
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Assignment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Staff &amp; Tasks
                </CardTitle>
                <CardDescription>
                  Staff assignment and task generation settings
                </CardDescription>
              </div>
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required Role</span>
              <span className="font-medium capitalize">
                {module.staffAssignment.customRoleName ??
                  module.staffAssignment.requiredRole}
              </span>
            </div>
            <StatusRow
              label="Auto-Assign Staff"
              enabled={module.staffAssignment.autoAssign}
            />
            <Separator />
            <div>
              <p className="text-muted-foreground mb-2">
                Task Generation Phases
              </p>
              {module.staffAssignment.taskGeneration.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {module.staffAssignment.taskGeneration.map((phase) => (
                    <Badge key={phase} variant="secondary" className="capitalize">
                      {phase}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">
                  No automatic task generation
                </p>
              )}
            </div>
            <Separator />
            <StatusRow
              label="Requires Evaluation"
              enabled={module.requiresEvaluation}
            />
            <StatusRow
              label="Show in Sidebar"
              enabled={module.showInSidebar}
            />
          </CardContent>
        </Card>
      </div>

      {/* Metadata Footer */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
            <span>
              <strong>ID:</strong> {module.id}
            </span>
            <span>
              <strong>Created:</strong>{" "}
              {new Date(module.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>
              <strong>Last Updated:</strong>{" "}
              {new Date(module.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
