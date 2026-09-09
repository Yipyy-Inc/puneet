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
  useRequestChange,
} from "@/lib/api/onboarding-instances";
import { useOnboardingTemplates } from "@/lib/api/staff-onboarding";
import {
  EMPLOYEE_TASK_LABEL,
  type EmployeeOnboardingTask,
} from "@/data/staff-onboarding";
import { fullNameOf } from "./staff-shared";
import { notifyStaffLifecycle } from "@/lib/staff-notifications";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  formatDateShort,
  formatDateLong,
  formatTime,
  formatWeekday,
} from "@/lib/i18n/format";

type Data = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const mask = (v: string, keep = 3) =>
  v.length > keep ? `•••• ${v.slice(-keep)}` : v ? "••••" : "—";

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
  const { t, fill, locale } = useStaffText("onboardingReview");
  const v = (k: string) => str(data[k]);
  const file = data.file as
    | { name: string; url: string; uploadedAt?: string }
    | undefined;

  switch (task.type) {
    case "personal_info":
      return (
        <dl className="text-sm">
          <Row label={t("legalName")} value={v("legalName")} />
          <Row label={t("dateOfBirth")} value={v("dateOfBirth")} />
          <Row label={t("taxId")} value={mask(v("taxId"))} />
        </dl>
      );
    case "contact_details":
      return (
        <dl className="text-sm">
          <Row label={t("phone")} value={v("phone")} />
          <Row label={t("address")} value={v("address")} />
        </dl>
      );
    case "emergency_contact":
      return (
        <dl className="text-sm">
          <Row label={t("name")} value={v("name")} />
          <Row label={t("relationship")} value={v("relationship")} />
          <Row label={t("phone")} value={v("phone")} />
        </dl>
      );
    case "banking":
      return (
        <dl className="text-sm">
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
            <Lock className="size-3" /> {t("maskedPayrollOnly")}
          </div>
          <Row label={t("institution")} value={mask(v("institution"), 2)} />
          <Row label={t("transit")} value={mask(v("transit"), 2)} />
          <Row label={t("account")} value={mask(v("account"))} />
          {file?.name && (
            <Row
              label={t("voidCheque")}
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
              · {formatDateShort(new Date(file.uploadedAt), locale)}
            </span>
          )}
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">
          {t("notUploaded")}
        </span>
      );
    case "document_sign":
      return v("signature") ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="size-4" />{" "}
          {fill("signedBy", { who: v("signature") })}
          {data.signedAt ? (
            <span className="text-muted-foreground text-xs">
              · {formatDateLong(new Date(str(data.signedAt)), locale)}{" "}
              {formatTime(new Date(str(data.signedAt)), locale)}
            </span>
          ) : null}
        </p>
      ) : (
        <span className="text-muted-foreground text-sm">{t("notSigned")}</span>
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
                {formatWeekday(d.dayOfWeek, locale)}
              </span>
              <span className="font-medium">
                {d.startTime}–{d.endTime}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-muted-foreground text-sm">{t("noDaysSet")}</span>
      );
    }
    case "uniform_prefs":
      return (
        <dl className="text-sm">
          <Row label={t("shirtSize")} value={v("shirtSize")} />
          {v("notes") && <Row label={t("notes")} value={v("notes")} />}
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
  const { t, fill, locale } = useStaffText("onboardingReview");
  const instance = useOnboardingInstance(profile.id);
  const templates = useOnboardingTemplates();
  const { mutate: requestChange } = useRequestChange();
  const [changeFor, setChangeFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!instance) {
    return (
      <div className="border-border/60 text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center text-sm">
        <Inbox className="size-6" />
        {fill("noSubmission", { name: profile.firstName })}
      </div>
    );
  }

  const template = templates.find((t) => t.id === instance.templateId);
  const tasks = template?.employeeTasks ?? [];
  const sectionFor = (taskId: string) =>
    instance.sections.find((s) => s.taskId === taskId);
  const openChange = (taskId: string) =>
    instance.changeRequests.find((c) => c.taskId === taskId && !c.resolvedAt);

  // Notification after the write lands, not beside it — see the same note in
  // review-activate-dialog.tsx.
  const submitChange = (task: EmployeeOnboardingTask) => {
    if (!note.trim()) return;
    const message = note.trim();
    requestChange(
      {
        staffId: profile.id,
        taskId: task.id,
        sectionType: task.type,
        note: message,
      },
      {
        onSuccess: () => {
          notifyStaffLifecycle("onboarding_change_requested", {
            email: {
              kind: "change",
              staffId: profile.id,
              staffName: fullNameOf(profile),
              to: profile.email,
              // french-ok: composed here, SENT to the employee — this
              // screen's locale is the manager's, not the reader's. Server-side
              // composition in the recipient's language is the real fix and is
              // recorded in the debt map.
              subject: "Action needed on your onboarding",
              body: `${
                task.type === "document_upload" || task.type === "document_sign"
                  ? task.documentName || EMPLOYEE_TASK_LABEL[task.type]
                  : EMPLOYEE_TASK_LABEL[task.type]
              }: ${message}`,
            },
          });
          toast.success(fill("changeSent", { name: profile.firstName }));
          setChangeFor(null);
          setNote("");
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : t("changeFailed"),
          ),
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("heading")}</h3>
        {instance.submittedAt ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />{" "}
            {fill("submittedOn", {
              date: formatDateShort(new Date(instance.submittedAt), locale),
            })}
          </span>
        ) : (
          <span className="text-muted-foreground text-[11px]">
            {t("inProgress")}
          </span>
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
          {t("accountHeading")}
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {instance.account
            ? fill("passwordSet", {
                when: formatDateLong(
                  new Date(instance.account.passwordSetAt),
                  locale,
                ),
              })
            : t("notSet")}
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
                  {t("changeRequested")}
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
                  <MessageSquarePlus className="size-3.5" />{" "}
                  {t("requestReupload")}
                </Button>
              )}
            </div>

            <SubmittedData task={task} data={section?.data ?? {}} />

            {flagged && (
              <p className="text-muted-foreground mt-2 rounded-md border border-amber-400 px-2 py-1 text-xs italic">
                “{flagged.note}”
              </p>
            )}

            {changeFor === task.id && !flagged && (
              <div className="mt-2 space-y-2">
                <Textarea
                  rows={2}
                  value={note}
                  placeholder={t("notePlaceholder")}
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
                    {t("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!note.trim()}
                    onClick={() => submitChange(task)}
                  >
                    {fill("sendTo", { name: profile.firstName })}
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
