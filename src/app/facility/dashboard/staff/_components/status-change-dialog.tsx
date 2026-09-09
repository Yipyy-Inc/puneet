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
import { toast } from "sonner";
import {
  useStaffHrConfig,
  useOffboardingTemplatesQuery,
  resolveOffboardingTemplatesForReason,
} from "@/lib/api/staff-onboarding";
import { useStartOffboarding } from "@/lib/api/offboarding-instances";
import {
  notifyStaffLifecycle,
  managerRecipient,
} from "@/lib/staff-notifications";
import { fullNameOf } from "./staff-shared";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useStatusReasonLabel } from "@/lib/staff/use-status-reason-label";

type StaffStatus = "active" | "inactive" | "terminated";

interface ReasonOption {
  value: string;
  label: string;
}

// Built-in reasons for return-to-active / going inactive. The VALUES only —
// the words come from `useStatusReasonLabel()`, which the profile sheet and
// the audit trail also read; this file's own spellings were the third copy,
// and the three had already drifted in English.
//
// TERMINATION reasons are absent on purpose: the facility types its own in
// Settings → Staff & HR (StaffHrConfig.terminationReasons), so they are words
// a person entered and §5q keeps those out of the locale layer.
const BUILT_IN_REASONS: Record<"active" | "inactive", string[]> = {
  active: ["rehired", "other"],
  inactive: ["vacation", "medical_leave", "other"],
};

const STATUS_META: Record<
  StaffStatus,
  { label: string; icon: React.ElementType; tone: string; dot: string }
> = {
  active: {
    // `label` is now the FALLBACK, not the render: `staff.areas.status` is
    // keyed by the status itself, and a fifth status should read as English
    // words rather than as a raw key.
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
  const { t, fill } = useStaffText("statusChange");
  const statusLabel = useStaffStatusLabel();
  const reasonLabel = useStatusReasonLabel();
  const config = useStaffHrConfig();
  // Loaded here rather than inside the reason branch: the templates are needed
  // the instant a termination reason is picked, and a query that starts then
  // would leave the picker empty for the first render after the choice.
  const { data: templates = [] } = useOffboardingTemplatesQuery();
  const { mutateAsync: startOffboarding, isPending: offboarding } =
    useStartOffboarding();

  const reasonsFor = (status: StaffStatus): ReasonOption[] =>
    status === "terminated"
      ? // french-ok: the facility's own words, typed in settings
        config.terminationReasons.map((r) => ({ value: r, label: r }))
      : BUILT_IN_REASONS[status].map((value) => ({
          value,
          label: reasonLabel(value),
        }));

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
    isDestructive && reason
      ? resolveOffboardingTemplatesForReason(templates, reason)
      : [];
  const chosenTemplateId =
    offboardingTemplateId || offboardingTemplates[0]?.id || "";

  // TERMINATION GOES THROUGH THE OFFBOARDING RPC FIRST, and the ordering is the
  // point rather than an implementation detail.
  //
  // `onConfirm` writes the status through the ordinary staff update. That alone
  // marks somebody terminated on the roster while leaving their membership
  // active — which is to say, still able to sign in and read the facility.
  // `offboard_staff()` terminates, deactivates the membership and materialises
  // the checklist in ONE transaction, so running it first means there is never
  // a moment where the roster says "gone" and the session says otherwise.
  //
  // It also means a FAILED offboarding leaves the employee untouched. Calling
  // onConfirm first and the RPC second would produce the worst state available:
  // terminated, access intact, no checklist, no error the manager can act on.
  //
  // onConfirm still runs afterwards — it carries the audit entry and the status
  // note, neither of which the RPC owns. Re-writing status=terminated there is
  // a no-op by then.
  async function handleConfirm() {
    if (!profile || !reason) return;

    if (newStatus === "terminated") {
      try {
        const instance = await startOffboarding({
          staffId: profile.id,
          reason,
          ...(chosenTemplateId ? { templateId: chosenTemplateId } : {}),
        });

        const name = fullNameOf(profile);
        const count = instance.tasks.length;
        notifyStaffLifecycle("offboarding_started", {
          inApp: {
            type: "staff_announcement",
            // french-ok: stored at compose time, read later by another manager
            title: "Offboarding started",
            // french-ok: stored, not rendered from this screen's locale
            message: `${name} has been terminated. ${count} offboarding task${
              count === 1 ? "" : "s"
            } added to your task list. View offboarding tasks →`,
            link: "/facility/dashboard/tasks?tab=offboarding",
          },
          email: {
            kind: "offboarding_complete",
            staffId: profile.id,
            staffName: name,
            to: managerRecipient().email,
            // french-ok: an email to a manager who may not read this locale
            subject: "Offboarding started",
            // french-ok: the email's body, composed here and sent onward
            body: `${name} has been terminated. ${count} offboarding task(s) added to the task list.`,
          },
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("offboardingFailed"),
        );
        // Dialog stays OPEN and nothing was written. The manager can retry or
        // cancel; closing it here would look like the termination succeeded.
        return;
      }
    }

    onConfirm(profile.id, newStatus, reason, note.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {fill("description", { name: fullNameOf(profile) })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current status */}
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t("current")}
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
            <Label>{t("newStatus")}</Label>
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
                      {statusLabel(s)}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Reason selector */}
          <div className="space-y-1.5">
            <Label>
              {t("reason")}{" "}
              <span className="text-muted-foreground font-normal">
                {t("required")}
              </span>
            </Label>
            <Select value={reason} onValueChange={(v) => setReason(v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectReason")} />
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
              <Label>{t("offboardingTemplate")}</Label>
              <Select
                value={chosenTemplateId}
                onValueChange={setOffboardingTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("chooseTemplate")} />
                </SelectTrigger>
                <SelectContent>
                  {offboardingTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {fill("templateTasks", {
                        name: tpl.name,
                        count: tpl.managerTasks.length,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note — required for "other", optional otherwise */}
          <div className="space-y-1.5">
            <Label>
              {t("note")}{" "}
              <span className="text-muted-foreground font-normal">
                {isOther ? t("required") : t("optional")}
              </span>
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isOther ? t("describeReason") : t("addContext")}
              rows={3}
            />
          </div>

          {/* Warning for termination */}
          {isDestructive && (
            <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {t("terminationWarning")}
                {chosenTemplateId
                  ? ` ${fill("terminationTasks", {
                      count:
                        offboardingTemplates.find(
                          (tpl) => tpl.id === chosenTemplateId,
                        )?.managerTasks.length ?? 0,
                    })}`
                  : ""}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={offboarding}
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            // Terminating is a network write now, and a double-click would
            // fire the RPC twice. The second is harmless — offboard_staff
            // upserts on staff_id and its task insert is `on conflict do
            // nothing` — but a disabled button says what is happening, and
            // relying on idempotence to cover a UI gap only works until the
            // next write is added.
            disabled={!canConfirm || offboarding}
            onClick={handleConfirm}
          >
            <TargetIcon className="size-4" />
            {offboarding
              ? t("startingOffboarding")
              : fill("setAs", { status: statusLabel(newStatus) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A staff status in the reader's language.
 *
 * The catalogue key IS the status, and `STATUS_META[…].label` is the fallback,
 * so a fifth status reads as English words rather than as a raw key. Three
 * places in this file render one — the picker, the confirm button and the
 * badge — and they had three copies of that fallback dance between them.
 */
function useStaffStatusLabel(): (status: StaffStatus) => string {
  const { t } = useStaffText("status");
  return (status: StaffStatus) =>
    t(status) === status ? STATUS_META[status].label : t(status);
}

export function StatusBadge({ status }: { status: StaffStatus }) {
  const statusLabel = useStaffStatusLabel();
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.tone,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {statusLabel(status)}
    </span>
  );
}
