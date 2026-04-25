"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { BookingTransfer } from "@/types/location";
import type { Location } from "@/types/location";

interface Props {
  transfers: BookingTransfer[];
  locations: Location[];
}

const STATUS_CONFIG: Record<
  BookingTransfer["status"],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  completed:        { label: "Completed",       icon: CheckCircle2,  color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40" },
  pending_approval: { label: "Pending Approval", icon: Clock,         color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40" },
  approved:         { label: "Approved",         icon: CheckCircle2,  color: "text-blue-700 dark:text-blue-400",    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40" },
  rejected:         { label: "Rejected",         icon: XCircle,       color: "text-red-700 dark:text-red-400",      bg: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40" },
};

function formatDt(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function TransfersHistoryClient({ transfers, locations }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingTransfer["status"] | "all">("all");

  const getLocation = (id: string) => locations.find((l) => l.id === id);

  const filtered = transfers.filter((t) => {
    const from = getLocation(t.fromLocationId);
    const to = getLocation(t.toLocationId);
    const matchesSearch =
      !search ||
      String(t.bookingId).includes(search) ||
      t.initiatedBy.toLowerCase().includes(search.toLowerCase()) ||
      from?.name.toLowerCase().includes(search.toLowerCase()) ||
      to?.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.reason ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: transfers.length,
    completed: transfers.filter((t) => t.status === "completed").length,
    pending_approval: transfers.filter((t) => t.status === "pending_approval").length,
    approved: transfers.filter((t) => t.status === "approved").length,
    rejected: transfers.filter((t) => t.status === "rejected").length,
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/overview">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transfer History</h1>
            <p className="text-muted-foreground text-sm">All inter-location booking transfers</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.success("Transfer log exported")}
        >
          <Download className="size-3.5" />
          Export
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(["all", "completed", "pending_approval", "approved"] as const).map((s) => {
          const cfg = s === "all" ? null : STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-all",
                statusFilter === s
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/30",
              )}
            >
              <span className="text-muted-foreground text-[10px] font-medium capitalize">
                {s === "all" ? "All transfers" : s.replace("_", " ")}
              </span>
              <span className="text-xl font-bold">{counts[s]}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Filter className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search by booking, staff, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "completed", "pending_approval", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all",
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Transfer list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12">
              <ArrowLeftRight className="text-muted-foreground/40 size-10" />
              <p className="text-muted-foreground text-sm">No transfers match your filters</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((transfer) => {
            const from = getLocation(transfer.fromLocationId);
            const to = getLocation(transfer.toLocationId);
            const cfg = STATUS_CONFIG[transfer.status];
            const StatusIcon = cfg.icon;

            return (
              <Card
                key={transfer.id}
                className="overflow-hidden transition-all duration-200 hover:shadow-sm"
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Left: Transfer route */}
                    <div className="flex items-center gap-3">
                      {/* From location dot */}
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="flex size-8 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                          style={{ backgroundColor: from?.color ?? "#94a3b8" }}
                        >
                          {from?.shortCode ?? "??"}
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <ArrowLeftRight className="text-muted-foreground size-4" />
                      </div>

                      {/* To location dot */}
                      <div
                        className="flex size-8 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                        style={{ backgroundColor: to?.color ?? "#94a3b8" }}
                      >
                        {to?.shortCode ?? "??"}
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">
                            Booking #{transfer.bookingId}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("gap-1 text-[10px]", cfg.color, cfg.bg)}
                          >
                            <StatusIcon className="size-2.5" />
                            {cfg.label}
                          </Badge>
                          {transfer.requiresCustomerApproval && !transfer.customerApprovedAt && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 gap-1 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                              <AlertTriangle className="size-2.5" />
                              Awaiting customer
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          <span style={{ color: from?.color }}>{from?.name}</span>
                          {" → "}
                          <span style={{ color: to?.color }}>{to?.name}</span>
                          {" · "}
                          {transfer.initiatedBy}
                          {" · "}
                          {formatDt(transfer.initiatedAt)}
                        </p>
                        {transfer.reason && (
                          <p className="text-muted-foreground mt-1 text-xs italic">
                            "{transfer.reason}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Pricing + actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {transfer.pricingPolicy === "keep_original" ? "Price kept" : "Price updated"}
                        </Badge>
                        {transfer.priceDelta !== 0 && (
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              transfer.priceDelta > 0 ? "text-amber-600" : "text-emerald-600",
                            )}
                          >
                            {transfer.priceDelta > 0 ? "+" : ""}${transfer.priceDelta.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1.5">
                        {transfer.status === "pending_approval" && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => toast.success("Transfer approved")}
                            >
                              <CheckCircle2 className="size-3" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive h-7 gap-1 text-xs"
                              onClick={() => toast.info("Transfer rejected")}
                            >
                              <XCircle className="size-3" />
                              Reject
                            </Button>
                          </>
                        )}
                        {transfer.status === "approved" && (
                          <Button
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => toast.success("Transfer finalized")}
                          >
                            <CheckCircle2 className="size-3" />
                            Finalize
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Completion info */}
                  {(transfer.completedAt || transfer.customerApprovedAt) && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        {transfer.customerApprovedAt && (
                          <span>
                            <span className="font-medium">Customer approved:</span>{" "}
                            {formatDt(transfer.customerApprovedAt)}
                          </span>
                        )}
                        {transfer.completedAt && (
                          <span>
                            <span className="font-medium">Completed:</span>{" "}
                            {formatDt(transfer.completedAt)}
                          </span>
                        )}
                        {transfer.customerNotified && (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            Customer notified
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
