"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  Calendar,
  User,
  FileText,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Evaluation } from "@/types/pet";

// ── Status helpers ───────────────────────────────────────────────────

type EvalSummary = {
  status: "valid" | "expired" | "failed" | "pending" | "none";
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle2;
};

function getEvalSummary(evaluations: Evaluation[] | undefined): EvalSummary {
  if (!evaluations || evaluations.length === 0) {
    return {
      status: "none",
      label: "No Evaluation",
      description: "This pet has not been evaluated yet",
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: Clock,
    };
  }

  const sorted = [...evaluations].sort((a, b) => {
    const da = a.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
    const db = b.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
    return db - da;
  });

  const latestCompleted = sorted.find(
    (e) => e.status === "passed" || e.status === "failed",
  );
  const hasPending = sorted.some((e) => e.status === "pending");

  if (latestCompleted?.status === "passed" && !latestCompleted.isExpired) {
    return {
      status: "valid",
      label: "Approved",
      description: "Evaluation passed — services unlocked",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      icon: ShieldCheck,
    };
  }
  if (
    latestCompleted?.status === "passed" &&
    (latestCompleted.isExpired ||
      latestCompleted.status === ("outdated" as string))
  ) {
    return {
      status: "expired",
      label: "Expired",
      description: "Previous evaluation has expired — re-evaluation needed",
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      icon: AlertTriangle,
    };
  }
  if (latestCompleted?.status === "failed") {
    return {
      status: "failed",
      label: "Not Approved",
      description: "Last evaluation did not pass",
      color: "text-rose-700",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      icon: ShieldX,
    };
  }
  if (hasPending) {
    return {
      status: "pending",
      label: "Pending",
      description: "Evaluation scheduled — awaiting assessment",
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: Clock,
    };
  }
  return {
    status: "none",
    label: "No Evaluation",
    description: "This pet has not been evaluated yet",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Clock,
  };
}

// ── Approved services pills ──────────────────────────────────────────

function ApprovedServicesList({
  services,
}: {
  services: Evaluation["approvedServices"];
}) {
  if (!services) return null;
  const items: string[] = [];
  if (services.daycare) items.push("Daycare");
  if (services.boarding) items.push("Boarding");
  if (services.customApproved) items.push(...services.customApproved);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((svc) => (
        <div
          key={svc}
          className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1"
        >
          <CheckCircle2 className="size-3 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">{svc}</span>
        </div>
      ))}
    </div>
  );
}

// ── Timeline entry ───────────────────────────────────────────────────

function TimelineEntry({
  evaluation,
  isLatest,
  onOpen,
}: {
  evaluation: Evaluation;
  isLatest: boolean;
  onOpen?: () => void;
}) {
  const isPassed = evaluation.status === "passed";
  const isFailed = evaluation.status === "failed";
  const isPending = evaluation.status === "pending";

  const dotColor = isPassed
    ? evaluation.isExpired
      ? "bg-amber-400"
      : "bg-emerald-500"
    : isFailed
      ? "bg-rose-500"
      : "bg-blue-400";

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "z-10 size-3 shrink-0 rounded-full ring-4 ring-white",
            dotColor,
            isLatest && "size-3.5",
          )}
        />
        <div className="bg-border w-px flex-1" />
      </div>

      {/* Content */}
      <div className="-mt-0.5 min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              isPassed && !evaluation.isExpired
                ? "default"
                : isFailed
                  ? "destructive"
                  : "secondary"
            }
            className="text-xs"
          >
            {isPassed
              ? evaluation.isExpired
                ? "Passed (Expired)"
                : "Passed"
              : isFailed
                ? "Not Approved"
                : "Pending"}
          </Badge>
          {isLatest && (
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Latest
            </span>
          )}
        </div>

        {evaluation.evaluatedAt && (
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(evaluation.evaluatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {evaluation.evaluatedBy && (
              <span className="flex items-center gap-1">
                <User className="size-3" />
                {evaluation.evaluatedBy}
              </span>
            )}
          </div>
        )}

        {evaluation.notes && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {evaluation.notes}
          </p>
        )}

        {isPassed && !evaluation.isExpired && evaluation.approvedServices && (
          <ApprovedServicesList services={evaluation.approvedServices} />
        )}

        {isPending && onOpen && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={onOpen}
          >
            <FileText className="size-3.5" />
            Complete Evaluation
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface PetEvaluationProfileProps {
  evaluations: Evaluation[] | undefined;
  petName: string;
  onStartEvaluation?: (evaluation: Evaluation) => void;
}

export function PetEvaluationProfile({
  evaluations,
  petName,
  onStartEvaluation,
}: PetEvaluationProfileProps) {
  const summary = useMemo(() => getEvalSummary(evaluations), [evaluations]);
  const Icon = summary.icon;

  const sorted = useMemo(() => {
    if (!evaluations || evaluations.length === 0) return [];
    return [...evaluations].sort((a, b) => {
      // Pending first, then by date descending
      if (a.status === "pending" && b.status !== "pending") return 1;
      if (b.status === "pending" && a.status !== "pending") return -1;
      const da = a.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
      const db = b.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
      return db - da;
    });
  }, [evaluations]);

  const latestCompleted = sorted.find(
    (e) => e.status === "passed" || e.status === "failed",
  );

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4",
          summary.bgColor,
          summary.borderColor,
        )}
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            summary.status === "valid"
              ? "bg-emerald-100"
              : summary.status === "expired"
                ? "bg-amber-100"
                : summary.status === "failed"
                  ? "bg-rose-100"
                  : summary.status === "pending"
                    ? "bg-blue-100"
                    : "bg-gray-100",
          )}
        >
          <Icon className={cn("size-5", summary.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm font-semibold", summary.color)}>
              {summary.label}
            </p>
            {summary.status === "valid" && (
              <Sparkles className="size-3.5 text-emerald-500" />
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {summary.description}
          </p>

          {/* Services unlocked inline */}
          {summary.status === "valid" && latestCompleted?.approvedServices && (
            <div className="mt-2">
              <ApprovedServicesList
                services={latestCompleted.approvedServices}
              />
            </div>
          )}

          {/* Expiration info */}
          {summary.status === "expired" && latestCompleted?.expiresAt && (
            <p className="mt-1.5 text-xs text-amber-600">
              Expired on{" "}
              {new Date(latestCompleted.expiresAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}

          {/* Failure reason */}
          {summary.status === "failed" && latestCompleted?.notes && (
            <div className="mt-2 rounded-lg bg-white/60 px-3 py-2">
              <p className="text-xs font-medium text-rose-700">Staff notes:</p>
              <p className="mt-0.5 text-xs text-rose-600">
                {latestCompleted.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation history timeline */}
      {sorted.length > 0 && (
        <div className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Evaluation History
            </p>
            <Badge variant="secondary" className="text-[10px]">
              {sorted.length} {sorted.length === 1 ? "record" : "records"}
            </Badge>
          </div>
          <div className="p-4">
            {sorted.map((evaluation, i) => (
              <TimelineEntry
                key={evaluation.id}
                evaluation={evaluation}
                isLatest={i === 0}
                onOpen={
                  evaluation.status === "pending" && onStartEvaluation
                    ? () => onStartEvaluation(evaluation)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!evaluations || evaluations.length === 0) && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-gray-100">
            <FileText className="size-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">
              No evaluations yet
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {petName} hasn&apos;t been evaluated. Schedule an evaluation to
              unlock services.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
