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
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  getCategoryMeta,
  getGradientStyle,
  PRICING_MODEL_LABELS,
} from "@/data/custom-services";
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

function StatusRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center gap-1.5">
        {enabled ? (
          <>
            <CheckCircle2 className="text-success size-3.5" />
            <span className="text-success text-xs font-medium">Yes</span>
          </>
        ) : (
          <>
            <XCircle className="text-muted-foreground size-3.5" />
            <span className="text-muted-foreground text-xs">No</span>
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
  const serviceModule = getModuleBySlug(slug ?? "");

  if (!serviceModule) return null;
  const editHref = `/facility/dashboard/services/custom/${serviceModule.slug}/edit`;

  const categoryMeta = getCategoryMeta(serviceModule.category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configuration for {serviceModule.name}
          </p>
        </div>
        <Link href={editHref}>
          <Button className="gap-2">
            <Edit className="size-4" />
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
                  <Info className="size-4" />
                  Basic Info
                </CardTitle>
                <CardDescription>
                  Identity and classification of this service
                </CardDescription>
              </div>
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-1.5 size-3.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-lg"
                style={{
                  ...getGradientStyle(
                    serviceModule.iconColor,
                    serviceModule.iconColorTo,
                  ),
                }}
              >
                <DynamicIcon
                  name={serviceModule.icon}
                  className="size-6 text-white"
                />
              </div>
              <div>
                <p className="font-semibold">{serviceModule.name}</p>
                <p className="text-muted-foreground text-xs">
                  /{serviceModule.slug}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">
                  {categoryMeta?.name ?? serviceModule.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    serviceModule.status === "active"
                      ? "default"
                      : serviceModule.status === "disabled"
                        ? "destructive"
                        : "secondary"
                  }
                  className="capitalize"
                >
                  {serviceModule.status}
                </Badge>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-muted-foreground shrink-0">
                  Description
                </span>
                <span className="ml-4 line-clamp-2 text-right font-medium">
                  {serviceModule.description || "—"}
                </span>
              </div>
            </div>

            {serviceModule.internalNotes && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                    Internal Notes
                  </p>
                  <p className="text-sm">{serviceModule.internalNotes}</p>
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
                  <DollarSign className="size-4" />
                  Pricing
                </CardTitle>
                <CardDescription>Pricing model and base rate</CardDescription>
              </div>
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-1.5 size-3.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <Badge variant="secondary">
                {PRICING_MODEL_LABELS[serviceModule.pricing.model] ??
                  serviceModule.pricing.model}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Price</span>
              <span className="font-semibold">
                ${serviceModule.pricing.basePrice.toFixed(2)}
              </span>
            </div>
            <Separator />
            <StatusRow
              label="Taxable"
              enabled={serviceModule.pricing.taxable}
            />
            <StatusRow
              label="Tips Allowed"
              enabled={serviceModule.pricing.tipAllowed}
            />
            <StatusRow
              label="Membership Discounts"
              enabled={serviceModule.pricing.membershipDiscountEligible}
            />
            <StatusRow
              label="Deposit Required"
              enabled={serviceModule.onlineBooking.depositRequired}
            />
          </CardContent>
        </Card>

        {/* Operational Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  Operational Config
                </CardTitle>
                <CardDescription>
                  Calendar, check-in, and booking settings
                </CardDescription>
              </div>
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-1.5 size-3.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Calendar */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Calendar className="text-muted-foreground size-3.5" />
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Calendar
                </span>
              </div>
              <div className="space-y-1 pl-5">
                <StatusRow
                  label="Calendar Enabled"
                  enabled={serviceModule.calendar.enabled}
                />
                {serviceModule.calendar.enabled && (
                  <>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Duration Mode
                      </span>
                      <span className="font-medium capitalize">
                        {serviceModule.calendar.durationMode}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Buffer Time</span>
                      <span className="font-medium">
                        {serviceModule.calendar.bufferTimeMinutes} min
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Max Simultaneous
                      </span>
                      <span className="font-medium">
                        {serviceModule.calendar.maxSimultaneousBookings}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Check-In/Out */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <LogIn className="text-muted-foreground size-3.5" />
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Check-In / Out
                </span>
              </div>
              <div className="space-y-1 pl-5">
                <StatusRow
                  label="Check-In/Out Enabled"
                  enabled={serviceModule.checkInOut.enabled}
                />
                {serviceModule.checkInOut.enabled && (
                  <>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Check-In Type
                      </span>
                      <span className="font-medium capitalize">
                        {serviceModule.checkInOut.checkInType}
                      </span>
                    </div>
                    <StatusRow
                      label="QR Code Support"
                      enabled={serviceModule.checkInOut.qrCodeSupport}
                    />
                    <StatusRow
                      label="Checkout Time Tracking"
                      enabled={serviceModule.checkInOut.checkOutTimeTracking}
                    />
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Online Booking */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Settings className="text-muted-foreground size-3.5" />
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Online Booking
                </span>
              </div>
              <div className="space-y-1 pl-5">
                <StatusRow
                  label="Online Booking"
                  enabled={serviceModule.onlineBooking.enabled}
                />
                {serviceModule.onlineBooking.enabled && (
                  <>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        Eligible Clients
                      </span>
                      <span className="font-medium capitalize">
                        {serviceModule.onlineBooking.eligibleClients.replace(
                          /_/g,
                          " ",
                        )}
                      </span>
                    </div>
                    <StatusRow
                      label="Approval Required"
                      enabled={serviceModule.onlineBooking.approvalRequired}
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
                  <UserCheck className="size-4" />
                  Staff &amp; Tasks
                </CardTitle>
                <CardDescription>
                  Staff assignment and task generation settings
                </CardDescription>
              </div>
              <Link href={editHref}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-1.5 size-3.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required Role</span>
              <span className="font-medium capitalize">
                {serviceModule.staffAssignment.customRoleName ??
                  serviceModule.staffAssignment.requiredRole}
              </span>
            </div>
            <StatusRow
              label="Auto-Assign Staff"
              enabled={serviceModule.staffAssignment.autoAssign}
            />
            <Separator />
            <div>
              <p className="text-muted-foreground mb-2">
                Task Generation Phases
              </p>
              {serviceModule.staffAssignment.taskGeneration.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {serviceModule.staffAssignment.taskGeneration.map((phase) => (
                    <Badge
                      key={phase}
                      variant="secondary"
                      className="capitalize"
                    >
                      {phase}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  No automatic task generation
                </p>
              )}
            </div>
            <Separator />
            <StatusRow
              label="Requires Evaluation"
              enabled={serviceModule.requiresEvaluation}
            />
            <StatusRow
              label="Show in Sidebar"
              enabled={serviceModule.showInSidebar}
            />
          </CardContent>
        </Card>
      </div>

      {/* Metadata Footer */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="text-muted-foreground flex flex-wrap gap-6 text-xs">
            <span>
              <strong>ID:</strong> {serviceModule.id}
            </span>
            <span>
              <strong>Created:</strong>{" "}
              {new Date(serviceModule.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>
              <strong>Last Updated:</strong>{" "}
              {new Date(serviceModule.updatedAt).toLocaleDateString("en-US", {
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
