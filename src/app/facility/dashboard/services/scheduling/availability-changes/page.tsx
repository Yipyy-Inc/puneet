"use client";

import { useMemo, useState } from "react";
import { Calendar, Check, Clock, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  availabilityChangeRequests as initialRequests,
  departments,
  scheduleEmployees,
} from "@/data/scheduling";
import type {
  AvailabilityChangeRequest,
  AvailabilityDay,
} from "@/types/scheduling";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusBadge: Record<string, { label: string; class: string }> = {
  pending: {
    label: "Pending",
    class:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    class:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  denied: {
    label: "Denied",
    class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  cancelled: {
    label: "Cancelled",
    class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

function AvailabilityGrid({
  days,
  highlight,
}: {
  days: AvailabilityDay[];
  highlight?: AvailabilityDay[];
}) {
  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {DAY_LABELS.map((label, idx) => {
        const day = days.find((d) => d.dayOfWeek === idx);
        const compare = highlight?.find((d) => d.dayOfWeek === idx);
        const changed =
          compare &&
          (compare.isAvailable !== day?.isAvailable ||
            compare.startTime !== day?.startTime ||
            compare.endTime !== day?.endTime);

        return (
          <div
            key={idx}
            className={`rounded-md border p-1.5 text-[10px] ${
              !day?.isAvailable
                ? "text-muted-foreground bg-slate-50 dark:bg-slate-900"
                : "bg-emerald-50 dark:bg-emerald-950/30"
            } ${changed ? "ring-2 ring-amber-400" : ""}`}
          >
            <div className="text-foreground font-medium">{label}</div>
            {day?.isAvailable ? (
              <div className="mt-0.5 tabular-nums">
                {day.startTime}
                <br />
                {day.endTime}
              </div>
            ) : (
              <div className="text-muted-foreground mt-0.5">Off</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AvailabilityChangesPage() {
  const [requests, setRequests] =
    useState<AvailabilityChangeRequest[]>(initialRequests);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (filterDept !== "all" && r.departmentId !== filterDept) return false;
        return true;
      }),
    [requests, filterStatus, filterDept],
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const decide = (id: string, status: "approved" | "denied") => {
    const notes = reviewNotes[id] ?? "";
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              reviewedAt: new Date().toISOString().split("T")[0],
              reviewedBy: "emp-1",
              reviewedByName: "Sarah Johnson",
              reviewNotes: notes || undefined,
            }
          : r,
      ),
    );
    setReviewingId(null);
    setReviewNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success(
      status === "approved"
        ? "Availability change approved — new default applies on the effective date."
        : "Availability change denied",
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Availability Change Requests
          </h2>
          <p className="text-muted-foreground text-sm">
            Review and approve employee requests to change their default weekly
            availability.
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="mr-1 size-3" />
            {pendingCount} pending
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filtered.map((req) => {
          const emp = scheduleEmployees.find((e) => e.id === req.employeeId);
          const dept = departments.find((d) => d.id === req.departmentId);
          const status = statusBadge[req.status] ?? statusBadge.pending;
          const isReviewing = reviewingId === req.id;

          return (
            <Card
              key={req.id}
              className={`transition-shadow hover:shadow-md ${
                req.status === "pending"
                  ? "border-amber-200 dark:border-amber-800"
                  : ""
              }`}
            >
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="ring-background size-10 shadow-sm ring-2">
                    <AvatarImage src={emp?.avatar} alt={emp?.name} />
                    <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {emp?.initials ?? "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{req.employeeName}</p>
                      <Badge className={`${status.class} text-[10px]`}>
                        {status.label}
                      </Badge>
                      {dept && (
                        <Badge variant="secondary" className="text-[10px]">
                          {dept.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Effective from{" "}
                      <span className="text-foreground font-medium">
                        {req.effectiveFrom}
                      </span>
                      {" · "}requested {req.requestedAt}
                    </p>
                    <p className="mt-1 text-sm">{req.reason}</p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Current
                    </p>
                    <AvailabilityGrid days={req.currentAvailability} />
                  </div>
                  <div className="hidden items-center justify-center lg:flex">
                    <ArrowRight className="text-muted-foreground size-5" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Proposed
                    </p>
                    <AvailabilityGrid
                      days={req.proposedAvailability}
                      highlight={req.currentAvailability}
                    />
                  </div>
                </div>

                {req.status === "pending" ? (
                  <div className="flex items-center justify-end gap-2 border-t pt-3">
                    {isReviewing && (
                      <Input
                        placeholder="Notes (optional)"
                        value={reviewNotes[req.id] ?? ""}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({
                            ...prev,
                            [req.id]: e.target.value,
                          }))
                        }
                        className="h-8 w-64 text-xs"
                      />
                    )}
                    {isReviewing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => decide(req.id, "approved")}
                        >
                          <Check className="mr-1 size-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => decide(req.id, "denied")}
                        >
                          <X className="mr-1 size-3.5" /> Deny
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReviewingId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewingId(req.id)}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                ) : (
                  req.reviewedByName && (
                    <div className="text-muted-foreground border-t pt-2 text-xs">
                      Reviewed by {req.reviewedByName} on {req.reviewedAt}
                      {req.reviewNotes ? ` — ${req.reviewNotes}` : ""}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
            <Calendar className="mb-3 size-10 opacity-30" />
            <p className="font-medium">No availability change requests</p>
            <p className="text-sm">
              When employees request availability updates, they&apos;ll appear
              here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
