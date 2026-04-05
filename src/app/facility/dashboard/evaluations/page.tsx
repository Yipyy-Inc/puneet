"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
} from "lucide-react";
import { clients } from "@/data/clients";
import { StaffEvaluationFormModal } from "@/components/evaluations/StaffEvaluationFormModal";
import type { Evaluation } from "@/types/pet";

// ── Flatten all evaluations from all clients ─────────────────────────

interface EvalEntry {
  evaluation: Evaluation;
  petId: number;
  petName: string;
  petType: string;
  petBreed: string;
  petImage?: string;
  clientId: number;
  clientName: string;
}

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
  return entries;
}

// ── Status config ────────────────────────────────────────────────────

const STATUS_MAP = {
  pending: {
    label: "Pending",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  passed: {
    label: "Passed",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  failed: {
    label: "Not Approved",
    color: "bg-rose-100 text-rose-700",
    icon: XCircle,
    iconColor: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  outdated: {
    label: "Expired",
    color: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Main page ────────────────────────────────────────────────────────

export default function EvaluationsPage() {
  const allEvals = useMemo(() => getAllEvaluations(), []);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pending" | "passed" | "failed">(
    "all",
  );
  const [activeEval, setActiveEval] = useState<EvalEntry | null>(null);

  const filtered = useMemo(() => {
    let list = allEvals;
    if (tab !== "all") {
      list = list.filter((e) => e.evaluation.status === tab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.petName.toLowerCase().includes(q) ||
          e.clientName.toLowerCase().includes(q) ||
          e.evaluation.evaluatedBy?.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => {
      // Pending first, then by date descending
      if (
        a.evaluation.status === "pending" &&
        b.evaluation.status !== "pending"
      )
        return -1;
      if (
        b.evaluation.status === "pending" &&
        a.evaluation.status !== "pending"
      )
        return 1;
      const da = a.evaluation.evaluatedAt
        ? new Date(a.evaluation.evaluatedAt).getTime()
        : 0;
      const db = b.evaluation.evaluatedAt
        ? new Date(b.evaluation.evaluatedAt).getTime()
        : 0;
      return db - da;
    });
  }, [allEvals, tab, search]);

  const counts = {
    all: allEvals.length,
    pending: allEvals.filter((e) => e.evaluation.status === "pending").length,
    passed: allEvals.filter((e) => e.evaluation.status === "passed").length,
    failed: allEvals.filter((e) => e.evaluation.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-slate-800">
            <ClipboardCheck className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Evaluations
            </h2>
            <p className="text-sm text-slate-500">
              View and manage all pet evaluations — pending, completed, and
              upcoming
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {(
          [
            {
              key: "all",
              label: "Total",
              count: counts.all,
              icon: ClipboardCheck,
              bg: "bg-slate-100",
              ic: "text-slate-600",
            },
            {
              key: "pending",
              label: "Pending",
              count: counts.pending,
              icon: Clock,
              bg: "bg-blue-50",
              ic: "text-blue-600",
            },
            {
              key: "passed",
              label: "Passed",
              count: counts.passed,
              icon: CheckCircle2,
              bg: "bg-emerald-50",
              ic: "text-emerald-600",
            },
            {
              key: "failed",
              label: "Not Approved",
              count: counts.failed,
              icon: XCircle,
              bg: "bg-rose-50",
              ic: "text-rose-600",
            },
          ] as const
        ).map((stat) => (
          <Card
            key={stat.key}
            className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
            onClick={() =>
              setTab(stat.key as "all" | "pending" | "passed" | "failed")
            }
          >
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">
                    {stat.count}
                  </p>
                </div>
                <div
                  className={`flex size-12 items-center justify-center rounded-2xl ${stat.bg}`}
                >
                  <stat.icon className={`size-5 ${stat.ic}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "passed", label: "Passed" },
              { key: "failed", label: "Failed" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by pet, client, or evaluator..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Evaluation list */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <ClipboardCheck className="text-muted-foreground/30 size-10" />
              <p className="text-muted-foreground mt-3 text-sm">
                No evaluations found
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((entry) => {
                const s =
                  STATUS_MAP[
                    entry.evaluation.status as keyof typeof STATUS_MAP
                  ] ?? STATUS_MAP.pending;
                const Icon = s.icon;
                const isExpired =
                  entry.evaluation.isExpired &&
                  entry.evaluation.status === "passed";

                return (
                  <div
                    key={entry.evaluation.id}
                    className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {entry.petImage ? (
                          <img
                            src={entry.petImage}
                            alt={entry.petName}
                            className="size-11 rounded-xl object-cover"
                          />
                        ) : (
                          <div
                            className={`flex size-11 items-center justify-center rounded-xl ${s.bgColor}`}
                          >
                            <Icon className={`size-5 ${s.iconColor}`} />
                          </div>
                        )}
                        <div
                          className={`absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-white ${s.bgColor}`}
                        >
                          <Icon className={`size-3 ${s.iconColor}`} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {entry.petName}
                          </p>
                          <Badge className={`text-[10px] ${s.color}`}>
                            {isExpired ? "Expired" : s.label}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {entry.petType} · {entry.petBreed}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            {entry.clientName}
                          </span>
                          {entry.evaluation.evaluatedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(entry.evaluation.evaluatedAt)}
                            </span>
                          )}
                          {entry.evaluation.evaluatedBy && (
                            <span className="flex items-center gap-1">
                              Evaluator: {entry.evaluation.evaluatedBy}
                            </span>
                          )}
                        </div>
                        {entry.evaluation.notes && (
                          <p className="text-muted-foreground mt-1 line-clamp-1 max-w-md text-xs">
                            {entry.evaluation.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      {entry.evaluation.status === "pending" && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setActiveEval(entry)}
                        >
                          <ClipboardCheck className="size-3.5" />
                          Evaluate
                        </Button>
                      )}
                      {(entry.evaluation.status === "passed" ||
                        entry.evaluation.status === "failed") && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setActiveEval(entry)}
                          >
                            <ClipboardCheck className="size-3.5" />
                            View / Edit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evaluation form modal */}
      {activeEval && (
        <StaffEvaluationFormModal
          open={!!activeEval}
          onOpenChange={(open) => !open && setActiveEval(null)}
          evaluation={activeEval.evaluation}
          petName={activeEval.petName}
          ownerName={activeEval.clientName}
          evaluatorName={activeEval.evaluation.evaluatedBy}
        />
      )}
    </div>
  );
}
