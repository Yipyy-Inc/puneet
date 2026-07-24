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
import {
  useStaffHrConfig,
  getOffboardingTemplatesForReason,
  createOffboardingInstance,
} from "@/data/staff-onboarding";
import {
  notifyStaffLifecycle,
  managerRecipient,
} from "@/lib/staff-notifications";
import { fullNameOf } from "./staff-shared";

type StaffStatus = "active" | "inactive" | "terminated";

interface ReasonOption {
  value: string;
  label: string;
}

// Built-in reasons for return-to-active / going inactive. TERMINATION reasons
// are configured by the facility (Settings → Staff & HR → Termination Reasons,
// StaffHrConfig.terminationReasons) and resolved at render time below.
const BUILT_IN_REASONS: Record<"active" | "inactive", ReasonOption[]> = {
  active: [
    { value: "rehired", label: "Returned from leave" },
    { value: "other", label: "Other" },
  ],
  inactive: [
    { value: "vacation", label: "Vacation" },
    { value: "medical_leave", label: "Medical leave" },
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
    reason: string,
    note: string,
  ) => void;
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  profile,
  onConfirm,
}: StatusChangeDialogProps) {
  const config = useStaffHrConfig();
  const reasonsFor = (status: StaffStatus): ReasonOption[] =>
    status === "terminated"
      ? config.terminationReasons.map((r) => ({ value: r, label: r }))
      : BUILT_IN_REASONS[status];

  const currentStatus =
    profile?.status === "invited"
      ? "active"
      : (profile?.status as StaffStatus | undefined);

  const [newStatus, setNewStatus] = useState<StaffStatus>("inactive");
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [offboardingTemplateId, setOffboardingTemplateId] = useState("");

  // Reset form whenever the dialog opens for a new profile
  useEffect(() => {
    if (open && profile) {
      const defaultNext: StaffStatus =
        currentStatus === "active" ? "inactive" : "active";
      setNewStatus(defaultNext);
      setReason("");
      setNote("");
      setOffboardingTemplateId("");
    }
  }, [open, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset reason when target status changes
  useEffect(() => {
    setReason("");
    setOffboardingTemplateId("");
  }, [newStatus]);

  if (!profile) return null;

  const reasons = reasonsFor(newStatus);
  const isOther = reason.toLowerCase() === "other";
  const canConfirm = reason !== "" && (!isOther || note.trim().length > 0);

  const targetMeta = STATUS_META[newStatus];
  const TargetIcon = targetMeta.icon;
  const isDestructive = newStatus === "terminated";

  // Offboarding template(s) matching the chosen termination reason.
  const offboardingTemplates =
    isDestructive && reason ? getOffboardingTemplatesForReason(reason) : [];
  const chosenTemplateId =
    offboardingTemplateId || offboardingTemplates[0]?.id || "";

  function handleConfirm() {
    if (!profile || !reason) return;
    // Existing behaviour: revoke access + move to Former Employees.
    onConfirm(profile.id, newStatus, reason, note.trim());

    // On termination: start offboarding — materialise the template's tasks and
    // notify the manager's task list.
    if (newStatus === "terminated") {
      const inst = createOffboardingInstance(
        profile.id,
        reason,
        chosenTemplateId || undefined,
      );
      const name = fullNameOf(profile);
      notifyStaffLifecycle("offboarding_started", {
        inApp: {
          type: "staff_announcement",
          title: "Offboarding started",
          message: `${name} has been terminated. ${inst.tasks.length} offboarding task${
            inst.tasks.length === 1 ? "" : "s"
          } added to your task list. View offboarding tasks →`,
          link: "/facility/dashboard/tasks?tab=offboarding",
        },
        email: {
          kind: "offboarding_complete",
          staffId: profile.id,
          staffName: name,
          to: managerRecipient().email,
          subject: "Offboarding started",
          body: `${name} has been terminated. ${inst.tasks.length} offboarding task(s) added to the task list.`,
        },
      });
    }
    onOpenChange(false);
  }

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
            <StatusBadge
              status={
                (profile.status === "invited"
                  ? "active"
                  : profile.status) as StaffStatus
              }
            />
            {profile.statusReason && (
              <span className="text-muted-foreground ml-auto text-xs">
                {reasonsFor(currentStatus ?? "active").find(
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
              <span className="text-muted-foreground font-normal">
                (required)
              </span>
            </Label>
            <Select value={reason} onValueChange={(v) => setReason(v)}>
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

          {/* Offboarding template — pick when more than one matches the reason */}
          {isDestructive && offboardingTemplates.length > 1 && (
            <div className="space-y-1.5">
              <Label>Offboarding template</Label>
              <Select
                value={chosenTemplateId}
                onValueChange={setOffboardingTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template…" />
                </SelectTrigger>
                <SelectContent>
                  {offboardingTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.managerTasks.length} tasks
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                Terminated employees lose system access immediately and move to
                the Former Employees tab.
                {chosenTemplateId
                  ? ` ${offboardingTemplates.find((t) => t.id === chosenTemplateId)?.managerTasks.length ?? 0} offboarding tasks will be added to your task list.`
                  : ""}
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
