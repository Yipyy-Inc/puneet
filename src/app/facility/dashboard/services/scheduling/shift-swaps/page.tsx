"use client";

import { useState, useMemo } from "react";
import { ArrowLeftRight, Check, X, Clock } from "lucide-react";
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
  enhancedShiftSwaps as initialSwaps,
  departments,
  scheduleEmployees,
} from "@/data/scheduling";
import type { EnhancedShiftSwap } from "@/types/scheduling";

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

export default function ShiftSwapsPage() {
  const [swaps, setSwaps] = useState<EnhancedShiftSwap[]>(initialSwaps);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filterStatus === "all"
        ? swaps
        : swaps.filter((s) => s.status === filterStatus),
    [swaps, filterStatus],
  );

  const pendingCount = swaps.filter((s) => s.status === "pending").length;

  const handleApprove = (id: string) => {
    setSwaps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "approved" as const,
              reviewedAt: new Date().toISOString().split("T")[0],
              reviewedBy: "emp-1",
              reviewNotes,
            }
          : s,
      ),
    );
    setReviewingId(null);
    setReviewNotes("");
    toast.success("Shift swap approved! Both employees have been notified.");
  };

  const handleDeny = (id: string) => {
    setSwaps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "denied" as const,
              reviewedAt: new Date().toISOString().split("T")[0],
              reviewedBy: "emp-1",
              reviewNotes,
            }
          : s,
      ),
    );
    setReviewingId(null);
    setReviewNotes("");
    toast.success("Shift swap denied");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Shift Swaps</h2>
          <p className="text-muted-foreground text-sm">
            Review and manage shift swap requests between employees
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="mr-1 size-3" />
            {pendingCount} pending
          </Badge>
        )}
      </div>

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

      <div className="space-y-3">
        {filtered.map((swap) => {
          const reqEmp = scheduleEmployees.find(
            (e) => e.id === swap.requestingEmployeeId,
          );
          const tgtEmp = scheduleEmployees.find(
            (e) => e.id === swap.targetEmployeeId,
          );
          const status = statusBadge[swap.status] || statusBadge.pending;
          const dept = departments.find((d) => d.id === swap.departmentId);

          return (
            <Card
              key={swap.id}
              className={`transition-shadow hover:shadow-md ${swap.status === "pending" ? "border-amber-200 dark:border-amber-800" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Requesting Employee */}
                    <div className="flex items-center gap-2.5">
                      <Avatar className="ring-background size-9 shadow-sm ring-2">
                        <AvatarImage src={reqEmp?.avatar} alt={reqEmp?.name} />
                        <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {reqEmp?.initials || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {swap.requestingEmployeeName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {swap.requestingShiftDate} ·{" "}
                          {swap.requestingShiftTime}
                        </p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="text-muted-foreground size-4" />
                    </div>

                    {/* Target Employee */}
                    <div className="flex items-center gap-2.5">
                      <Avatar className="ring-background size-9 shadow-sm ring-2">
                        <AvatarImage src={tgtEmp?.avatar} alt={tgtEmp?.name} />
                        <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {tgtEmp?.initials || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {swap.targetEmployeeName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {swap.targetShiftDate} · {swap.targetShiftTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={status.class + " text-[10px]"}>
                      {status.label}
                    </Badge>
                    {dept && (
                      <Badge variant="secondary" className="text-[10px]">
                        {dept.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-muted-foreground mt-2 text-xs">
                  Reason: {swap.reason}
                </p>

                {swap.status === "pending" && (
                  <div className="mt-3 flex items-center gap-2 border-t pt-3">
                    {reviewingId === swap.id ? (
                      <>
                        <Input
                          placeholder="Review notes..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="h-8 flex-1 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleApprove(swap.id)}
                        >
                          <Check className="mr-1 size-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeny(swap.id)}
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
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewingId(swap.id)}
                      >
                        Review Swap
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
            <ArrowLeftRight className="mb-3 size-10 opacity-30" />
            <p className="font-medium">No shift swap requests</p>
            <p className="text-sm">
              Swap requests from employees will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
