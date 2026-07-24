"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  AlertCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Clock,
  XCircle,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { businessProfile } from "@/data/settings";
import { facilityStaff } from "@/data/facility-staff";
import { upsertStaffAvailabilityForStaff } from "@/data/staff-availability";
import {
  notifyStaffLifecycle,
  managerRecipient,
} from "@/lib/staff-notifications";
import {
  getOnboardingInstanceByToken,
  useOnboardingInstance,
  getOnboardingTemplates,
  saveOnboardingSectionByTask,
  setOnboardingAccountComplete,
  submitOnboarding,
  EMPLOYEE_TASK_LABEL,
  type EmployeeOnboardingTask,
} from "@/data/staff-onboarding";
import {
  SectionFields,
  AccountFields,
  isSectionValid,
  isAccountValid,
  availabilityFromData,
} from "./section-forms";

type Data = Record<string, unknown>;

export default function OnboardTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => setNowMs(Date.now()), []);

  const byToken = getOnboardingInstanceByToken(token);
  const instance = useOnboardingInstance(byToken?.staffId);

  // Local drafts (silent save-and-resume persists to the store on change).
  const [draft, setDraft] = useState<Record<string, Data>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  if (nowMs === null) {
    return (
      <Shell>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </Shell>
    );
  }

  if (!instance) {
    return (
      <Shell>
        <Notice
          icon={XCircle}
          tone="text-rose-600"
          title="This onboarding link is invalid"
          body="The link may have been mistyped or reissued. Ask your manager to resend your invite."
        />
      </Shell>
    );
  }

  if (new Date(instance.tokenExpiresAt).getTime() < nowMs) {
    const mgr = facilityStaff.find(
      (s) => s.primaryRole === "manager" || s.primaryRole === "owner",
    );
    return (
      <Shell>
        <Notice
          icon={Clock}
          tone="text-amber-600"
          title="This onboarding link has expired"
          body={
            mgr
              ? `Contact ${mgr.firstName} ${mgr.lastName} (${mgr.email}) to have a fresh invite sent.`
              : "Contact your manager to have a fresh invite sent."
          }
        />
      </Shell>
    );
  }

  const staff = facilityStaff.find((s) => s.id === instance.staffId);
  const template = getOnboardingTemplates().find(
    (t) => t.id === instance.templateId,
  );
  const tasks = template?.employeeTasks ?? [];

  if (instance.submittedAt) {
    return (
      <Shell>
        <Notice
          icon={PartyPopper}
          tone="text-emerald-600"
          title={`All done${staff ? `, ${staff.firstName}` : ""}!`}
          body="Your onboarding is submitted. Your manager will review it and finish setting up your account — see you on your first shift!"
        />
      </Shell>
    );
  }

  if (!staff) {
    return (
      <Shell>
        <p className="text-muted-foreground text-sm">
          We couldn’t find your record. Contact your manager.
        </p>
      </Shell>
    );
  }

  const sectionFor = (taskId: string) =>
    instance.sections.find((s) => s.taskId === taskId);
  const dataFor = (id: string): Data =>
    draft[id] ?? (id === "account" ? {} : (sectionFor(id)?.data ?? {}));
  const accountDone = Boolean(instance.account);
  const taskDone = (taskId: string) =>
    sectionFor(taskId)?.status === "complete";

  type Step = {
    id: string;
    title: string;
    required: boolean;
    done: boolean;
    task?: EmployeeOnboardingTask;
  };
  const steps: Step[] = [
    {
      id: "account",
      title: "Create your account",
      required: true,
      done: accountDone,
    },
    ...tasks.map((t) => ({
      id: t.id,
      title:
        t.type === "document_upload" || t.type === "document_sign"
          ? t.documentName || EMPLOYEE_TASK_LABEL[t.type]
          : t.type === "custom_question"
            ? t.question?.prompt || t.name
            : EMPLOYEE_TASK_LABEL[t.type],
      required: t.required,
      done: taskDone(t.id),
      task: t,
    })),
  ];

  const requiredSteps = steps.filter((s) => s.required);
  const requiredDone = requiredSteps.filter((s) => s.done).length;
  const canSubmit = requiredDone === requiredSteps.length;
  const pct = Math.round(
    (requiredDone / Math.max(1, requiredSteps.length)) * 100,
  );

  const change = (step: Step, next: Data) => {
    setDraft((d) => ({ ...d, [step.id]: next }));
    if (step.task) {
      // Silent in-progress persistence for resume (account password stays local).
      saveOnboardingSectionByTask(
        staff.id,
        step.task.id,
        step.task.type,
        next,
        "in_progress",
      );
    }
  };

  const advanceFrom = (id: string) => {
    const idx = steps.findIndex((s) => s.id === id);
    const nextIncomplete = steps.slice(idx + 1).find((s) => !s.done);
    setExpanded(nextIncomplete?.id ?? null);
  };

  const saveStep = (step: Step) => {
    const data = dataFor(step.id);
    if (step.id === "account") {
      if (!isAccountValid(data)) return;
      setOnboardingAccountComplete(staff.id);
    } else if (step.task) {
      if (step.required && !isSectionValid(step.task, data)) return;
      saveOnboardingSectionByTask(
        staff.id,
        step.task.id,
        step.task.type,
        data,
        "complete",
      );
      if (step.task.type === "availability") {
        upsertStaffAvailabilityForStaff(
          staff.id,
          `${staff.firstName} ${staff.lastName}`.trim(),
          businessProfile.businessName,
          availabilityFromData(data),
        );
      }
    }
    advanceFrom(step.id);
  };

  const stepValid = (step: Step) => {
    const data = dataFor(step.id);
    if (step.id === "account") return isAccountValid(data);
    return step.task ? isSectionValid(step.task, data) : true;
  };

  // On submit: mark submitted + notify the manager (facility feed + mock email).
  // Per-section saves above stay silent — only submit fires a notification.
  const submit = () => {
    submitOnboarding(staff.id);
    const name = `${staff.firstName} ${staff.lastName}`.trim();
    const message = `${name} has finished their onboarding. Review and activate their account.`;
    notifyStaffLifecycle("onboarding_submitted", {
      inApp: {
        type: "staff_announcement",
        title: "New staff onboarding completed",
        message,
        link: `/facility/dashboard/staff/${staff.id}`,
      },
      email: {
        kind: "review",
        staffId: staff.id,
        staffName: name,
        to: managerRecipient().email,
        subject: "New staff onboarding completed",
        body: message,
      },
    });
  };

  return (
    <Shell>
      <div className="space-y-5">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {staff.firstName}!
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {template?.welcomeMessage ||
              "Let’s get you set up before your first shift. It only takes a few minutes."}
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium">
              {requiredDone} of {requiredSteps.length} required steps done
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Section cards */}
        <div className="space-y-2.5">
          {steps.map((step) => {
            const open = expanded === step.id;
            const flagged = step.task
              ? instance.changeRequests.find(
                  (c) => c.taskId === step.task!.id && !c.resolvedAt,
                )
              : undefined;
            const StatusIcon = step.done
              ? Check
              : step.required
                ? AlertCircle
                : Circle;
            const iconCls = step.done
              ? "text-emerald-600"
              : step.required
                ? "text-amber-500"
                : "text-muted-foreground/40";
            return (
              <div key={step.id} className="overflow-hidden rounded-xl border">
                <button
                  onClick={() => setExpanded(open ? null : step.id)}
                  className="hover:bg-muted/30 flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      step.done &&
                        "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
                    )}
                  >
                    <StatusIcon className={cn("size-4", iconCls)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {step.title}
                    </span>
                    {flagged ? (
                      <span className="text-xs font-medium text-amber-600">
                        Changes requested — please update
                      </span>
                    ) : !step.required ? (
                      <span className="text-muted-foreground text-xs">
                        Optional
                      </span>
                    ) : null}
                  </span>
                  {open ? (
                    <ChevronDown className="text-muted-foreground size-4" />
                  ) : (
                    <ChevronRight className="text-muted-foreground size-4" />
                  )}
                </button>

                {open && (
                  <div className="space-y-4 border-t px-4 py-4">
                    {flagged && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        <span className="font-medium">Your manager asked:</span>{" "}
                        {flagged.note}
                      </div>
                    )}
                    {step.id === "account" ? (
                      <AccountFields
                        staff={staff}
                        value={dataFor("account")}
                        onChange={(v) =>
                          setDraft((d) => ({ ...d, account: v }))
                        }
                      />
                    ) : step.task ? (
                      <SectionFields
                        task={step.task}
                        staff={staff}
                        value={dataFor(step.id)}
                        onChange={(v) => change(step, v)}
                      />
                    ) : null}

                    <div className="flex items-center justify-end gap-2">
                      {!step.required && (
                        <Button
                          variant="ghost"
                          onClick={() => advanceFrom(step.id)}
                        >
                          Skip for now
                        </Button>
                      )}
                      <Button
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={!stepValid(step)}
                        onClick={() => saveStep(step)}
                      >
                        Save &amp; continue
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="border-t pt-4">
          <Button
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!canSubmit}
            onClick={submit}
          >
            {canSubmit
              ? "Submit onboarding"
              : `Complete ${requiredSteps.length - requiredDone} more required step${
                  requiredSteps.length - requiredDone === 1 ? "" : "s"
                }`}
          </Button>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            Your progress saves automatically — you can close this and come back
            to the same link anytime.
          </p>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 flex min-h-screen justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-emerald-600 text-sm font-bold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={businessProfile.logo}
              alt={businessProfile.businessName}
              className="size-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.textContent =
                  businessProfile.businessName.charAt(0).toUpperCase();
              }}
            />
          </div>
          <span className="font-semibold">{businessProfile.businessName}</span>
        </div>
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function Notice({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: React.ElementType;
  tone: string;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-3 py-4 text-center">
      <Icon className={cn("mx-auto size-9", tone)} />
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">{body}</p>
    </div>
  );
}
