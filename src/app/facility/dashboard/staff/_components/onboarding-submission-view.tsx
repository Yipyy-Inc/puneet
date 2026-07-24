"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  FileText,
  Lock,
  MessageSquarePlus,
  ShieldCheck,
  Inbox,
} from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import {
  useOnboardingInstance,
  useOnboardingTemplates,
  requestOnboardingChangeByTask,
  EMPLOYEE_TASK_LABEL,
  type EmployeeOnboardingTask,
} from "@/data/staff-onboarding";
import { fullNameOf } from "./staff-shared";
import { notifyStaffLifecycle } from "@/lib/staff-notifications";

type Data = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const mask = (v: string, keep = 3) =>
  v.length > keep ? `•••• ${v.slice(-keep)}` : v ? "••••" : "—";

const DAY_LABEL: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

/** Read-only render of one submitted onboarding section's data. Shared by the
 *  Review & Activate dialog and the profile Onboarding tab. */
export function SubmittedData({
  task,
  data,
}: {
  task: EmployeeOnboardingTask;
  data: Data;
}) {
  const v = (k: string) => str(data[k]);
  const file = data.file as
    | { name: string; url: string; uploadedAt?: string }
    | undefined;

  switch (task.type) {
    case "personal_info":
      return (
        <dl className="text-sm">
          <Row label="Legal name" value={v("legalName")} />
          <Row label="Date of birth" value={v("dateOfBirth")} />
          <Row label="SIN / SSN" value={mask(v("taxId"))} />
        </dl>
      );
    case "contact_details":
      return (
        <dl className="text-sm">
          <Row label="Phone" value={v("phone")} />
          <Row label="Address" value={v("address")} />
        </dl>
      );
    case "emergency_contact":
      return (
        <dl className="text-sm">
          <Row label="Name" value={v("name")} />
          <Row label="Relationship" value={v("relationship")} />
          <Row label="Phone" value={v("phone")} />
        </dl>
      );
    case "banking":
      return (
        <dl className="text-sm">
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
            <Lock className="size-3" /> Masked — payroll only
          </div>
          <Row label="Institution" value={mask(v("institution"), 2)} />
          <Row label="Transit" value={mask(v("transit"), 2)} />
          <Row label="Account" value={mask(v("account"))} />
          {file?.name && (
            <Row
              label="Void cheque"
              value={
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1"
                >
                  <FileText className="size-3.5" /> {file.name}
                </a>
              }
            />
          )}
        </dl>
      );
    case "document_upload":
      return file?.name ? (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1.5 text-sm"
        >
          <FileText className="size-4" /> {file.name}
          {file.uploadedAt && (
            <span className="text-muted-foreground text-xs">
              · {new Date(file.uploadedAt).toLocaleDateString()}
            </span>
          )}
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">Not uploaded</span>
      );
    case "document_sign":
      return v("signature") ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="size-4" /> Signed by {v("signature")}
          {data.signedAt ? (
            <span className="text-muted-foreground text-xs">
              · {new Date(str(data.signedAt)).toLocaleString()}
            </span>
          ) : null}
        </p>
      ) : (
        <span className="text-muted-foreground text-sm">Not signed</span>
      );
    case "availability": {
      const days = Array.isArray(data.days)
        ? (data.days as {
            dayOfWeek: number;
            isAvailable: boolean;
            startTime: string;
            endTime: string;
          }[])
        : [];
      const on = days.filter((d) => d.isAvailable);
      return on.length ? (
        <ul className="text-sm">
          {on.map((d) => (
            <li key={d.dayOfWeek} className="flex justify-between">
              <span className="text-muted-foreground">
                {DAY_LABEL[d.dayOfWeek]}
              </span>
              <span className="font-medium">
                {d.startTime}–{d.endTime}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-muted-foreground text-sm">No days set</span>
      );
    }
    case "uniform_prefs":
      return (
        <dl className="text-sm">
          <Row label="Shirt size" value={v("shirtSize")} />
          {v("notes") && <Row label="Notes" value={v("notes")} />}
        </dl>
      );
    case "custom_question":
      return file?.name ? (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1.5 text-sm"
        >
          <FileText className="size-4" /> {file.name}
        </a>
      ) : (
        <p className="text-sm">{v("answer") || "—"}</p>
      );
    default:
      return null;
  }
}

/**
 * Read-only review of everything the employee submitted through the self-serve
 * onboarding flow — account, submitted docs, signed policies (with timestamps),
 * masked banking, custom answers. Manager can request a re-upload / change on
 * any item (sends it back to the employee's onboarding link).
 */
export function OnboardingSubmissionReview({
  profile,
}: {
  profile: StaffProfile;
}) {
  const instance = useOnboardingInstance(profile.id);
  const templates = useOnboardingTemplates();
  const [changeFor, setChangeFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!instance) {
    return (
      <div className="border-border/60 text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center text-sm">
        <Inbox className="size-6" />
        No self-serve submission yet. It appears here once {profile.firstName}{" "}
        starts their onboarding link.
      </div>
    );
  }

  const template = templates.find((t) => t.id === instance.templateId);
  const tasks = template?.employeeTasks ?? [];
  const sectionFor = (taskId: string) =>
    instance.sections.find((s) => s.taskId === taskId);
  const openChange = (taskId: string) =>
    instance.changeRequests.find((c) => c.taskId === taskId && !c.resolvedAt);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Self-serve submission</h3>
        {instance.submittedAt ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" /> Submitted{" "}
            {new Date(instance.submittedAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground text-[11px]">In progress</span>
        )}
      </div>

      {/* Account */}
      <div className="rounded-lg border p-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2
            className={
              instance.account
                ? "size-4 text-emerald-600"
                : "text-muted-foreground/40 size-4"
            }
          />
          Account
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {instance.account
            ? `Password set ${new Date(instance.account.passwordSetAt).toLocaleString()}`
            : "Not set"}
        </p>
      </div>

      {tasks.map((task) => {
        const section = sectionFor(task.id);
        const flagged = openChange(task.id);
        const label =
          task.type === "document_upload" || task.type === "document_sign"
            ? task.documentName || EMPLOYEE_TASK_LABEL[task.type]
            : task.type === "custom_question"
              ? task.question?.prompt || task.name
              : EMPLOYEE_TASK_LABEL[task.type];
        return (
          <div key={task.id} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{label}</span>
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
                  <MessageSquarePlus className="size-3.5" /> Request re-upload
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
  );
}
