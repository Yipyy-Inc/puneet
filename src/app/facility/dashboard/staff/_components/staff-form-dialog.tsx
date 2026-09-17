"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useStaffRoleLabel } from "@/lib/settings/use-staff-role-label";
import { useEmploymentTypeLabel } from "@/lib/staff/use-employment-type-label";
import {
  ROLE_PRESETS,
  buildDefaultNotifications,
  type FacilityStaffRole,
  type StaffProfile,
} from "@/types/facility-staff";
import { useStaffLocations } from "./use-staff-locations";
import { type OnboardingTemplate } from "@/data/staff-onboarding";
import {
  STAFF_SECTIONS,
  type StaffSectionId,
  ProfileSection,
  RoleSection,
  LocationsSection,
  AccessSection,
  NotificationsSection,
  PayrollSection,
  SectionHeader,
  PRESET_COLORS,
} from "./staff-form-sections";
import { OnboardingInviteEmail } from "@/components/facility/staff-hr/onboarding-invite-email";
import { resolveTemplateForRole } from "@/lib/api/staff-onboarding";
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-facility-rbac";
import {
  readInviteOutcome,
  type StaffInviteResponse,
} from "@/lib/staff/invite-outcome";

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: StaffProfile | null;
  /**
   * Persists the draft and resolves with what the DATABASE stored — which is
   * not the draft: /api/staff mints its own `fs-*` legacy id, and the hire
   * flow below has to address an invitation to that one. Rejects when the save
   * failed, having already said so.
   */
  onSave: (profile: StaffProfile) => Promise<StaffProfile>;
  /**
   * Resolved by the PAGE, not fetched here.
   *
   * The old code called resolveTemplateForRole() during render against a
   * synchronous store. Against Postgres that becomes a fetch, and a fetch
   * inside a dialog is a flicker: the template select would mount empty and
   * fill in, on the one screen where "which checklist is this hire getting"
   * needs to be settled before anyone reads it.
   *
   * The page already holds the query while the manager reads the roster, so by
   * the time this opens the list has been in cache for as long as they have
   * been on the page. Passing it in is what removes the loading state rather
   * than hiding it.
   */
  templates: OnboardingTemplate[];
}

function emptyProfile(): StaffProfile {
  return {
    id: `fs-${Math.random().toString(36).slice(2, 9)}`,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    colorHex: PRESET_COLORS[0],
    primaryRole: "reception",
    additionalRoles: [],
    serviceAssignments: ROLE_PRESETS.reception.services,
    // Chosen on the Locations step from the facility's own branches.
    assignedLocations: [],
    showOnCalendar: true,
    calendarAccess: { mode: "all" },
    clockIn: { requireAccessCode: false },
    permissionOverrides: {},
    notifications: buildDefaultNotifications("reception"),
    payroll: {
      generalServiceCommission: 0,
      hourlyRate: 0,
      tipsRate: 0,
      overrides: [],
    },
    employment: {
      hireDate: new Date().toISOString().split("T")[0],
      employmentType: "full_time",
      notes: "",
    },
    status: "invited",
    lastActive: new Date().toISOString(),
    upcomingAppointments: 0,
    openTasks: 0,
  };
}

export function StaffFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  templates,
}: StaffFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Key on `open` too so each time the dialog opens it starts fresh (first
          tab / not reviewing) rather than persisting the previous session. */}
      <StaffFormDialogBody
        key={`${editing?.id ?? "new"}:${open}`}
        open={open}
        onOpenChange={onOpenChange}
        editing={editing}
        onSave={onSave}
        templates={templates}
      />
    </Dialog>
  );
}

function StaffFormDialogBody({
  onOpenChange,
  editing,
  onSave,
  templates,
}: StaffFormDialogProps) {
  const isHire = !editing;
  const [section, setSection] = useState<StaffSectionId>("profile");
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  /** The row the database wrote, once it has. See createAndSend. */
  const [created, setCreated] = useState<StaffProfile | null>(null);
  const { t, fill } = useStaffText("form");
  // The six section labels live in `staff-form-sections`, so they are in that
  // area rather than this one — the array is shared with the profile tabs.
  const { t: sectionText } = useStaffText("formSections");
  const [draft, setDraft] = useState<StaffProfile>(
    () => editing ?? emptyProfile(),
  );

  // Onboarding template — auto-selected by the primary role, overridable on the
  // review screen. Resolved synchronously from the prop, so changing the role
  // picker re-resolves without a round trip.
  const [templateId, setTemplateId] = useState("");
  const effectiveTemplateId =
    templateId ||
    resolveTemplateForRole(templates, draft.primaryRole)?.id ||
    templates[0]?.id ||
    "";

  // Table 5 — the Payroll (compensation) section is omitted without view_payroll
  // (admin resolves to all-access via the fallback). The HIRE flow is only
  // Profile → Role & services → Locations (+ a review screen); access /
  // notifications / payroll are edit-only tabs on the employee profile.
  const canViewPayroll = usePermission("view_payroll");
  const hireSectionIds: StaffSectionId[] = ["profile", "role", "locations"];
  const visibleSections = STAFF_SECTIONS.filter(
    (s) =>
      (!isHire || hireSectionIds.includes(s.id)) &&
      (s.id !== "payroll" || canViewPayroll),
  );

  const profileValid = Boolean(
    draft.firstName.trim() && draft.lastName.trim() && draft.email.trim(),
  );

  function update<K extends keyof StaffProfile>(
    key: K,
    value: StaffProfile[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // ── ONE ACTION, AND BOTH HALVES OF IT ARE REAL NOW ─────────────────────
  //
  // What this did before: minted an onboarding token in a browser-local object
  // (`createOnboardingInstance`), recorded a MOCK email
  // (`notifyStaffLifecycle` → `recordOnboardingEmail`), and said "Onboarding
  // email sent to dana@…" — offering a Copy link button for an `/onboard/…`
  // URL that resolves against a token HASH in Postgres and therefore opened
  // nothing. No email was sent, no membership was granted, and the new hire
  // waited for a message that did not exist while the manager had every reason
  // to believe it had gone.
  //
  // `POST /api/staff/<id>/invite` is the real one, and it has been there all
  // along: the roster's own "Remind" button calls it. It records the membership
  // grant against the hire's address, mints a token whose HASH the database
  // holds, and hands the email to the provider — reporting three outcomes,
  // because a provider that is NOT CONFIGURED is not a send, and saying so is
  // the whole reason that branch exists.
  //
  // ORDER MATTERS. The route finds the person by `legacy_id`, and /api/staff
  // mints that id itself rather than taking the draft's — so the create is
  // AWAITED, and the invitation is addressed to the row that now exists.
  async function createAndSend() {
    setSending(true);
    try {
      // A failed SEND must not create a SECOND staff row when the manager
      // presses again. The account exists and only the email did not go, which
      // is exactly what the route says; remembering it makes a retry a retry of
      // the invitation alone.
      let saved = created;
      if (!saved) {
        try {
          saved = await onSave(draft);
        } catch {
          // onSave has already said what went wrong. What matters here is that
          // no invitation gets claimed and the review screen stays open.
          return;
        }
        setCreated(saved);
      }

      const response = await fetch(
        `/api/staff/${encodeURIComponent(saved.id)}/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: effectiveTemplateId || undefined,
          }),
        },
      );
      const outcome = readInviteOutcome(
        (await response.json().catch(() => null)) as StaffInviteResponse | null,
      );

      if (outcome.kind === "failed") {
        // Left open on purpose: closing would hide the one fact that matters,
        // which is that this person has NOT been invited.
        toast.error(outcome.message ?? t("inviteFailed"));
        return;
      }

      // The link the SERVER minted, never one composed here — the database
      // holds its hash, and a locally invented token is the bug this replaces.
      const link = outcome.onboardingUrl;
      const copyLink = link
        ? {
            label: t("copyLink"),
            onClick: () => navigator.clipboard?.writeText(link),
          }
        : undefined;
      const description = link ? fill("linkIs", { link }) : undefined;

      if (outcome.kind === "sent") {
        toast.success(fill("sentTo", { email: saved.email }), {
          description,
          action: copyLink,
        });
      } else {
        // The GRANT is real and the link works — only the delivery did not
        // happen, and the manager can hand it over themselves. A warning, not
        // an error, and on no account the word "sent".
        toast.warning(t("inviteNotConfigured"), {
          description,
          action: copyLink,
          duration: 8000,
        });
      }
      onOpenChange(false);
    } catch {
      toast.error(t("inviteNetworkFailed"));
    } finally {
      setSending(false);
    }
  }

  function onRoleChange(role: FacilityStaffRole) {
    const preset = ROLE_PRESETS[role];
    setDraft((d) => {
      // A role can't be both primary and additional — drop it from additional.
      const additionalRoles = d.additionalRoles.filter((r) => r !== role);
      return {
        ...d,
        primaryRole: role,
        additionalRoles,
        serviceAssignments: Array.from(
          new Set([
            ...preset.services,
            ...additionalRoles.flatMap((r) => ROLE_PRESETS[r].services),
          ]),
        ),
        notifications: buildDefaultNotifications(role),
        permissionOverrides: {},
      };
    });
  }

  return (
    <DialogContent
      className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0"
      style={{ maxWidth: "min(64rem, 95vw)" }}
    >
      <DialogHeader className="bg-card/50 border-b px-6 py-4 backdrop-blur-sm">
        <DialogTitle className="text-lg">
          {editing
            ? t("editTitle")
            : reviewing
              ? t("reviewTitle")
              : t("addTitle")}
        </DialogTitle>
        <DialogDescription>
          {editing ? t("editHelp") : reviewing ? t("reviewHelp") : t("addHelp")}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar + mobile select — hidden on the review screen */}
        {!reviewing && (
          <>
            <nav className="bg-muted/40 hidden w-56 shrink-0 border-r p-3 md:block">
              {visibleSections.map((s) => {
                const Icon = s.icon;
                const active = section === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={cn(
                      "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-background text-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-background/60",
                    )}
                  >
                    <Icon className="size-4" />
                    {sectionText(s.key)}
                  </button>
                );
              })}
            </nav>

            <div className="md:hidden">
              <div className="p-3">
                <Select
                  value={section}
                  onValueChange={(v) => setSection(v as StaffSectionId)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {sectionText(s.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {reviewing ? (
            <ReviewScreen
              draft={draft}
              templates={templates}
              templateId={effectiveTemplateId}
              onTemplateChange={setTemplateId}
            />
          ) : (
            <>
              {section === "profile" && (
                <ProfileSection draft={draft} update={update} />
              )}
              {section === "role" && (
                <RoleSection
                  draft={draft}
                  update={update}
                  onRoleChange={onRoleChange}
                />
              )}
              {section === "locations" && (
                <LocationsSection draft={draft} update={update} />
              )}
              {section === "access" && (
                <AccessSection draft={draft} update={update} />
              )}
              {section === "notifications" && (
                <NotificationsSection draft={draft} update={update} />
              )}
              {section === "payroll" && canViewPayroll && (
                <PayrollSection draft={draft} update={update} />
              )}
            </>
          )}
        </div>
      </div>

      <DialogFooter className="border-t px-6 py-3">
        {editing ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                // Deliberately not awaited: an edit has no second step, and
                // handleSave reports its own failure. The `.catch` only keeps
                // the rejection from surfacing as an unhandled one.
                onSave(draft).catch(() => {});
                onOpenChange(false);
              }}
            >
              {t("saveChanges")}
            </Button>
          </>
        ) : reviewing ? (
          <>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setReviewing(false)}
            >
              <ArrowLeft className="size-4" />
              {t("back")}
            </Button>
            {/* Three things changed on this one button.

                §1 — there is no second action colour, and this carried a solid
                `--success` fill (`bg-emerald-600`) on the one primary CTA of
                the screen.

                §6 rule 9 — a button with no loading state double-submits,
                which here would mean two staff rows for one person.

                AND IT WAS NOT PRESSABLE. `onboarding_templates` is empty for
                every facility in the database (measured 2026-09-17), so
                `effectiveTemplateId` was "" everywhere and the last step of
                hiring anybody was greyed out product-wide with nothing saying
                why. It is not the server's rule either: /api/staff/[id]/invite
                takes `templateId` as OPTIONAL and falls back to the
                role-matched active template, then to none — no checklist, a
                7-day expiry, `template_id: null`. Hiring a person and writing
                them a checklist are two different jobs, and a facility that
                has not done the second must still be able to do the first. */}
            <Button
              className="gap-1.5"
              loading={sending}
              disabled={!profileValid}
              onClick={createAndSend}
            >
              <Send className="size-4" />
              {created ? t("retrySend") : t("createAndSend")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              className="gap-1.5"
              disabled={!profileValid}
              onClick={() => setReviewing(true)}
            >
              {t("reviewAndSend")}
              <ArrowLeft className="size-4 rotate-180" />
            </Button>
          </>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================================
// Review & send onboarding — the 4th hire step (a confirmation screen)
// ============================================================================

function ReviewScreen({
  draft,
  templates,
  templateId,
  onTemplateChange,
}: {
  draft: StaffProfile;
  templates: OnboardingTemplate[];
  templateId: string;
  onTemplateChange: (id: string) => void;
}) {
  const { t, fill } = useStaffText("form");
  const roleLabel = useStaffRoleLabel();
  const employmentTypeLabel = useEmploymentTypeLabel();
  const fullName =
    `${draft.firstName} ${draft.lastName}`.trim() || t("newHire");
  const roleLabels = [draft.primaryRole, ...draft.additionalRoles]
    .map((r) => roleLabel(r))
    .join(", ");
  const { labelsFor } = useStaffLocations();
  const locationNames = labelsFor(draft.assignedLocations).join(", ") || "—";
  const template = templates.find((t) => t.id === templateId);
  const stepCount = template?.employeeTasks.length ?? 0;

  const rows = [
    { label: t("rowName"), value: fullName },
    { label: t("rowEmail"), value: draft.email || "—" },
    { label: t("rowRoles"), value: roleLabels || "—" },
    { label: t("rowLocations"), value: locationNames },
    { label: t("rowHireDate"), value: draft.employment.hireDate || "—" },
    {
      label: t("rowEmploymentType"),
      value: employmentTypeLabel(draft.employment.employmentType),
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <SectionHeader title={t("reviewStep")} hint={t("reviewHint")} />
        <dl className="mt-3 divide-y rounded-lg border">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 px-4 py-2.5"
            >
              <dt className="text-muted-foreground text-sm">{r.label}</dt>
              <dd className="text-right text-sm font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t("onboardingTemplate")}</Label>
        {templates.length === 0 ? (
          // §5c: an empty select with a placeholder is not an empty state, it
          // is a control that looks broken. This facility has built no
          // checklists, the invitation goes out regardless, and saying so is
          // the difference between a missing feature and a stuck screen.
          <p className="text-muted-foreground text-xs">{t("noTemplates")}</p>
        ) : (
          <>
            <Select value={templateId} onValueChange={onTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectTemplate")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                    {tpl.status === "draft" ? t("draftSuffix") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-[11px]">
              {fill(stepCount === 1 ? "autoSelectedOne" : "autoSelectedOther", {
                count: stepCount,
              })}
            </p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">{t("emailPreview")}</span>
        </div>
        {/* ── ENGLISH ON PURPOSE, AND SO IS WHAT IT PREVIEWS ──────────────
            The subject and body are the actual email sent to the NEW HIRE, and
            this component knows only the MANAGER's locale — so translating
            them would post French to somebody who reads English. Third
            instance of that shape in the staff area; the fix is server-side,
            where the recipient's locale is known.

            The preview must therefore stay English too. A preview showing
            different words from the message it previews is worse than one in
            the wrong language: it is a lie about what is about to be sent. */}
        <div className="text-muted-foreground bg-muted/40 rounded-t-lg border border-b-0 px-4 py-2 text-xs">
          {/* french-ok: this previews the English email above it, verbatim */}
          <span>To:</span> {draft.email || "—"} · <span>Subject:</span> Welcome
          to the team — complete your onboarding
        </div>
        <div className="[&>div]:rounded-t-none">
          <OnboardingInviteEmail staff={draft} template={template} />
        </div>
      </div>
    </div>
  );
}
