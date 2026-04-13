"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Hand,
  MapPin,
  Settings2,
  Zap,
  Bell,
  BellOff,
  XCircle,
  User,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type {
  ShiftOpportunity,
  ShiftOpportunityNotificationSettings,
  Department,
  Position,
  ScheduleEmployee,
} from "@/types/scheduling";

interface Props {
  opportunities: ShiftOpportunity[];
  notificationSettings: ShiftOpportunityNotificationSettings;
  departments: Department[];
  positions: Position[];
  employees: ScheduleEmployee[];
  onOpportunitiesChange: (opps: ShiftOpportunity[]) => void;
  onOpenPostDialog: () => void;
  onOpenNotificationSettings: () => void;
}

const urgencyConfig = {
  normal: {
    label: "Normal",
    icon: Clock,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  critical: {
    label: "Critical",
    icon: Zap,
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
};

const statusConfig = {
  open: {
    label: "Open",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  claimed: {
    label: "Claimed",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  expired: {
    label: "Expired",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-500 dark:text-slate-400",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
};

export function ShiftOpportunityBoard({
  opportunities,
  notificationSettings,
  departments,
  positions,
  employees,
  onOpportunitiesChange,
  onOpenPostDialog,
  onOpenNotificationSettings,
}: Props) {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [expanded, setExpanded] = useState(true);

  const filtered = opportunities.filter((opp) => {
    if (deptFilter !== "all" && opp.departmentId !== deptFilter) return false;
    if (statusFilter !== "all" && opp.status !== statusFilter) return false;
    return true;
  });

  const sortedOpps = [...filtered].sort((a, b) => {
    const urgencyOrder = { critical: 0, urgent: 1, normal: 2 };
    const statusOrder = { open: 0, claimed: 1, expired: 2, cancelled: 3 };
    if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
    if (a.urgency !== b.urgency) return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const openCount = opportunities.filter((o) => o.status === "open").length;

  const getDepartment = (id: string) => departments.find((d) => d.id === id);
  const getPosition = (id: string) => positions.find((p) => p.id === id);
  const getEmployee = (id: string) => employees.find((e) => e.id === id);

  const handleClaim = (oppId: string) => {
    // In real app, this would be the logged-in employee
    // For demo, we pick Lisa Rodriguez (emp-5) as the claimer
    const claimer = getEmployee("emp-5");
    if (!claimer) return;

    onOpportunitiesChange(
      opportunities.map((o) =>
        o.id === oppId
          ? {
              ...o,
              status: "claimed" as const,
              claimedBy: claimer.id,
              claimedByName: claimer.name,
              claimedAt: new Date().toISOString(),
            }
          : o,
      ),
    );
    toast.success("Shift claimed! Pending manager approval.", {
      description: `${claimer.name} claimed the shift. Manager will be notified.`,
    });
  };

  const handleCancel = (oppId: string) => {
    onOpportunitiesChange(
      opportunities.map((o) =>
        o.id === oppId ? { ...o, status: "cancelled" as const } : o,
      ),
    );
    toast.success("Shift opportunity cancelled");
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeRange = (start: string, end: string) =>
    `${start} – ${end}`;

  const getTimeUntil = (dateStr: string, startTime: string) => {
    const shiftStart = new Date(`${dateStr}T${startTime}:00`);
    const now = new Date();
    const diffMs = shiftStart.getTime() - now.getTime();
    if (diffMs <= 0) return "Started";
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) return `${Math.ceil(diffMs / 60_000)}m away`;
    if (hours < 24) return `${hours}h away`;
    return `${Math.ceil(hours / 24)}d away`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Hand className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold">Shift Opportunities</span>
            {openCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5"
              >
                {openCount} open
              </Badge>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={onOpenNotificationSettings}
                >
                  {notificationSettings.enabled ? (
                    <Bell className="size-3.5 text-emerald-600" />
                  ) : (
                    <BellOff className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notification Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" variant="outline" onClick={onOpenPostDialog}>
            <Zap className="mr-1.5 size-3.5" />
            Post Shift
          </Button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opportunity cards */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sortedOpps.map((opp) => {
              const dept = getDepartment(opp.departmentId);
              const pos = getPosition(opp.positionId);
              const urg = urgencyConfig[opp.urgency];
              const stat = statusConfig[opp.status];
              const UrgIcon = urg.icon;
              const originalEmp = opp.originalEmployeeId
                ? getEmployee(opp.originalEmployeeId)
                : null;
              const claimerEmp = opp.claimedBy
                ? getEmployee(opp.claimedBy)
                : null;
              const timeUntil = getTimeUntil(opp.date, opp.startTime);

              return (
                <Card
                  key={opp.id}
                  className={`group relative overflow-hidden transition-shadow hover:shadow-md ${
                    opp.status !== "open" ? "opacity-70" : ""
                  }`}
                >
                  {/* Urgency accent bar */}
                  <div
                    className={`absolute left-0 top-0 h-full w-1 ${urg.dot}`}
                  />

                  <CardContent className="p-3 pl-4">
                    {/* Top row: position + urgency + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: pos?.color ?? "#94a3b8" }}
                          />
                          <p className="truncate text-sm font-semibold">
                            {pos?.name ?? "Unknown Position"}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {dept?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${urg.bg} ${urg.text} border ${urg.border}`}
                        >
                          <UrgIcon className="mr-0.5 size-2.5" />
                          {urg.label}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${stat.bg} ${stat.text}`}
                        >
                          {stat.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Date & time */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(opp.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTimeRange(opp.startTime, opp.endTime)}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-dashed"
                      >
                        {timeUntil}
                      </Badge>
                    </div>

                    {/* Reason */}
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {opp.reason}
                    </p>

                    {/* Original employee */}
                    {originalEmp && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="size-3 shrink-0" />
                        <span>
                          Covering for{" "}
                          <span className="font-medium text-foreground">
                            {originalEmp.name}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Claimed by */}
                    {opp.status === "claimed" && claimerEmp && (
                      <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/20 p-1.5">
                        <Avatar className="size-5">
                          <AvatarImage
                            src={claimerEmp.avatar}
                            alt={claimerEmp.name}
                          />
                          <AvatarFallback className="text-[8px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {claimerEmp.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                          Claimed by {claimerEmp.name}
                        </span>
                        {opp.approvedBy && (
                          <CheckCircle2 className="ml-auto size-3.5 text-emerald-500" />
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {opp.status === "open" && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-7 flex-1 text-xs"
                          onClick={() => handleClaim(opp.id)}
                        >
                          <Hand className="mr-1 size-3" />
                          Claim Shift
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => handleCancel(opp.id)}
                        >
                          <XCircle className="mr-1 size-3" />
                          Cancel
                        </Button>
                      </div>
                    )}

                    {/* Posted by footer */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        Posted by {opp.postedByName}
                      </span>
                      <span>
                        {new Date(opp.postedAt).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {sortedOpps.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
              <Hand className="mb-2 size-8 opacity-30" />
              <p className="text-sm font-medium">No shift opportunities</p>
              <p className="text-xs">
                {statusFilter === "open"
                  ? "All shifts are covered. Post an opportunity when a shift needs coverage."
                  : "No opportunities match the current filters."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
