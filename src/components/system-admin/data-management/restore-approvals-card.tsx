"use client";

import { useState } from "react";

import { ShieldAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  restoreRequestStatus,
  useDataManagement,
  type RestoreRequest,
  type RestoreRequestStatus,
} from "@/lib/data-management-store";

import { RestoreApprovalModal } from "./restore-approval-modal";

const STATUS_META: Record<
  RestoreRequestStatus,
  { label: string; cls: string }
> = {
  pending: {
    label: "Pending approval",
    cls: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    cls: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  expired: {
    label: "Expired",
    cls: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

function remaining(expiresAt: string, nowMs: number): string {
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export function RestoreApprovalsCard() {
  const { requests } = useDataManagement();
  const [now] = useState(() => Date.now());
  const [target, setTarget] = useState<RestoreRequest | null>(null);

  const pendingCount = requests.filter(
    (r) => restoreRequestStatus(r, now) === "pending",
  ).length;

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ShieldAlert className="size-5" />
              Pending Restore Approvals
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Restores require a second System administrator&rsquo;s approval
              within 4 hours.
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="border-amber-300 bg-amber-50 text-amber-700">
              {pendingCount} awaiting
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {requests.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No restore requests.
          </p>
        )}
        {requests.map((req) => {
          const st = restoreRequestStatus(req, now);
          const meta = STATUS_META[st];
          return (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{req.backupName}</span>
                  <Badge variant="outline" className={cn("text-xs", meta.cls)}>
                    {meta.label}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  Scope: {req.scope} · Requested by {req.requestedBy} ·{" "}
                  {new Date(req.requestedAt).toLocaleString()}
                </div>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                  <Users className="size-3" />
                  {st === "pending" ? "Awaiting" : "Notified"}:{" "}
                  {req.notifiedAdmins.join(", ") || "—"}
                </div>
                {st === "approved" && (
                  <div className="mt-0.5 text-xs text-emerald-600">
                    Approved by {req.approvedBy} · restore executing
                  </div>
                )}
                {st === "rejected" && (
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    Rejected by {req.approvedBy}
                    {req.reason ? ` — ${req.reason}` : ""}
                  </div>
                )}
                {st === "expired" && (
                  <div className="mt-0.5 text-xs text-rose-600">
                    Expired — no second approval within 4 hours
                  </div>
                )}
              </div>
              {st === "pending" && (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    Expires in {remaining(req.expiresAt, now)}
                  </span>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => setTarget(req)}
                  >
                    Review
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <RestoreApprovalModal
        key={target?.id ?? "none"}
        request={target}
        onOpenChange={(o) => {
          if (!o) setTarget(null);
        }}
      />
    </Card>
  );
}
