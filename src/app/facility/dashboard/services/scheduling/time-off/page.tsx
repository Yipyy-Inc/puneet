"use client";

import { useState, useMemo } from "react";
import { CalendarOff, Check, X, Clock } from "lucide-react";
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
  enhancedTimeOffRequests as initialRequests,
  departments,
  scheduleEmployees,
} from "@/data/scheduling";
import type { EnhancedTimeOffRequest } from "@/types/scheduling";

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

const typeLabels: Record<string, { label: string; color: string }> = {
  vacation: { label: "Vacation", color: "#10b981" },
  sick_leave: { label: "Sick Leave", color: "#3b82f6" },
  personal: { label: "Personal", color: "#f59e0b" },
  bereavement: { label: "Bereavement", color: "#64748b" },
  parental: { label: "Parental", color: "#8b5cf6" },
  unpaid: { label: "Unpaid", color: "#ef4444" },
  other: { label: "Other", color: "#6b7280" },
};

export default function TimeOffPage() {
  const [requests, setRequests] =
    useState<EnhancedTimeOffRequest[]>(initialRequests);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterDept !== "all" && r.departmentId !== filterDept) return false;
      return true;
    });
  }, [requests, filterStatus, filterDept]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "approved" as const,
              reviewedAt: new Date().toISOString().split("T")[0],
              reviewedBy: "emp-1",
              reviewedByName: "Sarah Johnson",
              reviewNotes,
            }
          : r,
      ),
    );
    setReviewingId(null);
    setReviewNotes("");
    toast.success("Time off request approved");
  };

  const handleDeny = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "denied" as const,
              reviewedAt: new Date().toISOString().split("T")[0],
              reviewedBy: "emp-1",
              reviewedByName: "Sarah Johnson",
              reviewNotes,
            }
          : r,
      ),
    );
    setReviewingId(null);
    setReviewNotes("");
    toast.success("Time off request denied");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Time Off Requests
          </h2>
          <p className="text-muted-foreground text-sm">
            Review and manage employee time off requests
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="mr-1 size-3" />
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Filters */}
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

      {/* Request Cards */}
      <div className="space-y-3">
        {filtered.map((req) => {
          const emp = scheduleEmployees.find((e) => e.id === req.employeeId);
          const dept = departments.find((d) => d.id === req.departmentId);
          const typeInfo = typeLabels[req.type] || typeLabels.other;
          const status = statusBadge[req.status] || statusBadge.pending;
          const startDate = new Date(req.startDate).toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            },
          );
          const endDate = new Date(req.endDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const dayCount =
            Math.ceil(
              (new Date(req.endDate).getTime() -
                new Date(req.startDate).getTime()) /
                (1000 * 60 * 60 * 24),
            ) + 1;

          return (
            <Card
              key={req.id}
              className={`transition-shadow hover:shadow-md ${req.status === "pending" ? "border-amber-200 dark:border-amber-800" : ""}`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="ring-background size-10 shadow-sm ring-2">
                  <AvatarImage src={emp?.avatar} alt={emp?.name} />
                  <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {emp?.initials || "??"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{req.employeeName}</p>
                    <Badge className={status.class + " text-[10px]"}>
                      {status.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: typeInfo.color,
                        color: typeInfo.color,
                      }}
                    >
                      {typeInfo.label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {startDate} — {endDate}{" "}
                    <span className="text-muted-foreground">
                      ({dayCount} day{dayCount !== 1 ? "s" : ""})
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {req.reason}
                  </p>
                  {dept && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {dept.name}
                    </Badge>
                  )}
                </div>

                {req.status === "pending" && (
                  <div className="flex items-center gap-2">
                    {reviewingId === req.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Notes (optional)"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="h-8 w-48 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleApprove(req.id)}
                        >
                          <Check className="mr-1 size-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeny(req.id)}
                        >
                          <X className="mr-1 size-3.5" /> Deny
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReviewingId(null);
                            setReviewNotes("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
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
                )}

                {req.reviewedByName && (
                  <div className="text-muted-foreground text-right text-xs">
                    <p>Reviewed by {req.reviewedByName}</p>
                    {req.reviewedAt && <p>{req.reviewedAt}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
            <CalendarOff className="mb-3 size-10 opacity-30" />
            <p className="font-medium">No time off requests</p>
            <p className="text-sm">Requests from employees will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
