"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Send,
  XCircle,
  CalendarDays,
  PawPrint,
  ArrowRight,
  Trash2,
  FileText,
  Copy,
  Eye,
  UserPlus,
  Bell,
  CheckCircle2,
  Clock,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConvertEstimateReviewDialog } from "@/components/bookings/ConvertEstimateReviewDialog";
import { useEstimateActions } from "@/components/bookings/use-estimate-actions";
import type { Estimate } from "@/types/booking";
import { EstimatePdfDownload } from "@/components/estimates/EstimatePdfDownload";
import { RevisionHistoryButton } from "@/components/estimates/EstimateRevisionHistory";
import {
  STATUS_CONFIG,
  formatDate,
  formatDateTime,
  daysUntil,
  getEffectiveStatus,
} from "@/components/bookings/estimate-detail-utils";

interface EstimateDetailDrawerProps {
  estimate: Estimate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActionDesc {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/** Icon for an activity-log entry, matched on its type string. */
function activityIcon(type: string): LucideIcon {
  const t = type.toLowerCase();
  if (t.includes("reminder")) return Bell;
  if (t.includes("sent") || t.includes("resent")) return Send;
  if (t.includes("view")) return Eye;
  if (t.includes("version")) return Copy;
  if (t.includes("accept")) return CheckCircle2;
  if (t.includes("declin")) return XCircle;
  if (t.includes("expir")) return Clock;
  if (t.includes("convert")) return ArrowRight;
  if (t.includes("creat")) return FileText;
  return Clock;
}

export function EstimateDetailDrawer({
  estimate,
  open,
  onOpenChange,
}: EstimateDetailDrawerProps) {
  // Every action is a write through useEstimateActions; the drawer re-renders
  // from the refreshed row. It kept a local "accepted on behalf" copy, stamped
  // "Front Desk" for whoever pressed it, and forgot it on close.
  const actions = useEstimateActions(estimate);
  const [convertReviewOpen, setConvertReviewOpen] = useState(false);
  const est: Estimate = estimate;

  const status = getEffectiveStatus(est);
  const config = STATUS_CONFIG[status];

  // Action descriptors — the first entry is the status-driven PRIMARY (solid,
  // full-width); the rest are demoted to outline/secondary.
  const act = {
    send: (label: string): ActionDesc => ({
      key: "send",
      label,
      icon: Send,
      disabled: actions.busy,
      onClick: () => void actions.send(),
    }),
    convert: (): ActionDesc => ({
      key: "convert",
      label: "Convert to Booking",
      icon: ArrowRight,
      // Opens a review screen — never a silent create.
      onClick: () => setConvertReviewOpen(true),
    }),
    acceptOnBehalf: (): ActionDesc => ({
      key: "accept-on-behalf",
      label: "Accept on Behalf of Customer",
      icon: CheckCircle2,
      disabled: actions.busy,
      onClick: () => void actions.acceptOnBehalf(),
    }),
    // "Send reminder" recorded to an in-memory outbox and "Send via SMS"
    // toasted a text that was never sent; neither survives. The link is what
    // reaches the customer, and staff share it themselves.
    copyLink: (): ActionDesc => ({
      key: "copy-link",
      label: "Copy Estimate Link",
      icon: Link2,
      disabled: !estimate.estimateToken,
      onClick: () => void actions.copyLink(),
    }),
    duplicate: (): ActionDesc => ({
      key: "duplicate",
      label: "Duplicate",
      icon: Copy,
      disabled: actions.busy,
      onClick: () => void actions.duplicate(),
    }),
    decline: (): ActionDesc => ({
      key: "decline",
      label: "Decline",
      icon: XCircle,
      destructive: true,
      disabled: actions.busy,
      onClick: () => void actions.decline(),
    }),
    remove: (): ActionDesc => ({
      key: "delete",
      label: "Delete",
      icon: Trash2,
      destructive: true,
      disabled: actions.busy,
      onClick: async () => {
        await actions.remove();
        onOpenChange(false);
      },
    }),
  };

  // Only a DRAFT can be deleted: an estimate a customer has seen is kept as
  // the record of what they were quoted (the table's delete policy says so).
  const actionsByStatus: Record<typeof status, ActionDesc[]> = {
    draft: [act.send("Send"), act.duplicate(), act.remove()],
    sent: [
      act.send("Resend"),
      act.copyLink(),
      act.acceptOnBehalf(),
      act.convert(),
      act.duplicate(),
      act.decline(),
    ],
    accepted: [act.convert(), act.duplicate()],
    declined: [act.duplicate()],
    expired: [act.send("Resend"), act.duplicate()],
    converted: [act.duplicate()],
  };

  const [primaryAction, ...secondaryActions] = actionsByStatus[status];
  const PrimaryIcon = primaryAction.icon;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-xl lg:max-w-2xl"
        >
          <SheetHeader className="border-b pr-10">
            <SheetTitle className="flex flex-wrap items-center gap-2">
              <span>{estimate.clientName}</span>
              <Badge className={`text-[10px] ${config.color}`}>
                {config.label}
              </Badge>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <FileText className="size-2.5" />
                Estimate {estimate.estimateId}
              </Badge>
              {estimate.status === "converted" &&
                estimate.convertedBookingId && (
                  <Link
                    href={`/facility/dashboard/bookings/${estimate.convertedBookingId}`}
                  >
                    <Badge
                      variant="outline"
                      className="hover:bg-muted gap-1 text-[10px]"
                    >
                      <ArrowRight className="size-2.5" />
                      View Booking #{estimate.convertedBookingId}
                    </Badge>
                  </Link>
                )}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Estimate {estimate.estimateId} details
            </SheetDescription>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formatDate(estimate.startDate)}
                {estimate.startDate !== estimate.endDate &&
                  ` — ${formatDate(estimate.endDate)}`}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <PawPrint className="size-3" />
                {estimate.petNames.join(", ")}
              </span>
              <span>·</span>
              <span className="capitalize">{estimate.service}</span>
              {estimate.serviceType && (
                <>
                  <span>·</span>
                  <span>{estimate.serviceType}</span>
                </>
              )}
            </div>
            {/* Expiry — beneath the estimate dates */}
            {estimate.expiresAt && (
              <p
                className={cn(
                  "text-xs font-medium",
                  status === "expired"
                    ? "text-red-600"
                    : daysUntil(estimate.expiresAt) <= 7
                      ? "text-amber-600"
                      : "text-muted-foreground",
                )}
              >
                {status === "expired" ? "Expired on" : "Expires on"}{" "}
                {formatDate(estimate.expiresAt)}
              </p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Line items */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  Line Items
                </p>
                <div className="rounded-lg border bg-white">
                  {estimate.lineItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b px-3.5 py-2 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-medium">{item.label}</p>
                        {item.description && (
                          <p className="text-muted-foreground text-[10px]">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium tabular-nums">
                          ${item.total.toFixed(2)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-muted-foreground text-[10px] tabular-nums">
                            ${item.amount.toFixed(2)} × {item.quantity}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing summary */}
              <div className="rounded-lg border bg-white px-3.5 py-2.5">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">
                      ${estimate.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {estimate.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>
                        Discount
                        {estimate.discountReason
                          ? ` (${estimate.discountReason})`
                          : ""}
                      </span>
                      <span className="tabular-nums">
                        -${estimate.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {estimate.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tax ({(estimate.taxRate * 100).toFixed(0)}%)
                      </span>
                      <span className="tabular-nums">
                        ${estimate.taxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 text-sm font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">
                      ${estimate.total.toFixed(2)}
                    </span>
                  </div>
                  {estimate.depositRequired && (
                    <div className="text-muted-foreground flex justify-between text-[11px]">
                      <span>Deposit required</span>
                      <span className="tabular-nums">
                        ${estimate.depositRequired.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {estimate.notes && (
                <div className="rounded-lg border bg-white px-3.5 py-2.5">
                  <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    Notes
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {estimate.notes}
                  </p>
                </div>
              )}

              {/* Customer Activity */}
              {estimate.sentAt && (
                <div className="rounded-lg border bg-white px-3.5 py-2.5">
                  <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    Customer Activity
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Send className="size-3 text-slate-400" />
                      Sent {formatDate(estimate.sentAt)}
                    </span>
                    <ArrowRight className="size-3 text-slate-400" />
                    {estimate.viewedAt ? (
                      <span className="flex items-center gap-1 font-medium text-emerald-700">
                        <Eye className="size-3 text-emerald-600" />
                        Opened {formatDateTime(estimate.viewedAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Eye className="size-3" />
                        Not yet opened
                      </span>
                    )}
                  </div>
                  {/* Account status — only when the estimate auto-created an account */}
                  {(estimate.accountCreated || estimate.isGuestEstimate) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
                      <UserPlus className="size-3 text-slate-400" />
                      <span className="text-muted-foreground">
                        Account: Auto-created {formatDate(estimate.createdAt)}
                      </span>
                      {estimate.accountActivatedAt ? (
                        <span className="font-medium text-emerald-700">
                          · Activated {formatDate(estimate.accountActivatedAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          · Not yet activated (magic link sent)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[10px]">
                <span>Created {formatDate(estimate.createdAt)}</span>
                <span>by {estimate.createdBy}</span>
                {estimate.sentAt && (
                  <span>
                    · Sent {formatDate(estimate.sentAt)} via {estimate.sentVia}
                  </span>
                )}
                <span>· {estimate.estimateId}</span>
              </div>

              {/* Utilities — PDF, History */}
              <div className="flex items-center gap-1.5 border-t pt-3">
                <EstimatePdfDownload
                  estimate={estimate}
                  size="sm"
                  variant="ghost"
                />
                <RevisionHistoryButton estimate={est} />
              </div>

              {/* Actions — status-driven primary + demoted secondaries */}
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full gap-1.5"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                >
                  <PrimaryIcon className="size-4" />
                  {primaryAction.label}
                </Button>
                {secondaryActions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {secondaryActions.map((a) => {
                      const ActionIcon = a.icon;
                      return (
                        <Button
                          key={a.key}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "gap-1.5",
                            a.destructive && "text-destructive",
                          )}
                          onClick={a.onClick}
                          disabled={a.disabled}
                        >
                          <ActionIcon className="size-3.5" />
                          {a.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Activity Log — full chronological history */}
              {est.activityLog && est.activityLog.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    Activity Log
                  </p>
                  <ul className="space-y-2.5">
                    {[...est.activityLog]
                      .sort(
                        (a, b) =>
                          new Date(a.at).getTime() - new Date(b.at).getTime(),
                      )
                      .map((entry, i) => {
                        const EntryIcon = activityIcon(entry.type);
                        return (
                          <li key={`${entry.at}-${i}`} className="flex gap-2.5">
                            <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100">
                              <EntryIcon className="size-3 text-slate-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium">
                                {entry.type}
                                {entry.detail && (
                                  <span className="text-muted-foreground font-normal">
                                    {" "}
                                    — {entry.detail}
                                  </span>
                                )}
                              </p>
                              <p className="text-muted-foreground text-[11px]">
                                {formatDateTime(entry.at)} · {entry.actor}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConvertEstimateReviewDialog
        estimate={estimate}
        open={convertReviewOpen}
        onOpenChange={setConvertReviewOpen}
        onConverted={() => onOpenChange(false)}
      />
    </>
  );
}
