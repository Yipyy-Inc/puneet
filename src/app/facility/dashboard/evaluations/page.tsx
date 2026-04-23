"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClickableStatCard } from "@/components/ui/ClickableStatCard";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Clock,
  FileText,
  PawPrint,
  User,
  XCircle,
} from "lucide-react";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { facilities } from "@/data/facilities";
import { StaffEvaluationFormModal } from "@/components/evaluations/StaffEvaluationFormModal";
import { cn } from "@/lib/utils";
import type { Evaluation } from "@/types/pet";

interface EvalEntry {
  evaluation: Evaluation;
  petId: number;
  petName: string;
  petType: string;
  petBreed: string;
  petImage?: string;
  clientId: number;
  clientName: string;
  bundledWith?: string;
  bundledDate?: string;
}

type EvaluationTab = "all" | "pending" | "passed" | "failed" | "outdated";

function getAllEvaluations(): EvalEntry[] {
  const entries: EvalEntry[] = [];

  for (const client of clients) {
    for (const pet of client.pets) {
      const evals =
        (pet as unknown as { evaluations?: Evaluation[] }).evaluations ?? [];

      for (const evaluation of evals) {
        entries.push({
          evaluation,
          petId: pet.id,
          petName: pet.name,
          petType: pet.type,
          petBreed: pet.breed,
          petImage: pet.imageUrl,
          clientId: client.id,
          clientName: client.name,
        });
      }
    }
  }

  for (const booking of bookings) {
    if (!booking.includesEvaluation) continue;
    if (booking.evaluationStatus === "completed") continue;

    const client = clients.find((c) => c.id === booking.clientId);
    if (!client) continue;

    const petIds = Array.isArray(booking.petId)
      ? booking.petId
      : [booking.petId];

    for (const pid of petIds) {
      const pet = client.pets.find((p) => p.id === pid);
      if (!pet) continue;

      const alreadyHas = entries.some(
        (entry) => entry.petId === pid && entry.evaluation.status === "pending",
      );
      if (alreadyHas) continue;

      entries.push({
        evaluation: {
          id: `eval-booking-${booking.id}-${pid}`,
          petId: pid,
          status: "pending",
        },
        petId: pid,
        petName: pet.name,
        petType: pet.type,
        petBreed: pet.breed,
        petImage: pet.imageUrl,
        clientId: client.id,
        clientName: client.name,
        bundledWith:
          booking.service.charAt(0).toUpperCase() + booking.service.slice(1),
        bundledDate: booking.startDate,
      });
    }
  }

  return entries;
}

const STATUS_MAP = {
  pending: {
    label: "Pending",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
    icon: Clock,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  passed: {
    label: "Approved",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  failed: {
    label: "Not Approved",
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-400",
    icon: XCircle,
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
  },
  outdated: {
    label: "Expired",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    icon: AlertTriangle,
    iconColor: "text-slate-600",
    bgColor: "bg-slate-50",
  },
};

function getEvaluationStatus(entry: EvalEntry): keyof typeof STATUS_MAP {
  if (entry.evaluation.status === "passed" && entry.evaluation.isExpired) {
    return "outdated";
  }

  return entry.evaluation.status as keyof typeof STATUS_MAP;
}

function EvaluationStatusBadge({ entry }: { entry: EvalEntry }) {
  const status = STATUS_MAP[getEvaluationStatus(entry)] ?? STATUS_MAP.pending;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 bg-transparent font-normal", status.badge)}
    >
      <span className={cn("size-1.5 rounded-full", status.dot)} />
      {status.label}
    </Badge>
  );
}

function formatDate(date?: string) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EvaluationsPage() {
  const allEvals = useMemo(() => getAllEvaluations(), []);
  const facility = facilities.find((f) => f.id === 11);
  const [savedEvaluations, setSavedEvaluations] = useState<
    Record<string, Evaluation>
  >({});
  const [tab, setTab] = useState<EvaluationTab>("all");
  const [activeEval, setActiveEval] = useState<EvalEntry | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const records: Record<string, Evaluation> = {};
      for (const entry of allEvals) {
        const raw = localStorage.getItem(
          `staff-evaluation-record:${entry.evaluation.id}`,
        );
        if (!raw) continue;

        try {
          records[entry.evaluation.id] = JSON.parse(raw) as Evaluation;
        } catch {
          // Ignore corrupted local demo records and fall back to fixture data.
        }
      }
      setSavedEvaluations(records);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [allEvals]);

  const evaluationEntries = useMemo(
    () =>
      allEvals.map((entry) => ({
        ...entry,
        evaluation: savedEvaluations[entry.evaluation.id] ?? entry.evaluation,
      })),
    [allEvals, savedEvaluations],
  );

  const sortedEvals = useMemo(
    () =>
      [...evaluationEntries].sort((a, b) => {
        if (
          a.evaluation.status === "pending" &&
          b.evaluation.status !== "pending"
        ) {
          return -1;
        }

        if (
          b.evaluation.status === "pending" &&
          a.evaluation.status !== "pending"
        ) {
          return 1;
        }

        const aDate = a.evaluation.evaluatedAt
          ? new Date(a.evaluation.evaluatedAt).getTime()
          : 0;
        const bDate = b.evaluation.evaluatedAt
          ? new Date(b.evaluation.evaluatedAt).getTime()
          : 0;

        return bDate - aDate;
      }),
    [evaluationEntries],
  );

  const filtered = useMemo(() => {
    if (tab === "all") return sortedEvals;
    return sortedEvals.filter((entry) => getEvaluationStatus(entry) === tab);
  }, [sortedEvals, tab]);

  const counts = {
    all: sortedEvals.length,
    pending: sortedEvals.filter(
      (entry) => entry.evaluation.status === "pending",
    ).length,
    passed: sortedEvals.filter(
      (entry) => getEvaluationStatus(entry) === "passed",
    ).length,
    failed: sortedEvals.filter((entry) => entry.evaluation.status === "failed")
      .length,
    outdated: sortedEvals.filter(
      (entry) => getEvaluationStatus(entry) === "outdated",
    ).length,
  };

  const columns: ColumnDef<EvalEntry>[] = [
    {
      key: "pet",
      label: "Pet",
      icon: PawPrint,
      defaultVisible: true,
      sortable: true,
      sortValue: (entry) => entry.petName,
      render: (entry) => {
        const status = STATUS_MAP[getEvaluationStatus(entry)];
        const Icon = status.icon;

        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {entry.petImage ? (
                <img
                  src={entry.petImage}
                  alt={entry.petName}
                  className="size-10 rounded-full object-cover ring-2 ring-slate-100"
                />
              ) : (
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full ring-2 ring-slate-100",
                    status.bgColor,
                  )}
                >
                  <Icon className={cn("size-4", status.iconColor)} />
                </div>
              )}
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white",
                  status.dot,
                )}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {entry.petName}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {entry.petType} - {entry.petBreed}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "client",
      label: "Client",
      icon: User,
      defaultVisible: true,
      sortable: true,
      sortValue: (entry) => entry.clientName,
      render: (entry) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{entry.clientName}</span>
          <span className="text-muted-foreground text-xs">
            Customer #{entry.clientId}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: CircleDot,
      defaultVisible: true,
      sortable: true,
      sortValue: (entry) => getEvaluationStatus(entry),
      render: (entry) => <EvaluationStatusBadge entry={entry} />,
    },
    {
      key: "date",
      label: "Evaluation Date",
      icon: Calendar,
      defaultVisible: true,
      sortable: true,
      sortValue: (entry) => entry.evaluation.evaluatedAt ?? "",
      render: (entry) => (
        <div className="flex flex-col text-sm">
          <span>{formatDate(entry.evaluation.evaluatedAt)}</span>
          {entry.bundledDate && (
            <span className="text-muted-foreground text-xs">
              Check-in {formatDate(entry.bundledDate)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "evaluator",
      label: "Evaluator",
      icon: User,
      defaultVisible: true,
      sortable: true,
      sortValue: (entry) => entry.evaluation.evaluatedBy ?? "",
      render: (entry) => (
        <span className="text-sm">
          {entry.evaluation.evaluatedBy ?? (
            <span className="text-muted-foreground text-xs">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      key: "source",
      label: "Source",
      icon: FileText,
      defaultVisible: true,
      render: (entry) =>
        entry.bundledWith ? (
          <Badge
            variant="outline"
            className="border-sky-200 bg-sky-50/70 text-xs font-normal text-sky-700"
          >
            Bundled with {entry.bundledWith}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">Pet profile</span>
        ),
    },
    {
      key: "notes",
      label: "Notes",
      icon: FileText,
      defaultVisible: true,
      sortable: false,
      render: (entry) => (
        <p className="text-muted-foreground line-clamp-1 max-w-xs text-xs">
          {entry.evaluation.notes || "-"}
        </p>
      ),
    },
  ];

  return (
    <div className="flex-1 space-y-6 bg-linear-to-b from-slate-50/70 to-transparent p-4 pt-6 md:p-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
        <div className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-52 rounded-full bg-emerald-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="w-fit rounded-full px-3 py-1 text-[11px] uppercase"
            >
              Evaluation Center
            </Badge>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Evaluations
              </h2>
              <p className="text-muted-foreground text-sm">
                {facility?.name ?? "Facility"} pet approvals, expirations, and
                pending evaluation workflow
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">
                {counts.all} total
              </Badge>
              <Badge className="bg-amber-100 text-xs text-amber-700 hover:bg-amber-100">
                {counts.pending} pending
              </Badge>
              <Badge className="bg-emerald-100 text-xs text-emerald-700 hover:bg-emerald-100">
                {counts.passed} approved
              </Badge>
              <Badge className="bg-red-100 text-xs text-red-700 hover:bg-red-100">
                {counts.failed} not approved
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">
              Next action
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {counts.pending > 0
                ? `${counts.pending} evaluations ready for staff review`
                : "No pending evaluations right now"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <ClickableStatCard
          title="All Evaluations"
          value={counts.all}
          subtitle="Total records"
          icon={ClipboardCheck}
          onClick={() => setTab("all")}
          isActive={tab === "all"}
        />
        <ClickableStatCard
          title="Pending"
          value={counts.pending}
          subtitle="Awaiting review"
          icon={Clock}
          onClick={() => setTab("pending")}
          isActive={tab === "pending"}
        />
        <ClickableStatCard
          title="Approved"
          value={counts.passed}
          subtitle="Passed evaluations"
          icon={CheckCircle2}
          onClick={() => setTab("passed")}
          isActive={tab === "passed"}
        />
        <ClickableStatCard
          title="Not Approved"
          value={counts.failed}
          subtitle="Did not pass"
          icon={XCircle}
          onClick={() => setTab("failed")}
          isActive={tab === "failed"}
        />
        <ClickableStatCard
          title="Expired"
          value={counts.outdated}
          subtitle="Needs renewal"
          icon={AlertTriangle}
          onClick={() => setTab("outdated")}
          isActive={tab === "outdated"}
        />
      </div>

      <Card className="border border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <CardTitle className="text-base">Evaluation Directory</CardTitle>
            <p className="text-muted-foreground text-xs">
              Showing {filtered.length} of {sortedEvals.length} evaluations
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as EvaluationTab)}
            className="w-full"
          >
            <TabsList className="w-auto">
              <TabsTrigger value="all">
                All
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {counts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {counts.pending}
                </span>
              </TabsTrigger>
              <TabsTrigger value="passed">
                Approved
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {counts.passed}
                </span>
              </TabsTrigger>
              <TabsTrigger value="failed">
                Not Approved
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {counts.failed}
                </span>
              </TabsTrigger>
              <TabsTrigger value="outdated">
                Expired
                <span className="text-muted-foreground ml-1.5 text-xs">
                  {counts.outdated}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              <div className="relative rounded-xl border border-slate-200/80 bg-linear-to-br from-sky-50/60 via-white to-emerald-50/50 p-2.5">
                <div className="overflow-hidden rounded-lg border border-white/90 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <div className="[&_tbody_td]:py-3 [&_tbody_td]:align-middle [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-200 [&_thead_th]:bg-slate-50/90 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:tracking-wide [&_thead_th]:text-slate-500 [&_thead_th]:uppercase">
                    <DataTable
                      data={filtered}
                      columns={columns}
                      getSearchValue={(entry) =>
                        [
                          entry.petName,
                          entry.clientName,
                          entry.petBreed,
                          entry.petType,
                          entry.evaluation.evaluatedBy,
                          entry.evaluation.notes,
                          entry.bundledWith,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      }
                      searchPlaceholder="Search by pet, client, breed, or evaluator..."
                      itemsPerPage={12}
                      onRowClick={setActiveEval}
                      rowClassName={(entry) =>
                        cn(
                          "border-b border-slate-100/80 [&>td]:py-3",
                          getEvaluationStatus(entry) === "pending" &&
                            "bg-amber-50/35",
                        )
                      }
                      actions={(entry) => (
                        <Button
                          size="sm"
                          variant={
                            entry.evaluation.status === "pending"
                              ? "default"
                              : "outline"
                          }
                          className="gap-1.5"
                          onClick={() => setActiveEval(entry)}
                        >
                          <ClipboardCheck className="size-3.5" />
                          {entry.evaluation.status === "pending"
                            ? "Evaluate"
                            : "View / Edit"}
                        </Button>
                      )}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {activeEval && (
        <StaffEvaluationFormModal
          open={!!activeEval}
          onOpenChange={(open) => !open && setActiveEval(null)}
          evaluation={activeEval.evaluation}
          petName={activeEval.petName}
          petImage={activeEval.petImage}
          ownerName={activeEval.clientName}
          evaluatorName={activeEval.evaluation.evaluatedBy}
          onEvaluationSaved={(savedEvaluation) => {
            setSavedEvaluations((prev) => ({
              ...prev,
              [savedEvaluation.id]: savedEvaluation,
            }));
            setActiveEval((prev) =>
              prev ? { ...prev, evaluation: savedEvaluation } : prev,
            );
          }}
        />
      )}
    </div>
  );
}
