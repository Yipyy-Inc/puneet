"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";

// ── Color mapping for custom statuses ────────────────────────────────────────

const COLOR_MAP: Record<string, { dot: string; bg: string }> = {
  red: {
    dot: "bg-red-500",
    bg: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
  },
  orange: {
    dot: "bg-orange-500",
    bg: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
  },
  amber: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
  },
  yellow: {
    dot: "bg-yellow-500",
    bg: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
  },
  emerald: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
  },
  teal: {
    dot: "bg-teal-500",
    bg: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100",
  },
  blue: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
  },
  violet: {
    dot: "bg-violet-500",
    bg: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
  },
  purple: {
    dot: "bg-purple-500",
    bg: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  },
  pink: {
    dot: "bg-pink-500",
    bg: "bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100",
  },
  slate: {
    dot: "bg-slate-400",
    bg: "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100",
  },
};

// ── Status definitions ───────────────────────────────────────────────────────

export interface StatusDef {
  id: string;
  label: string;
  dot: string;
  bg: string;
  group: "flow" | "terminal" | "custom";
}

const SYSTEM_STATUSES: StatusDef[] = [
  {
    id: "estimate_sent",
    label: "Estimate Sent",
    dot: "bg-violet-500",
    bg: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
    group: "flow",
  },
  {
    id: "pending",
    label: "Pending",
    dot: "bg-amber-500",
    bg: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    group: "flow",
  },
  {
    id: "confirmed",
    label: "Confirmed",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    group: "flow",
  },
  {
    id: "checked_in",
    label: "Checked In",
    dot: "bg-teal-500",
    bg: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100",
    group: "flow",
  },
  {
    id: "in_progress",
    label: "In Progress",
    dot: "bg-orange-500",
    bg: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
    group: "flow",
  },
  {
    id: "ready",
    label: "Ready",
    dot: "bg-purple-500",
    bg: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
    group: "flow",
  },
  {
    id: "completed",
    label: "Completed",
    dot: "bg-slate-400",
    bg: "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100",
    group: "flow",
  },
  {
    id: "no_show",
    label: "No-Show",
    dot: "bg-red-500",
    bg: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    group: "terminal",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    dot: "bg-red-500",
    bg: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    group: "terminal",
  },
  {
    id: "declined",
    label: "Declined",
    dot: "bg-red-400",
    bg: "bg-red-50 border-red-200 text-red-600 hover:bg-red-100",
    group: "terminal",
  },
];

// Statuses that need confirmation before changing
const DESTRUCTIVE_STATUSES = new Set(["cancelled", "no_show", "declined"]);
const COMPLETED_STATUS = "completed";

const CONFIRM_MESSAGES: Record<string, { title: string; description: string }> =
  {
    cancelled: {
      title: "Cancel this booking?",
      description:
        "This may trigger refund rules and notify the client. This action is difficult to undo.",
    },
    no_show: {
      title: "Mark as no-show?",
      description:
        "This may apply a no-show fee and affect the client's record.",
    },
    declined: {
      title: "Mark as declined?",
      description:
        "The client will be notified that their booking was declined.",
    },
  };

export function getStatusDef(statusId: string): StatusDef {
  return (
    SYSTEM_STATUSES.find((s) => s.id === statusId) ?? {
      id: statusId,
      label: statusId
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      dot: "bg-muted-foreground",
      bg: "bg-muted border-border text-muted-foreground",
      group: "custom",
    }
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface BookingStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

export function BookingStatusDropdown({
  currentStatus,
  onStatusChange,
  disabled,
}: BookingStatusDropdownProps) {
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const current = getStatusDef(currentStatus);

  // Load custom statuses from facility config
  const facility = facilities.find((f) => f.id === 11);
  const customStatuses: StatusDef[] = (
    (facility?.bookingStatusConfig?.customStatuses as {
      id: string;
      name: string;
      color: string;
      position: number;
    }[]) ?? []
  ).map((cs) => {
    const colors = COLOR_MAP[cs.color] ?? COLOR_MAP.blue;
    return {
      id: cs.id,
      label: cs.name,
      dot: colors.dot,
      bg: colors.bg,
      group: "custom" as const,
    };
  });

  const flowStatuses = SYSTEM_STATUSES.filter((s) => s.group === "flow");
  const terminalStatuses = SYSTEM_STATUSES.filter(
    (s) => s.group === "terminal",
  );

  const handleSelect = (statusId: string) => {
    if (statusId === currentStatus) return;

    // If changing FROM completed, confirm
    if (currentStatus === COMPLETED_STATUS) {
      setConfirmTarget(statusId);
      return;
    }

    // If changing TO a destructive status, confirm
    if (DESTRUCTIVE_STATUSES.has(statusId)) {
      setConfirmTarget(statusId);
      return;
    }

    // Otherwise, change immediately
    applyChange(statusId);
  };

  const applyChange = (statusId: string) => {
    const def = getStatusDef(statusId);
    onStatusChange(statusId);
    toast.success(`Status updated to ${def.label}`);
    setConfirmTarget(null);
  };

  const confirmDef = confirmTarget ? getStatusDef(confirmTarget) : null;
  const confirmMsg = confirmTarget
    ? (CONFIRM_MESSAGES[confirmTarget] ??
      (currentStatus === COMPLETED_STATUS
        ? {
            title: "Change completed booking?",
            description:
              "This booking is completed. Are you sure you want to change the status?",
          }
        : null))
    : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 transition-colors focus:outline-none",
            current.bg,
          )}
        >
          <div className={cn("size-2 rounded-full", current.dot)} />
          <span className="text-xs font-semibold">{current.label}</span>
          <ChevronDown className="size-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px]">
          {flowStatuses.map((s) => (
            <DropdownMenuItem
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 text-xs",
                s.id === currentStatus && "bg-accent font-semibold",
              )}
            >
              <div className={cn("size-2 rounded-full", s.dot)} />
              {s.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {terminalStatuses.map((s) => (
            <DropdownMenuItem
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 text-xs",
                s.id === currentStatus && "bg-accent font-semibold",
              )}
            >
              <div className={cn("size-2 rounded-full", s.dot)} />
              {s.label}
            </DropdownMenuItem>
          ))}
          {customStatuses.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {customStatuses.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 text-xs",
                    s.id === currentStatus && "bg-accent font-semibold",
                  )}
                >
                  <div className={cn("size-2 rounded-full", s.dot)} />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation dialog for destructive changes */}
      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmMsg?.title ?? "Change status?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMsg?.description ??
                `Change status to ${confirmDef?.label}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTarget && applyChange(confirmTarget)}
              className={
                DESTRUCTIVE_STATUSES.has(confirmTarget ?? "")
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {DESTRUCTIVE_STATUSES.has(confirmTarget ?? "")
                ? "Confirm"
                : "Change Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
