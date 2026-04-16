"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UserCheck, UserMinus, UserX, AlertTriangle } from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import { fullNameOf } from "./staff-shared";

type StaffStatus = "active" | "inactive" | "terminated";

type StatusReason =
  | "vacation"
  | "medical_leave"
  | "resigned"
  | "terminated_cause"
  | "performance"
  | "rehired"
  | "other";

interface ReasonOption {
  value: StatusReason;
  label: string;
}

const REASONS_BY_STATUS: Record<StaffStatus, ReasonOption[]> = {
  active: [
    { value: "rehired", label: "Returned from leave" },
    { value: "other", label: "Other" },
  ],
  inactive: [
    { value: "vacation", label: "Vacation" },
    { value: "medical_leave", label: "Medical leave" },
    { value: "other", label: "Other" },
  ],
  terminated: [
    { value: "resigned", label: "Resigned voluntarily" },
    { value: "terminated_cause", label: "Terminated for cause" },
    { value: "performance", label: "Performance-based termination" },
    { value: "other", label: "Other" },
  ],
};

const STATUS_META: Record<
  StaffStatus,
  { label: string; icon: React.ElementType; tone: string; dot: string }
> = {
  active: {
    label: "Active",
    icon: UserCheck,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    icon: UserMinus,
    tone: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-400",
  },
  terminated: {
    label: "Terminated",
    icon: UserX,
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: StaffProfile | null;
  onConfirm: (
    profileId: string,
    newStatus: StaffStatus,
    reason: StatusReason,
    note: string,
  ) => void;
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  profile,
  onConfirm,
}: StatusChangeDialogProps) {
  const currentStatus =
    profile?.status === "invited" ? "active" : (profile?.status as StaffStatus | undefined);

  const [newStatus, setNewStatus] = useState<StaffStatus>("inactive");
  const [reason, setReason] = useState<StatusReason | "">("");
  const [note, setNote] = useState("");

  // Reset form whenever the dialog opens for a new profile
  useEffect(() => {
    if (open && profile) {
      const defaultNext: StaffStatus =
        currentStatus === "active" ? "inactive" : "active";
      setNewStatus(defaultNext);
      setReason("");
      setNote("");
    }
  }, [open, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset reason when target status changes
  useEffect(() => {
    setReason("");
  }, [newStatus]);

  if (!profile) return null;

  const reasons = REASONS_BY_STATUS[newStatus];
  const isOther = reason === "other";
  const canConfirm =
    reason !== "" && (reason !== "other" || note.trim().length > 0);

  function handleConfirm() {
    if (!profile || !reason) return;
    onConfirm(profile.id, newStatus, reason as StatusReason, note.trim());
    onOpenChange(false);
  }

  const targetMeta = STATUS_META[newStatus];
  const TargetIcon = targetMeta.icon;
  const isDestructive = newStatus === "terminated";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change employee status</DialogTitle>
          <DialogDescription>
            Update {fullNameOf(profile)}&apos;s employment status. A reason is
            required so the record stays auditable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current status */}
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <span className="text-muted-foreground text-xs font-medium">
              Current
            </span>
            <StatusBadge status={(profile.status === "invited" ? "active" : profile.status) as StaffStatus} />
            {profile.statusReason && (
              <span className="text-muted-foreground ml-auto text-xs">
                {REASONS_BY_STATUS[currentStatus ?? "active"].find(
                  (r) => r.value === profile.statusReason,
                )?.label ?? profile.statusReason}
              </span>
            )}
          </div>

          {/* New status selector */}
          <div className="space-y-1.5">
            <Label>New status</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["active", "inactive", "terminated"] as StaffStatus[]).map(
                (s) => {
                  const meta = STATUS_META[s];
                  const Icon = meta.icon;
                  const isCurrent =
                    s === currentStatus ||
                    (s === "active" && profile.status === "invited");
                  return (
                    <button
                      key={s}
                      disabled={isCurrent}
                      onClick={() => setNewStatus(s)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                        newStatus === s && !isCurrent
                          ? cn("border-primary/50", meta.tone)
                          : isCurrent
                            ? "border-border/40 text-muted-foreground/50 cursor-not-allowed opacity-50"
                            : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/50",
                      )}
                    >
                      <Icon className="size-4" />
                      {meta.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Reason selector */}
          <div className="space-y-1.5">
            <Label>
              Reason{" "}
              <span className="text-muted-foreground font-normal">(required)</span>
            </Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as StatusReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note — required for "other", optional otherwise */}
          <div className="space-y-1.5">
            <Label>
              Note{" "}
              <span className="text-muted-foreground font-normal">
                {isOther ? "(required)" : "(optional)"}
              </span>
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isOther
                  ? "Describe the reason…"
                  : "Add any additional context for the record…"
              }
              rows={3}
            />
          </div>

          {/* Warning for termination */}
          {isDestructive && (
            <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Terminated employees lose system access immediately. Their
                profile moves to the Former Employees tab.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            <TargetIcon className="size-4" />
            Set as {targetMeta.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StatusBadge({ status }: { status: StaffStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.tone,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
