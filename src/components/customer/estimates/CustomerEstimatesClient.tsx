"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarDays,
  PawPrint,
  Eye,
  Check,
  CalendarCheck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AcceptEstimateDialog } from "./AcceptEstimateDialog";
import { DeclineEstimateDialog } from "./DeclineEstimateDialog";
import type { Estimate } from "@/types/booking";

type CustomerStatus =
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "converted";

type TabKey = "all" | CustomerStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Awaiting Response" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
  { key: "converted", label: "Converted" },
];

const STATUS_META: Record<CustomerStatus, { label: string; badge: string }> = {
  sent: { label: "Awaiting Response", badge: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", badge: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Declined", badge: "bg-slate-100 text-slate-600" },
  expired: { label: "Expired", badge: "bg-amber-100 text-amber-700" },
  converted: { label: "Converted", badge: "bg-emerald-100 text-emerald-700" },
};

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  estimates: Estimate[];
  facilityName: string;
  facilityLogo?: string;
}

export function CustomerEstimatesClient({
  estimates,
  facilityName,
  facilityLogo,
}: Props) {
  // "Awaiting Response" (sent, not yet acted on) is the default view.
  const [activeTab, setActiveTab] = useState<TabKey>("sent");
  const [now] = useState(() => Date.now());
  // Local status overrides after a customer accepts (accepted or auto-converted).
  const [statusOverride, setStatusOverride] = useState<
    Record<string, CustomerStatus>
  >({});
  const [acceptTarget, setAcceptTarget] = useState<Estimate | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Estimate | null>(null);

  const effectiveStatus = (e: Estimate): CustomerStatus => {
    const override = statusOverride[e.id];
    if (override) return override;
    if (
      e.status === "accepted" ||
      e.status === "declined" ||
      e.status === "converted" ||
      e.status === "expired"
    ) {
      return e.status;
    }
    // sent (or any non-terminal) — past its expiry reads as Expired.
    if (e.expiresAt && new Date(e.expiresAt).getTime() < now) return "expired";
    return "sent";
  };

  const withStatus = useMemo(
    () => estimates.map((e) => ({ estimate: e, status: effectiveStatus(e) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estimates, statusOverride, now],
  );

  const filtered =
    activeTab === "all"
      ? withStatus
      : withStatus.filter((r) => r.status === activeTab);

  const countFor = (key: TabKey) =>
    key === "all"
      ? withStatus.length
      : withStatus.filter((r) => r.status === key).length;

  const facilityInitials = facilityName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleAccepted = (result: {
    estimateId: string;
    converted: boolean;
  }) => {
    setStatusOverride((prev) => ({
      ...prev,
      [result.estimateId]: result.converted ? "converted" : "accepted",
    }));
  };

  const handleDeclined = (estimateId: string) => {
    setStatusOverride((prev) => ({ ...prev, [estimateId]: "declined" }));
  };

  return (
    <div className="space-y-5">
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => {
          const count = countFor(tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    activeTab === tab.key ? "text-white/70" : "text-slate-400",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-white py-16 text-center">
          <FileText className="text-muted-foreground/20 size-12" />
          <p className="text-muted-foreground mt-3 text-sm">
            No estimates in this category.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(({ estimate, status }) => {
            const meta = STATUS_META[status];
            const petLabel =
              estimate.petNames.length > 0
                ? estimate.petNames.join(", ")
                : (estimate.guestPetInfo?.name ?? "Your pet");
            const expiryDays = estimate.expiresAt
              ? Math.ceil(
                  (new Date(estimate.expiresAt).getTime() - now) / 86_400_000,
                )
              : null;
            const detailHref = `/customer/estimates/${estimate.estimateToken ?? estimate.id}`;

            return (
              <div
                key={estimate.id}
                className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                {/* Header — facility + estimate number */}
                <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="size-8">
                      {facilityLogo && (
                        <AvatarImage src={facilityLogo} alt={facilityName} />
                      )}
                      <AvatarFallback className="text-[10px]">
                        {facilityInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {facilityName}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Estimate {estimate.estimateId}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn("gap-1 text-[10px]", meta.badge)}>
                    {status === "converted" && (
                      <CalendarCheck className="size-2.5" />
                    )}
                    {meta.label}
                  </Badge>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 px-5 py-4">
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="flex items-center gap-1">
                      <PawPrint className="size-3" />
                      {petLabel}
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

                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <CalendarDays className="size-3" />
                    {fmtDate(estimate.startDate)}
                    {estimate.endDate &&
                      estimate.endDate !== estimate.startDate &&
                      ` – ${fmtDate(estimate.endDate)}`}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold tabular-nums">
                        ${estimate.total.toFixed(2)}
                      </p>
                      {estimate.expiresAt && (
                        <p
                          className={cn(
                            "text-[11px]",
                            status === "expired"
                              ? "text-red-600"
                              : expiryDays !== null && expiryDays <= 7
                                ? "font-medium text-amber-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {status === "expired" ? "Expired on" : "Valid until"}{" "}
                          {fmtDate(estimate.expiresAt.slice(0, 10))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 border-t px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                    >
                      <Link href={detailHref}>
                        <Eye className="size-3.5" />
                        View Details
                      </Link>
                    </Button>
                    {status === "sent" && (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => setAcceptTarget(estimate)}
                      >
                        <Check className="size-3.5" />
                        Accept
                      </Button>
                    )}
                  </div>
                  {status === "sent" && (
                    <button
                      type="button"
                      onClick={() => setDeclineTarget(estimate)}
                      className="text-muted-foreground w-full text-center text-xs hover:text-red-600"
                    >
                      Decline this estimate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {acceptTarget && (
        <AcceptEstimateDialog
          estimate={acceptTarget}
          facilityName={facilityName}
          open={!!acceptTarget}
          onOpenChange={(o) => !o && setAcceptTarget(null)}
          onAccepted={handleAccepted}
        />
      )}

      {declineTarget && (
        <DeclineEstimateDialog
          estimate={declineTarget}
          facilityName={facilityName}
          open={!!declineTarget}
          onOpenChange={(o) => !o && setDeclineTarget(null)}
          onDeclined={handleDeclined}
        />
      )}
    </div>
  );
}
