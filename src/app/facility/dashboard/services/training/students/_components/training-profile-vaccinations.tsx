"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  ExternalLink,
  FileText,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { VACCINE_EXPIRY_WINDOW_DAYS } from "@/lib/training-students";
import type { VaccinationRecord } from "@/types/pet";

interface Props {
  petId: number;
  petName: string;
  ownerId: number;
}

type VaccineState = "ok" | "expiring" | "expired" | "no-expiry";

interface VaccineRow {
  record: VaccinationRecord;
  state: VaccineState;
  daysUntilExpiry: number | null;
}

const STATE_META: Record<
  VaccineState,
  { label: string; cls: string; Icon: typeof CheckCircle2 }
> = {
  ok: {
    label: "Up to date",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Icon: ShieldCheck,
  },
  expiring: {
    label: "Expiring soon",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    Icon: AlertTriangle,
  },
  expired: {
    label: "Expired",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    Icon: CircleSlash,
  },
  "no-expiry": {
    label: "No expiry on file",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: ShieldAlert,
  },
};

const REVIEW_META: Record<
  NonNullable<VaccinationRecord["status"]>,
  { label: string; cls: string }
> = {
  approved: {
    label: "Approved",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending_review: {
    label: "Pending review",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  exception: {
    label: "Exception",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00").getTime();
  const to = new Date(toISO + "T00:00:00").getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function stateLabel(row: VaccineRow): string {
  if (row.state === "no-expiry") return STATE_META["no-expiry"].label;
  if (row.daysUntilExpiry === null) return STATE_META[row.state].label;
  if (row.state === "expired") {
    return `Expired ${-row.daysUntilExpiry}d ago`;
  }
  if (row.state === "expiring") {
    return row.daysUntilExpiry === 0
      ? "Expires today"
      : `Expires in ${row.daysUntilExpiry}d`;
  }
  return `Up to date · ${row.daysUntilExpiry}d remaining`;
}

export function TrainingProfileVaccinations({
  petId,
  petName,
  ownerId,
}: Props) {
  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );
  const { data: allVaccinations = [] } = useQuery(
    trainingQueries.vaccinations(),
  );

  const rows = useMemo<VaccineRow[]>(() => {
    return allVaccinations
      .filter((v) => v.petId === petId)
      .map<VaccineRow>((v) => {
        if (!v.expiryDate) {
          return { record: v, state: "no-expiry", daysUntilExpiry: null };
        }
        const days = daysBetween(todayISO, v.expiryDate);
        const state: VaccineState =
          days < 0
            ? "expired"
            : days <= VACCINE_EXPIRY_WINDOW_DAYS
              ? "expiring"
              : "ok";
        return { record: v, state, daysUntilExpiry: days };
      })
      .sort((a, b) => {
        // Surface trouble first: expired → expiring → ok → no-expiry. Within
        // a tier, soonest expiry first.
        const tierRank: Record<VaccineState, number> = {
          expired: 0,
          expiring: 1,
          ok: 2,
          "no-expiry": 3,
        };
        if (tierRank[a.state] !== tierRank[b.state]) {
          return tierRank[a.state] - tierRank[b.state];
        }
        const aDays = a.daysUntilExpiry ?? Number.POSITIVE_INFINITY;
        const bDays = b.daysUntilExpiry ?? Number.POSITIVE_INFINITY;
        return aDays - bDays;
      });
  }, [allVaccinations, petId, todayISO]);

  const counts = useMemo(() => {
    let ok = 0;
    let expiring = 0;
    let expired = 0;
    let pendingReview = 0;
    for (const r of rows) {
      if (r.state === "ok") ok++;
      else if (r.state === "expiring") expiring++;
      else if (r.state === "expired") expired++;
      if (r.record.status === "pending_review") pendingReview++;
    }
    return { ok, expiring, expired, pendingReview };
  }, [rows]);

  const petProfileHref = `/facility/dashboard/clients/${ownerId}/pets/${petId}`;
  const overallTone: VaccineState =
    counts.expired > 0
      ? "expired"
      : counts.expiring > 0
        ? "expiring"
        : "ok";
  const overallMeta = STATE_META[overallTone];
  const OverallIcon = overallMeta.Icon;

  return (
    <div className="space-y-4">
      {/* Header strip — overall status + summary chips + manage link ─── */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
          overallTone === "expired"
            ? "border-rose-200 bg-rose-50/60"
            : overallTone === "expiring"
              ? "border-amber-200 bg-amber-50/60"
              : "border-emerald-200 bg-emerald-50/60",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              overallTone === "expired"
                ? "bg-rose-100 text-rose-700"
                : overallTone === "expiring"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700",
            )}
          >
            <OverallIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {petName}&apos;s vaccinations —{" "}
              {overallTone === "expired"
                ? "needs attention"
                : overallTone === "expiring"
                  ? "renewal coming up"
                  : "all up to date"}
            </p>
            <p className="text-muted-foreground text-[11px]">
              Pulled from {petName}&apos;s pet profile. Updates happen there.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {counts.expired > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-rose-200 bg-white text-rose-700"
            >
              <CircleSlash className="size-3" />
              {counts.expired} expired
            </Badge>
          )}
          {counts.expiring > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-white text-amber-700"
            >
              <AlertTriangle className="size-3" />
              {counts.expiring} expiring
            </Badge>
          )}
          {counts.ok > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-white text-emerald-700"
            >
              <CheckCircle2 className="size-3" />
              {counts.ok} up to date
            </Badge>
          )}
          {counts.pendingReview > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-violet-200 bg-white text-violet-700"
              title="Submitted by the owner — waiting on staff review."
            >
              <Stethoscope className="size-3" />
              {counts.pendingReview} pending review
            </Badge>
          )}
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href={petProfileHref}>
            Manage in pet profile
            <ArrowUpRight className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Read-only notice ─────────────────────────────────────────── */}
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <Lock className="size-3" />
        Read-only — trainers see status here but renewals, uploads, and
        approvals live on the pet profile.
      </p>

      {/* List ─────────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          <Syringe className="text-muted-foreground/30 mx-auto mb-2 size-8" />
          No vaccination records on file for {petName}.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const { record, state, daysUntilExpiry } = row;
            const meta = STATE_META[state];
            const StateIcon = meta.Icon;
            const review = record.status
              ? REVIEW_META[record.status]
              : null;
            return (
              <li
                key={record.id}
                className={cn(
                  "bg-card rounded-xl border shadow-sm",
                  state === "expired" && "ring-1 ring-rose-200",
                )}
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      state === "expired"
                        ? "bg-rose-100 text-rose-700"
                        : state === "expiring"
                          ? "bg-amber-100 text-amber-700"
                          : state === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Syringe className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {record.vaccineName}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {record.veterinarianName ?? "Veterinarian unknown"}
                          {record.veterinaryClinic && (
                            <>
                              {" · "}
                              {record.veterinaryClinic}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn("gap-1 border text-[10px]", meta.cls)}
                        >
                          <StateIcon className="size-3" />
                          {stateLabel(row)}
                        </Badge>
                        {review && (
                          <Badge
                            variant="outline"
                            className={cn("gap-1 border text-[10px]", review.cls)}
                            title="Document review status from the pet profile."
                          >
                            {review.label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-muted-foreground grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        Administered{" "}
                        <span className="text-slate-700 font-semibold">
                          {formatDate(record.administeredDate)}
                        </span>
                      </span>
                      {record.expiryDate && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          Expires{" "}
                          <span
                            className={cn(
                              "font-semibold",
                              state === "expired" && "text-rose-700",
                              state === "expiring" && "text-amber-700",
                              state === "ok" && "text-slate-700",
                            )}
                          >
                            {formatDate(record.expiryDate)}
                          </span>
                        </span>
                      )}
                      {record.nextDueDate &&
                        record.nextDueDate !== record.expiryDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            Next due{" "}
                            <span className="font-semibold text-slate-700">
                              {formatDate(record.nextDueDate)}
                            </span>
                          </span>
                        )}
                    </div>

                    {record.notes && (
                      <p className="bg-muted/40 rounded-md px-2.5 py-1.5 text-[11px]/relaxed text-slate-600">
                        {record.notes}
                      </p>
                    )}

                    {(record.documentUrl || daysUntilExpiry === null) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {record.documentUrl && (
                          <a
                            href={record.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            <FileText className="size-3" />
                            Certificate
                            <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
