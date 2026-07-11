"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
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
  MoreHorizontal,
  Scissors,
  Home,
  Sun,
  GraduationCap,
  AlertTriangle,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type {
  CustomerPackagePurchase,
  PackagePolicy,
  ServicePackage,
  PassUsage,
} from "@/data/services-pricing";
import {
  defaultPackagePolicy,
  redeemPurchasePass,
} from "@/data/services-pricing";
import type { Booking } from "@/types/booking";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

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
  /** Called after a pass is redeemed via "Book with Pass" so the parent can
   *  re-render the updated remaining count. */
  onRedeemed?: () => void;
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

/** Left-edge accent + icon keyed off the pass's service category. */
function getServiceTheme(category: string): {
  accent: string;
  icon: LucideIcon;
} {
  const key = category.toLowerCase();
  if (key.includes("groom")) return { accent: "#7c3aed", icon: Scissors }; // purple
  if (key.includes("board")) return { accent: "#1e3a8a", icon: Home }; // navy
  if (key.includes("train")) return { accent: "#b45309", icon: GraduationCap }; // amber
  return { accent: "#0d9488", icon: Sun }; // teal — daycare / default
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
  onRedeemed,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
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

  const daysLeft = daysUntilFrom(purchase.expiresAt, nowMs);
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;
  const isExpired = daysLeft <= 0 && available > 0;

  const theme = getServiceTheme(purchase.category);
  const Icon = theme.icon;

  const passesDisplay = useMemo(() => {
    return purchase.passes
      .filter((p) => p.status !== "available")
      .map((pass) => {
        const booking = pass.bookingId ? getBooking(pass.bookingId) : undefined;
        return { pass, booking };
      });
  }, [purchase.passes, getBooking]);

  const usedCount = used + refunded + expired;
  const hasHistory = usedCount > 0 || (purchase.adjustments?.length ?? 0) > 0;

  const canExtend =
    showFacilityActions && policy.allowExtension && available > 0;
  const canTransfer =
    showFacilityActions && policy.allowTransfer && available > 0;
  const canRefund =
    showFacilityActions && policy.allowRefundUnused && available > 0;
  const hasMenu = canExtend || canTransfer || canRefund;

  const expiryColor = isExpiringSoon
    ? "text-amber-600 dark:text-amber-400"
    : "text-muted-foreground";

  return (
    <Card
      className={
        isExpired
          ? "bg-muted/40 border-muted relative overflow-hidden"
          : "overflow-hidden"
      }
      style={
        isExpired
          ? undefined
          : { borderLeftColor: theme.accent, borderLeftWidth: 4 }
      }
    >
      {/* EXPIRED watermark */}
      {isExpired && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="text-muted-foreground/25 rotate-[-14deg] rounded-md border-2 border-current px-5 py-1.5 text-3xl font-black tracking-[0.2em]">
            EXPIRED
          </span>
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={
                isExpired
                  ? "bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl"
                  : "flex size-10 shrink-0 items-center justify-center rounded-xl"
              }
              style={
                isExpired
                  ? undefined
                  : {
                      backgroundColor: `${theme.accent}1a`,
                      color: theme.accent,
                    }
              }
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <h3
                className={
                  isExpired
                    ? "text-muted-foreground truncate font-semibold"
                    : "truncate font-semibold"
                }
              >
                {purchase.packageName}
              </h3>
              <span
                className={
                  isExpired
                    ? "bg-muted text-muted-foreground mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
                    : "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
                }
                style={
                  isExpired
                    ? undefined
                    : {
                        backgroundColor: `${theme.accent}14`,
                        color: theme.accent,
                      }
                }
              >
                {purchase.category}
              </span>
            </div>
          </div>

          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground size-8 shrink-0"
                >
                  <MoreHorizontal className="size-5" />
                  <span className="sr-only">Pass actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Manage pass</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canExtend && (
                  <DropdownMenuItem onSelect={onRequestExtension}>
                    <CalendarPlus className="mr-2 size-4" />
                    Extend validity
                    {policy.extensionFee > 0 && (
                      <span className="text-muted-foreground ml-auto text-[11px]">
                        ${policy.extensionFee}
                      </span>
                    )}
                  </DropdownMenuItem>
                )}
                {canTransfer && (
                  <DropdownMenuItem onSelect={onRequestTransfer}>
                    <Share2 className="mr-2 size-4" />
                    Transfer
                  </DropdownMenuItem>
                )}
                {canRefund && (
                  <DropdownMenuItem
                    onSelect={onRequestRefund}
                    className="text-destructive focus:text-destructive"
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Refund unused
                    {policy.refundPerUnusedPass !== undefined && (
                      <span className="text-muted-foreground ml-auto text-[11px]">
                        ${policy.refundPerUnusedPass}/pass
                      </span>
                    )}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Expiry urgency banner */}
        {isExpired ? (
          <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg border p-2.5 text-sm font-medium">
            <AlertTriangle className="size-4 shrink-0" />
            This pass has expired
          </div>
        ) : available > 0 && daysLeft <= 14 ? (
          <div
            className={
              daysLeft <= 7
                ? "flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-2.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                : "flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
            }
          >
            <AlertTriangle className="size-4 shrink-0" />
            Expiring in {daysLeft} day{daysLeft === 1 ? "" : "s"}
          </div>
        ) : null}

        {/* Prominent credit display */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={
                isExpired
                  ? "text-muted-foreground text-4xl font-bold tabular-nums"
                  : "text-4xl font-bold tabular-nums"
              }
              style={{ color: isExpired ? undefined : theme.accent }}
            >
              {available}
            </span>
            <span className="text-muted-foreground text-sm">
              of {purchase.totalPasses} passes left
            </span>
          </div>
          {/* Dot row — filled = remaining, empty = consumed */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from({ length: purchase.totalPasses }).map((_, i) => {
              const filled = i < available;
              return (
                <span
                  key={i}
                  className={
                    filled && !isExpired
                      ? "size-2.5 rounded-full"
                      : isExpired && filled
                        ? "bg-muted-foreground/40 size-2.5 rounded-full"
                        : "bg-muted size-2.5 rounded-full"
                  }
                  style={
                    filled && !isExpired
                      ? { backgroundColor: theme.accent }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Expiry status */}
        <div className={`flex items-center gap-1.5 text-sm ${expiryColor}`}>
          <Clock className="size-4 shrink-0" />
          {isExpired ? (
            <span className="font-medium">
              Expired on {formatDate(purchase.expiresAt)}
            </span>
          ) : (
            <span>
              Expires {formatDate(purchase.expiresAt)} ·{" "}
              <span className="font-medium">
                {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </span>
            </span>
          )}
        </div>

        {/* View history — collapsed by default */}
        {hasHistory && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="hover:bg-muted/30 flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors"
              >
                <span className="font-medium">View history</span>
                <ChevronDown
                  className={`size-4 transition-transform ${
                    historyOpen ? "rotate-180" : ""
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
              {purchase.adjustments && purchase.adjustments.length > 0 && (
                <div className="bg-muted/20 space-y-1 rounded-lg border p-3 text-xs">
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
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* View package policy — collapsed by default */}
        <Collapsible open={policyOpen} onOpenChange={setPolicyOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted/30 flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Info className="size-4" />
                View package policy
              </span>
              <ChevronDown
                className={`size-4 transition-transform ${
                  policyOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <p className="text-muted-foreground bg-muted/20 rounded-lg border p-3 text-xs">
              {policy.policyNotes ??
                "Refer to facility policies for refunds and extensions."}
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Single primary CTA */}
        {showBookingCta &&
          (isExpired ? (
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link href="/customer/messages">
                <MessageSquare className="size-4" />
                Contact us to extend
              </Link>
            </Button>
          ) : (
            <BookWithPassButton
              purchase={purchase}
              disabled={available <= 0}
              onRedeemed={onRedeemed}
            />
          ))}
      </CardContent>
    </Card>
  );
}

/**
 * "Book with Pass" — opens the booking modal pre-filtered to the pass's service
 * (no payment), and redeems one pass on confirm. Isolated into its own component
 * so `useBookingModal` is only called in the customer view (the facility view
 * hides the CTA and isn't wrapped by the BookingModalProvider).
 */
function BookWithPassButton({
  purchase,
  disabled,
  onRedeemed,
}: {
  purchase: CustomerPackagePurchase;
  disabled?: boolean;
  onRedeemed?: () => void;
}) {
  const { selectedFacility } = useCustomerFacility();
  const { openBookingModal } = useBookingModal();
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  const handleBook = () => {
    if (!selectedFacility || !customer) return;
    openBookingModal({
      clients: [customer],
      facilityId: selectedFacility.id,
      facilityName: selectedFacility.name,
      preSelectedClientId: customer.id,
      // Pre-filter the flow to the service the pass is valid for.
      preSelectedService: purchase.category,
      lockService: true,
      isCustomerMode: true,
      passRedemption: {
        serviceLabel: purchase.serviceLabel,
        category: purchase.category,
        onRedeem: (ctx) => {
          const result = redeemPurchasePass(purchase.id, ctx);
          if (result.ok) {
            onRedeemed?.();
            return { ok: true, passesLeft: result.passesLeft };
          }
          return { ok: false, passesLeft: 0 };
        },
      },
      onCreateBooking: () => {
        // Modal shows its own pass-confirmation screen.
      },
    });
  };

  return (
    <Button
      className="w-full gap-2"
      onClick={handleBook}
      disabled={disabled || !selectedFacility || !customer}
    >
      <Calendar className="size-4" />
      Book with Pass
    </Button>
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
