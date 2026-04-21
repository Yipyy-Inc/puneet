"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  PawPrint,
  ArrowRight,
  Trash2,
  FileText,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import type { Estimate } from "@/types/booking";
import { EstimatePdfDownload } from "@/components/estimates/EstimatePdfDownload";
import { RevisionHistoryButton } from "@/components/estimates/EstimateRevisionHistory";

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "bg-slate-100 text-slate-700",
    icon: FileText,
  },
  sent: {
    label: "Sent",
    color: "bg-blue-100 text-blue-700",
    icon: Send,
  },
  accepted: {
    label: "Accepted",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    color: "bg-rose-100 text-rose-700",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  converted: {
    label: "Converted",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface EstimateCardProps {
  estimate: Estimate;
  onSend?: (id: string) => void;
  onConvert?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function EstimateCard({
  estimate,
  onSend,
  onConvert,
  onDecline,
  onDelete,
  onDuplicate,
}: EstimateCardProps) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[estimate.status];
  const StatusIcon = config.icon;
  const isActionable =
    estimate.status === "draft" ||
    estimate.status === "sent" ||
    estimate.status === "accepted";
  const expiryDays = estimate.expiresAt ? daysUntil(estimate.expiresAt) : null;

  return (
    <>
    <Card
      role="button"
      tabIndex={0}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className="cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
    >
      <CardContent className="p-0">
        {/* Header strip */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-9 items-center justify-center rounded-xl ${
                estimate.status === "accepted" ||
                estimate.status === "converted"
                  ? "bg-emerald-50"
                  : estimate.status === "declined"
                    ? "bg-rose-50"
                    : estimate.status === "sent"
                      ? "bg-blue-50"
                      : estimate.status === "expired"
                        ? "bg-amber-50"
                        : "bg-slate-100"
              }`}
            >
              <StatusIcon
                className={`size-4 ${
                  estimate.status === "accepted" ||
                  estimate.status === "converted"
                    ? "text-emerald-600"
                    : estimate.status === "declined"
                      ? "text-rose-600"
                      : estimate.status === "sent"
                        ? "text-blue-600"
                        : estimate.status === "expired"
                          ? "text-amber-600"
                          : "text-slate-600"
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{estimate.clientName}</p>
                <Badge className={`text-[10px] ${config.color}`}>
                  {config.label}
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <FileText className="size-2.5" />
                  Estimate {estimate.estimateId}
                </Badge>
                {estimate.status === "converted" &&
                  estimate.convertedBookingId && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <ArrowRight className="size-2.5" />
                      Booking #{estimate.convertedBookingId}
                    </Badge>
                  )}
              </div>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
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
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Expiry countdown */}
            {estimate.status === "sent" &&
              expiryDays !== null &&
              expiryDays > 0 && (
                <span className="text-muted-foreground text-[11px]">
                  Expires in {expiryDays}d
                </span>
              )}
            {estimate.status === "sent" &&
              expiryDays !== null &&
              expiryDays <= 0 && (
                <span className="text-[11px] font-medium text-amber-600">
                  Expired
                </span>
              )}

            {/* Total */}
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums">
                ${estimate.total.toFixed(2)}
              </p>
              {estimate.depositRequired && (
                <p className="text-muted-foreground text-[10px]">
                  ${estimate.depositRequired.toFixed(2)} deposit
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
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
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <ArrowRight className="size-2.5" />
                  Booking #{estimate.convertedBookingId}
                </Badge>
              )}
          </DialogTitle>
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
        </DialogHeader>

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

            {/* Secondary actions — PDF, History, Duplicate */}
            <div className="flex items-center gap-1.5 border-t pt-3">
              <EstimatePdfDownload
                estimate={estimate}
                size="sm"
                variant="ghost"
              />
              <RevisionHistoryButton estimate={estimate} />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  onDuplicate?.(estimate.id);
                  toast.success("Estimate duplicated");
                }}
              >
                <Copy className="size-3" />
                Duplicate
              </Button>
            </div>

            {/* Actions */}
            {isActionable && (
              <div className="flex items-center gap-2 pt-2">
                {(estimate.status === "draft" ||
                  estimate.status === "sent") && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      onSend?.(estimate.id);
                      toast.success("Estimate sent to customer");
                    }}
                  >
                    <Send className="size-3.5" />
                    {estimate.status === "draft" ? "Send" : "Resend"}
                  </Button>
                )}
                {(estimate.status === "sent" ||
                  estimate.status === "accepted") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      onConvert?.(estimate.id);
                      toast.success("Converting to booking...");
                    }}
                  >
                    <ArrowRight className="size-3.5" />
                    Convert to Booking
                  </Button>
                )}
                {estimate.status === "sent" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive gap-1.5"
                    onClick={() => {
                      onDecline?.(estimate.id);
                      toast.success("Estimate declined");
                    }}
                  >
                    <XCircle className="size-3.5" />
                    Decline
                  </Button>
                )}
                {(estimate.status === "draft" ||
                  estimate.status === "declined" ||
                  estimate.status === "expired") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive gap-1.5"
                    onClick={() => {
                      onDelete?.(estimate.id);
                      toast.success("Estimate deleted");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
