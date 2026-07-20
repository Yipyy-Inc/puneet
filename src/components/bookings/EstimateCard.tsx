"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  XCircle,
  CalendarDays,
  PawPrint,
  ArrowRight,
  FileText,
  Copy,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import type { Estimate } from "@/types/booking";
import { EstimateDetailDrawer } from "@/components/bookings/EstimateDetailDrawer";
import {
  STATUS_CONFIG,
  type EstimateStatusKey,
  formatDate,
  formatDateTime,
  daysUntil,
} from "@/components/bookings/estimate-detail-utils";

interface EstimateCardProps {
  estimate: Estimate;
  onSend?: (id: string) => void;
  onConvert?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function EstimateCard({
  estimate,
  onSend,
  onConvert,
  onDecline,
  onDelete,
  onDuplicate,
  selected = false,
  onToggleSelect,
}: EstimateCardProps) {
  const [open, setOpen] = useState(false);
  const expiryDays = estimate.expiresAt ? daysUntil(estimate.expiresAt) : null;
  // An estimate past its expiry that hasn't reached a terminal outcome
  // (accepted/declined/converted) is shown as "Expired" even when its stored
  // status is still "sent"/"draft". This effective status drives the primary badge.
  const isEffectivelyExpired =
    expiryDays !== null &&
    expiryDays <= 0 &&
    estimate.status !== "accepted" &&
    estimate.status !== "declined" &&
    estimate.status !== "converted";
  const effectiveStatus: EstimateStatusKey = isEffectivelyExpired
    ? "expired"
    : estimate.status;
  const config = STATUS_CONFIG[effectiveStatus];
  const StatusIcon = config.icon;

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
        className={cn(
          "group focus-visible:ring-primary/30 cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none",
          selected && "ring-primary/50 ring-2",
        )}
      >
        <CardContent className="p-0">
          {/* Header strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex items-center gap-3">
              {/* Bulk-selection checkbox — hover-reveal, always shown when selected */}
              {onToggleSelect && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center transition-opacity",
                    selected
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100",
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggleSelect(estimate.id)}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={`Select estimate ${estimate.estimateId}`}
                  />
                </div>
              )}
              <div
                className={`flex size-9 items-center justify-center rounded-xl ${
                  effectiveStatus === "accepted" ||
                  effectiveStatus === "converted"
                    ? "bg-emerald-50"
                    : effectiveStatus === "declined"
                      ? "bg-rose-50"
                      : effectiveStatus === "sent"
                        ? "bg-blue-50"
                        : effectiveStatus === "expired"
                          ? "bg-amber-50"
                          : "bg-slate-100"
                }`}
              >
                <StatusIcon
                  className={`size-4 ${
                    effectiveStatus === "accepted" ||
                    effectiveStatus === "converted"
                      ? "text-emerald-600"
                      : effectiveStatus === "declined"
                        ? "text-rose-600"
                        : effectiveStatus === "sent"
                          ? "text-blue-600"
                          : effectiveStatus === "expired"
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
                {/* Viewed indicator — tells staff whether the customer opened it */}
                {estimate.status === "sent" && (
                  <div className="mt-1 flex items-center gap-1 text-[11px]">
                    <Eye
                      className={cn(
                        "size-3",
                        estimate.viewedAt
                          ? "text-emerald-600"
                          : "text-muted-foreground",
                      )}
                    />
                    {estimate.viewedAt ? (
                      <span className="font-medium text-emerald-700">
                        Viewed {formatDateTime(estimate.viewedAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Not yet viewed
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Expiry countdown — the primary badge conveys the expired state */}
              {estimate.status === "sent" &&
                expiryDays !== null &&
                expiryDays > 0 && (
                  <span className="text-muted-foreground text-[11px]">
                    Expires in {expiryDays}d
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

              {/* Actions menu — hover-reveal on desktop, always tappable on mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Estimate actions"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onSelect={() => setOpen(true)}>
                    <Eye className="size-3.5" />
                    View Details
                  </DropdownMenuItem>
                  {estimate.status === "sent" && (
                    <DropdownMenuItem
                      onSelect={() => {
                        onSend?.(estimate.id);
                        toast.success("Estimate sent to customer");
                      }}
                    >
                      <Send className="size-3.5" />
                      Resend
                    </DropdownMenuItem>
                  )}
                  {(estimate.status === "accepted" ||
                    estimate.status === "sent") && (
                    <DropdownMenuItem
                      onSelect={() => {
                        onConvert?.(estimate.id);
                        toast.success("Converting to booking...");
                      }}
                    >
                      <ArrowRight className="size-3.5" />
                      Convert to Booking
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() => {
                      onDuplicate?.(estimate.id);
                      toast.success("Estimate duplicated");
                    }}
                  >
                    <Copy className="size-3.5" />
                    Duplicate
                  </DropdownMenuItem>
                  {estimate.status === "sent" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => {
                          onDecline?.(estimate.id);
                          toast.success("Estimate declined");
                        }}
                      >
                        <XCircle className="size-3.5" />
                        Mark as Declined
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <EstimateDetailDrawer
        estimate={estimate}
        open={open}
        onOpenChange={setOpen}
        onSend={onSend}
        onConvert={onConvert}
        onDecline={onDecline}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
    </>
  );
}
