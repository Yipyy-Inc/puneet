"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hand,
  Zap,
  Bell,
  BellOff,
  XCircle,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  defaultExpanded?: boolean;
}

const urgencyConfig = {
  normal: {
    label: "Normal",
    icon: Clock,
    dot: "bg-blue-500",
    ring: "ring-blue-500/20",
  },
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  critical: {
    label: "Critical",
    icon: Zap,
    dot: "bg-red-500",
    ring: "ring-red-500/20",
  },
};

const statusConfig = {
  open: {
    label: "Open",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  claimed: {
    label: "Claimed",
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  expired: {
    label: "Expired",
    text: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
  },
  cancelled: {
    label: "Cancelled",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
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
  defaultExpanded = true,
}: Props) {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [expanded, setExpanded] = useState(defaultExpanded);

  const filtered = opportunities.filter((opp) => {
    if (deptFilter !== "all" && opp.departmentId !== deptFilter) return false;
    if (statusFilter !== "all" && opp.status !== statusFilter) return false;
    return true;
  });

  const sortedOpps = [...filtered].sort((a, b) => {
    const urgencyOrder = { critical: 0, urgent: 1, normal: 2 };
    const statusOrder = { open: 0, claimed: 1, expired: 2, cancelled: 3 };
    if (a.status !== b.status)
      return statusOrder[a.status] - statusOrder[b.status];
    if (a.urgency !== b.urgency)
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const openCount = opportunities.filter((o) => o.status === "open").length;

  const getDepartment = (id: string) => departments.find((d) => d.id === id);
  const getPosition = (id: string) => positions.find((p) => p.id === id);
  const getEmployee = (id: string) => employees.find((e) => e.id === id);

  const handleClaim = (oppId: string) => {
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

  const getTimeUntil = (dateStr: string, startTime: string) => {
    const shiftStart = new Date(`${dateStr}T${startTime}:00`);
    const now = new Date();
    const diffMs = shiftStart.getTime() - now.getTime();
    if (diffMs <= 0) return "Started";
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) return `${Math.ceil(diffMs / 60_000)}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.ceil(hours / 24)}d`;
  };

  return (
    <div className="bg-card rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="hover:bg-muted/50 -ml-1 flex items-center gap-2 rounded-sm px-1 py-0.5 text-left"
        >
          {expanded ? (
            <ChevronDown className="text-muted-foreground size-4" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4" />
          )}
          <Hand className="size-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold">Shift Opportunities</span>
          {openCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              {openCount} open
            </Badge>
          )}
        </button>

        <div className="flex items-center gap-1">
          {expanded && (
            <>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
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
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={onOpenNotificationSettings}
                >
                  {notificationSettings.enabled ? (
                    <Bell className="size-4 text-emerald-600" />
                  ) : (
                    <BellOff className="text-muted-foreground size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notification Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" className="h-8 text-xs" onClick={onOpenPostDialog}>
            <Plus className="mr-1 size-4" />
            Post Shift
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t">
          {sortedOpps.length === 0 ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-6 text-center text-xs">
              <Hand className="size-4 opacity-40" />
              <span>
                {statusFilter === "open"
                  ? "All shifts are covered."
                  : "No opportunities match the current filters."}
              </span>
            </div>
          ) : (
            <div className="divide-y">
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
                const dimmed = opp.status !== "open";

                return (
                  <div
                    key={opp.id}
                    className={`group hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      dimmed ? "opacity-70" : ""
                    }`}
                  >
                    {/* Urgency dot */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={`size-2.5 shrink-0 rounded-full ring-2 ${urg.dot} ${urg.ring}`}
                            aria-label={urg.label}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          <UrgIcon className="mr-1 inline size-3.5" />
                          {urg.label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Position + dept */}
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: pos?.color ?? "#94a3b8" }}
                      />
                      <span className="text-foreground truncate font-medium">
                        {pos?.name ?? "Unknown"}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        · {dept?.name ?? "—"}
                      </span>
                    </div>

                    {/* Date & time */}
                    <div className="text-muted-foreground hidden shrink-0 items-center gap-1.5 text-xs md:flex">
                      <span className="tabular-nums">
                        {formatDate(opp.date)}
                      </span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {opp.startTime}–{opp.endTime}
                      </span>
                      <Badge
                        variant="outline"
                        className="ml-1 h-5 border-dashed px-1.5 text-[11px] tabular-nums"
                      >
                        {timeUntil}
                      </Badge>
                    </div>

                    {/* Covering for */}
                    {originalEmp && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="hidden size-6 shrink-0 lg:flex">
                              <AvatarImage
                                src={originalEmp.avatar}
                                alt={originalEmp.name}
                              />
                              <AvatarFallback className="bg-slate-100 text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {originalEmp.initials}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Covering for {originalEmp.name}
                            {opp.reason ? ` — ${opp.reason}` : ""}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Status */}
                    <Badge
                      variant="secondary"
                      className={`h-5 shrink-0 px-2 text-[11px] ${stat.bg} ${stat.text}`}
                    >
                      {stat.label}
                    </Badge>

                    {/* Claimed-by avatar */}
                    {opp.status === "claimed" && claimerEmp && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex shrink-0 items-center gap-1">
                              <Avatar className="size-6">
                                <AvatarImage
                                  src={claimerEmp.avatar}
                                  alt={claimerEmp.name}
                                />
                                <AvatarFallback className="bg-blue-100 text-[9px] text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {claimerEmp.initials}
                                </AvatarFallback>
                              </Avatar>
                              {opp.approvedBy && (
                                <CheckCircle2 className="size-3.5 text-emerald-500" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Claimed by {claimerEmp.name}
                            {opp.approvedBy ? " · approved" : " · pending"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Actions */}
                    {opp.status === "open" ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => handleClaim(opp.id)}
                        >
                          <Hand className="mr-1 size-3.5" />
                          Claim
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground size-7 opacity-0 group-hover:opacity-100"
                                onClick={() => handleCancel(opp.id)}
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel opportunity</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : (
                      <span className="w-[84px] shrink-0" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
