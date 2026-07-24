"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  MessageSquarePlus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { StaffProfile } from "@/types/facility-staff";
import {
  useOnboardingInstance,
  useOnboardingTemplates,
  useOnboarding,
  requestOnboardingChangeByTask,
  reviewActivate,
  EMPLOYEE_TASK_LABEL,
  type EmployeeOnboardingTask,
} from "@/data/staff-onboarding";
import { fullNameOf } from "./staff-shared";
import { SubmittedData } from "./onboarding-submission-view";
import { notifyStaffLifecycle } from "@/lib/staff-notifications";

export function ReviewActivateDialog({
  profile,
  open,
  onOpenChange,
  onActivated,
}: {
  profile: StaffProfile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onActivated: (profile: StaffProfile) => void;
}) {
  const instance = useOnboardingInstance(profile?.id);
  const templates = useOnboardingTemplates();
  const checklist = useOnboarding(profile?.id);
  const [changeFor, setChangeFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirmActivate, setConfirmActivate] = useState(false);

  if (!profile) return null;

  const template = instance
    ? templates.find((t) => t.id === instance.templateId)
    : undefined;
  const tasks = template?.employeeTasks ?? [];
  const sectionFor = (taskId: string) =>
    instance?.sections.find((s) => s.taskId === taskId);
  const openChange = (taskId: string) =>
    instance?.changeRequests.find((c) => c.taskId === taskId && !c.resolvedAt);
  const incompleteMgr = (checklist ?? []).filter(
    (t) => t.requiresManager && !t.completedAt,
  );

  const submitChange = (task: EmployeeOnboardingTask) => {
    if (!note.trim()) return;
    requestOnboardingChangeByTask(profile.id, task.id, task.type, note.trim());
    notifyStaffLifecycle("onboarding_change_requested", {
      email: {
        kind: "change",
        staffId: profile.id,
        staffName: fullNameOf(profile),
        to: profile.email,
        subject: "Action needed on your onboarding",
        body: `${
          task.type === "document_upload" || task.type === "document_sign"
            ? task.documentName || EMPLOYEE_TASK_LABEL[task.type]
            : EMPLOYEE_TASK_LABEL[task.type]
        }: ${note.trim()}`,
      },
    });
    toast.success(`Change requested — sent back to ${profile.firstName}`);
    setChangeFor(null);
    setNote("");
  };

  const activate = () => {
    if (incompleteMgr.length > 0 && !confirmActivate) {
      setConfirmActivate(true);
      return;
    }
    reviewActivate(profile.id);
    notifyStaffLifecycle("account_activated", {
      email: {
        kind: "activation",
        staffId: profile.id,
        staffName: fullNameOf(profile),
        to: profile.email,
        subject: "Your account is active!",
        body: "Your account is active! You can now log in.",
      },
    });
    onActivated({ ...profile, status: "active" });
    toast.success(`Account activated — ${profile.firstName} can now log in`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Review &amp; activate — {fullNameOf(profile)}
          </DialogTitle>
          <DialogDescription>
            Everything {profile.firstName} submitted. Request a fix on any item,
            or activate their account.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {/* Account */}
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2
                className={
                  instance?.account
                    ? "size-4 text-emerald-600"
                    : "text-muted-foreground/40 size-4"
                }
              />
              Account
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {instance?.account
                ? `Password set ${new Date(instance.account.passwordSetAt).toLocaleString()}`
                : "Not set"}
            </p>
          </div>

          {tasks.map((task) => {
            const section = sectionFor(task.id);
            const flagged = openChange(task.id);
            return (
              <div key={task.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {task.type === "document_upload" ||
                    task.type === "document_sign"
                      ? task.documentName || EMPLOYEE_TASK_LABEL[task.type]
                      : task.type === "custom_question"
                        ? task.question?.prompt || task.name
                        : EMPLOYEE_TASK_LABEL[task.type]}
                  </span>
                  {flagged ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      Change requested
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() =>
                        setChangeFor(changeFor === task.id ? null : task.id)
                      }
                    >
                      <MessageSquarePlus className="size-3.5" /> Request change
                    </Button>
                  )}
                </div>

                <SubmittedData task={task} data={section?.data ?? {}} />

                {flagged && (
                  <p className="text-muted-foreground mt-2 border-l-2 border-amber-400 pl-2 text-xs italic">
                    “{flagged.note}”
                  </p>
                )}

                {changeFor === task.id && !flagged && (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      rows={2}
                      value={note}
                      placeholder="e.g. Please re-upload your grooming certificate — unreadable"
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setChangeFor(null);
                          setNote("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!note.trim()}
                        onClick={() => submitChange(task)}
                      >
                        Send to {profile.firstName}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {confirmActivate && incompleteMgr.length > 0 && (
          <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              You have {incompleteMgr.length} manager task
              {incompleteMgr.length === 1 ? "" : "s"} incomplete for{" "}
              {profile.firstName}. You can still activate — they stay in your
              task list.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={activate}
          >
            <CheckCircle2 className="size-4" />
            {confirmActivate && incompleteMgr.length > 0
              ? "Activate anyway"
              : "Activate account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
