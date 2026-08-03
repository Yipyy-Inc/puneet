import type { FacilityNotificationType } from "@/types/facility";
import { addFacilityNotification } from "@/data/facility-notifications";
import {
  getStaffHrConfig,
  recordOnboardingEmail,
  getExpiredOnboardingInvites,
  markOnboardingInviteExpiredNotified,
  getOverdueOnboarding,
  markOnboardingDeadlineReminded,
  type StaffNotifTriggerKey,
  type OnboardingEmailKind,
} from "@/data/staff-onboarding";
import { facilityStaff } from "@/data/facility-staff";

const OFFBOARDING_LINK = "/facility/dashboard/tasks?tab=offboarding";

function staffNameFor(staffId: string): string {
  const s = facilityStaff.find((x) => x.id === staffId);
  return s ? `${s.firstName} ${s.lastName}`.trim() : "A staff member";
}

// Single-facility mock — the demo facility. Every staff notification is scoped
// to it (matches the seed feed's facilityId).
const DEMO_FACILITY_ID = 11;

export function getStaffTrigger(key: StaffNotifTriggerKey) {
  return getStaffHrConfig().notificationTriggers[key];
}

/** The manager/owner who receives manager-directed lifecycle notifications. */
export function managerRecipient(): { name: string; email: string } {
  const mgr = facilityStaff.find(
    (s) => s.primaryRole === "manager" || s.primaryRole === "owner",
  );
  return {
    name: mgr ? `${mgr.firstName} ${mgr.lastName}`.trim() : "Manager",
    email: mgr?.email ?? "",
  };
}

interface InAppParams {
  type: FacilityNotificationType;
  title: string;
  message: string;
  link?: string;
}
interface EmailParams {
  kind: OnboardingEmailKind;
  staffId: string;
  staffName: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * Fire a staff-lifecycle trigger (Table 5), respecting the per-facility config:
 * skips entirely when the trigger is disabled, and fires only the channels
 * (in-app facility feed / mock email) the facility has enabled. Central gate so
 * every trigger site is toggleable from one settings surface.
 */
export function notifyStaffLifecycle(
  key: StaffNotifTriggerKey,
  params: { inApp?: InAppParams; email?: EmailParams },
): void {
  const cfg = getStaffTrigger(key);
  if (!cfg?.enabled) return;
  if (cfg.inApp && params.inApp) {
    addFacilityNotification({
      ...params.inApp,
      category: "staff",
      facilityId: DEMO_FACILITY_ID,
    });
  }
  if (cfg.email && params.email) {
    recordOnboardingEmail(params.email);
  }
}

/**
 * Announce "Offboarding for [name] is complete" when the last task is ticked.
 *
 * TAKES THE INSTANCE, rather than looking it up. It used to read
 * `hrStore.offboardingInstances`, which nothing writes any more — so it would
 * have gone on compiling and silently never fired. The caller has the instance
 * already: every offboarding mutation resolves with the server's updated copy.
 *
 * The old once-only dedup (`completeNotifiedAt` in localStorage) is gone with
 * the store, and is not replaced, because the argument makes it unnecessary:
 * this is called from the COMPLETION success path only, and the transition into
 * "every task done" happens once per completion. Reopening and re-completing a
 * task announces again, which is the truthful thing to say — the offboarding
 * did in fact complete twice.
 */
export function maybeAnnounceOffboardingComplete(instance: {
  staffId: string;
  tasks: { completedAt?: string }[];
}): void {
  const { tasks, staffId } = instance;
  if (tasks.length === 0 || tasks.some((t) => !t.completedAt)) return;
  const name = staffNameFor(staffId);
  notifyStaffLifecycle("offboarding_complete", {
    inApp: {
      type: "staff_announcement",
      title: "Offboarding complete",
      message: `Offboarding for ${name} is complete.`,
      link: OFFBOARDING_LINK,
    },
    email: {
      kind: "offboarding_complete",
      staffId,
      staffName: name,
      to: managerRecipient().email,
      subject: "Offboarding complete",
      body: `Offboarding for ${name} is complete — all tasks are done.`,
    },
  });
}

/**
 * Per-session dedup for the sweep, keyed by `${staffId}:${trigger}:${today}`.
 *
 * The store's `lastReminderDate` / `dueTodayNotifiedDate` columns exist in
 * Postgres but nothing writes them, and the honest reason is that persisting
 * them needs a write endpoint whose only purpose is suppressing a toast. A
 * module-level Set is per-tab and resets on reload — which is what the
 * localStorage version effectively was too, only less obviously so. Stated here
 * rather than implied, because "deduped daily" and "deduped per session" are
 * different promises.
 */
const sweptThisSession = new Set<string>();

function sweepOnce(key: string): boolean {
  if (sweptThisSession.has(key)) return false;
  sweptThisSession.add(key);
  return true;
}

interface SweepableOffboarding {
  staffId: string;
  completedAt?: string;
  tasks: { required: boolean; completedAt?: string; dueDate?: string }[];
}

/**
 * Mount sweep for the offboarding polling triggers — overdue reminders and
 * due-today alerts.
 *
 * TAKES THE INSTANCES, for the same reason as above: the selectors it used to
 * call read a store nothing populates, so this had quietly become a loop over
 * an empty array.
 */
export function runOffboardingNotificationSweep(
  instances: SweepableOffboarding[],
  today: string,
): void {
  const overdueInstances = instances.filter(
    (inst) =>
      !inst.completedAt &&
      inst.tasks.some(
        (t) => t.required && !t.completedAt && !!t.dueDate && t.dueDate < today,
      ),
  );

  for (const inst of overdueInstances) {
    if (!sweepOnce(`${inst.staffId}:overdue:${today}`)) continue;
    const name = staffNameFor(inst.staffId);
    const overdue = inst.tasks.filter(
      (t) => t.required && !t.completedAt && t.dueDate && t.dueDate < today,
    ).length;
    notifyStaffLifecycle("offboarding_overdue", {
      inApp: {
        type: "task_overdue",
        title: "Offboarding tasks overdue",
        message: `${name}'s offboarding has ${overdue} overdue task${
          overdue === 1 ? "" : "s"
        }. Please resolve.`,
        link: OFFBOARDING_LINK,
      },
      email: {
        kind: "deadline",
        staffId: inst.staffId,
        staffName: name,
        to: managerRecipient().email,
        subject: "Offboarding tasks overdue",
        body: `${name}'s offboarding has ${overdue} overdue required task(s).`,
      },
    });
  }

  const dueTodayInstances = instances.filter(
    (inst) =>
      !inst.completedAt &&
      inst.tasks.some(
        (t) => t.required && !t.completedAt && t.dueDate === today,
      ),
  );

  for (const inst of dueTodayInstances) {
    if (!sweepOnce(`${inst.staffId}:due:${today}`)) continue;
    const name = staffNameFor(inst.staffId);
    const due = inst.tasks.filter(
      (t) => t.required && !t.completedAt && t.dueDate === today,
    ).length;
    notifyStaffLifecycle("offboarding_task_due", {
      inApp: {
        type: "task_assigned",
        title: "Offboarding tasks due today",
        message: `${name} has ${due} offboarding task${
          due === 1 ? "" : "s"
        } due today.`,
        link: OFFBOARDING_LINK,
      },
    });
  }
}

/**
 * Mount sweep for onboarding polling triggers — expired invite links (once) and
 * past-deadline reminders (daily). Deduped inside the store selectors.
 */
export function runOnboardingNotificationSweep(today: string): void {
  for (const inst of getExpiredOnboardingInvites()) {
    const name = staffNameFor(inst.staffId);
    notifyStaffLifecycle("onboarding_link_expired", {
      inApp: {
        type: "warning",
        title: "Onboarding link expired",
        message: `${name}'s onboarding link expired before they finished. Resend to continue.`,
        link: `/facility/dashboard/staff/${inst.staffId}`,
      },
      email: {
        kind: "link_expired",
        staffId: inst.staffId,
        staffName: name,
        to: managerRecipient().email,
        subject: "Onboarding link expired",
        body: `${name}'s onboarding link expired before completion. Resend a new invite to continue.`,
      },
    });
    markOnboardingInviteExpiredNotified(inst.staffId);
  }

  for (const inst of getOverdueOnboarding(today)) {
    const name = staffNameFor(inst.staffId);
    notifyStaffLifecycle("onboarding_overdue", {
      inApp: {
        type: "task_overdue",
        title: "Onboarding past deadline",
        message: `${name} hasn't completed onboarding by the deadline.`,
        link: `/facility/dashboard/staff/${inst.staffId}`,
      },
      email: {
        kind: "deadline",
        staffId: inst.staffId,
        staffName: name,
        to: managerRecipient().email,
        subject: "Onboarding past deadline",
        body: `${name} has not completed onboarding by the deadline. A daily reminder will continue until it's done.`,
      },
    });
    markOnboardingDeadlineReminded(inst.staffId, today);
  }
}
