"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Package,
  Calendar,
  ChevronDown,
  ArrowRight,
  Clock,
  Check,
  Circle,
  XCircle,
  RotateCcw,
  Share2,
  CalendarPlus,
  Info,
} from "lucide-react";
import type {
  CustomerPackagePurchase,
  PackagePolicy,
  ServicePackage,
  PassUsage,
} from "@/data/services-pricing";
import { defaultPackagePolicy } from "@/data/services-pricing";
import type { Booking } from "@/types/booking";

interface Props {
  purchase: CustomerPackagePurchase;
  pkg: ServicePackage | undefined;
  /** Lookup function — bookings may live in a large mock file, pass a getter */
  getBooking: (id: number) => Booking | undefined;
  /** Route prefix for booking links — /customer/bookings or /facility/dashboard/clients/[id]/bookings */
  bookingLinkPrefix: string;
  /** Show the "Book with pass" CTA (customer view) — hidden on facility view */
  showBookingCta?: boolean;
  /** Show facility-only actions: extend validity, transfer, refund */
  showFacilityActions?: boolean;
  onRequestExtension?: () => void;
  onRequestTransfer?: () => void;
  onRequestRefund?: () => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function daysUntilFrom(iso: string, nowMs: number): number {
  return Math.ceil((new Date(iso).getTime() - nowMs) / 86_400_000);
}

export function PurchasedPackageCard({
  purchase,
  pkg,
  getBooking,
  bookingLinkPrefix,
  showBookingCta = true,
  showFacilityActions = false,
  onRequestExtension,
  onRequestTransfer,
  onRequestRefund,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [nowMs] = useState(() => Date.now());

  const policy: PackagePolicy = pkg?.policy ?? defaultPackagePolicy;

  const used = purchase.passes.filter((p) => p.status === "used").length;
  const refunded = purchase.passes.filter(
    (p) => p.status === "refunded",
  ).length;
  const expired = purchase.passes.filter((p) => p.status === "expired").length;
  const available = purchase.passes.filter(
    (p) => p.status === "available",
  ).length;
  const consumedPct = Math.round(((used + refunded + expired) / purchase.totalPasses) * 100);

  const daysLeft = daysUntilFrom(purchase.expiresAt, nowMs);
  const purchasedMs = new Date(purchase.purchaseDate).getTime();
  const expiresMs = new Date(purchase.expiresAt).getTime();
  const totalMs = Math.max(1, expiresMs - purchasedMs);
  const remainingMs = expiresMs - nowMs;
  const validityPct = Math.round(Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)));

  const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;
  const isExpired = daysLeft <= 0 && available > 0;

  const passesDisplay = useMemo(() => {
    return purchase.passes
      .filter((p) => p.status !== "available")
      .map((pass) => {
        const booking = pass.bookingId ? getBooking(pass.bookingId) : undefined;
        return { pass, booking };
      });
  }, [purchase.passes, getBooking]);

  const usedCount = used + refunded + expired;

  return (
    <Card className={isExpired ? "border-red-300" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              {purchase.packageName}
            </CardTitle>
            <CardDescription>
              {purchase.serviceLabel} · Purchased{" "}
              {formatDate(purchase.purchaseDate)}
            </CardDescription>
          </div>
          <Badge
            variant={isExpired ? "destructive" : "outline"}
            className="shrink-0 capitalize"
          >
            {purchase.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Passes remaining */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Passes used</span>
            <span className="font-semibold">
              {used + refunded + expired} of {purchase.totalPasses}
              <span className="text-muted-foreground ml-2 font-normal">
                ({available} left)
              </span>
            </span>
          </div>
          <Progress value={consumedPct} className="h-2" />
        </div>

        {/* Validity */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Validity</span>
            <span
              className={`font-medium ${
                isExpired
                  ? "text-red-600"
                  : isExpiringSoon
                    ? "text-amber-600"
                    : ""
              }`}
            >
              {isExpired ? (
                `Expired on ${formatDate(purchase.expiresAt)}`
              ) : (
                <>
                  Expires {formatDate(purchase.expiresAt)}
                  <span className="text-muted-foreground ml-1.5 font-normal">
                    ({daysLeft} day{daysLeft === 1 ? "" : "s"} left)
                  </span>
                </>
              )}
            </span>
          </div>
          <Progress
            value={validityPct}
            className={`h-2 ${
              isExpired
                ? "[&>div]:bg-red-500"
                : isExpiringSoon
                  ? "[&>div]:bg-amber-500"
                  : ""
            }`}
          />
        </div>

        {/* Pass breakdown — collapsible, only shows used/refunded/expired passes */}
        {usedCount > 0 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="hover:bg-muted/30 flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors"
              >
                <span className="font-medium">
                  View {usedCount} used pass{usedCount === 1 ? "" : "es"}
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5">
              {passesDisplay.map(({ pass, booking }) => (
                <PassRow
                  key={pass.passNumber}
                  pass={pass}
                  booking={booking}
                  bookingLinkPrefix={bookingLinkPrefix}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Adjustments history */}
        {purchase.adjustments && purchase.adjustments.length > 0 && (
          <div className="bg-muted/20 space-y-1 rounded-lg border p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 font-medium">
              <Clock className="size-3.5" />
              History
            </div>
            {purchase.adjustments.map((adj) => (
              <div key={adj.id} className="flex justify-between">
                <span className="text-muted-foreground">
                  {formatDate(adj.date)} · {adj.description}
                </span>
                {adj.amount !== undefined && (
                  <span className="font-medium">
                    {adj.amount > 0 ? "+" : ""}${adj.amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Policy summary */}
        <div className="bg-muted/20 rounded-lg border p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-medium">
            <Info className="size-3.5" />
            Package policy
          </div>
          <p className="text-muted-foreground">
            {policy.policyNotes ?? "Refer to facility policies for refunds and extensions."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {showFacilityActions && policy.allowExtension && available > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={onRequestExtension}
            >
              <CalendarPlus className="size-3.5" />
              Extend validity
              {policy.extensionFee > 0 && (
                <span className="text-muted-foreground ml-1 text-[11px]">
                  (${policy.extensionFee})
                </span>
              )}
            </Button>
          )}
          {showFacilityActions && policy.allowTransfer && available > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={onRequestTransfer}
            >
              <Share2 className="size-3.5" />
              Transfer
            </Button>
          )}
          {showFacilityActions && policy.allowRefundUnused && available > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={onRequestRefund}
            >
              <RotateCcw className="size-3.5" />
              Refund unused
              {policy.refundPerUnusedPass !== undefined && (
                <span className="text-muted-foreground ml-1 text-[11px]">
                  (${policy.refundPerUnusedPass}/pass)
                </span>
              )}
            </Button>
          )}
          {showBookingCta && (
            <Button size="sm" className="ml-auto gap-1.5" asChild>
              <Link href="/customer/bookings/new">
                <Calendar className="size-3.5" />
                Book with pass
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PassRow({
  pass,
  booking,
  bookingLinkPrefix,
}: {
  pass: PassUsage;
  booking: Booking | undefined;
  bookingLinkPrefix: string;
}) {
  const { status, passNumber, usedAt, notes, refundedAt } = pass;

  const statusIcon =
    status === "used" ? (
      <Check className="size-3.5 text-green-600" />
    ) : status === "refunded" ? (
      <RotateCcw className="size-3.5 text-blue-600" />
    ) : status === "expired" ? (
      <XCircle className="size-3.5 text-red-600" />
    ) : (
      <Circle className="text-muted-foreground size-3.5" />
    );

  const statusLabel =
    status === "used"
      ? "Used"
      : status === "refunded"
        ? "Refunded"
        : status === "expired"
          ? "Expired"
          : "Available";

  const statusBadgeVariant =
    status === "available"
      ? "secondary"
      : status === "used"
        ? "default"
        : "outline";

  const content = (
    <div className="hover:bg-muted/40 flex items-center gap-3 rounded-md border px-3 py-2 transition-colors">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
        {passNumber}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {statusIcon}
          <span className="text-sm font-medium">{statusLabel}</span>
          {usedAt && (
            <span className="text-muted-foreground text-xs">
              · {new Date(usedAt).toLocaleDateString()}
            </span>
          )}
          {refundedAt && (
            <span className="text-muted-foreground text-xs">
              · {new Date(refundedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {notes && (
          <p className="text-muted-foreground truncate text-xs">{notes}</p>
        )}
      </div>
      <Badge variant={statusBadgeVariant} className="shrink-0 text-[10px]">
        {statusLabel}
      </Badge>
      {booking && <ArrowRight className="text-muted-foreground size-3.5" />}
    </div>
  );

  if (booking) {
    return (
      <Link href={`${bookingLinkPrefix}/${booking.id}`} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
