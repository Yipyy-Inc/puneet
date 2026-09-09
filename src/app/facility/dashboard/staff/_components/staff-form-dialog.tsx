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
import {
  ROLE_PRESETS,
  buildDefaultNotifications,
  type FacilityStaffRole,
  type StaffProfile,
} from "@/types/facility-staff";
import { FACILITY_LOCATIONS } from "@/data/facility-staff";
import {
  createOnboardingInstance,
  type OnboardingTemplate,
} from "@/data/staff-onboarding";
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
  humanizeType,
  PRESET_COLORS,
} from "./staff-form-sections";
import { OnboardingInviteEmail } from "@/components/facility/staff-hr/onboarding-invite-email";
import { resolveTemplateForRole } from "@/lib/api/staff-onboarding";
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-facility-rbac";
import { notifyStaffLifecycle } from "@/lib/staff-notifications";

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: StaffProfile | null;
  onSave: (profile: StaffProfile) => void;
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
    assignedLocations: [FACILITY_LOCATIONS[0].id],
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

  // One action: create the staff record (status "invited", account locked) AND
  // send the onboarding invite (Phase 6) — no separate send step. Mock "send" =
  // a stored tokenised instance + a toast exposing the testable /onboard link.
  function createAndSend() {
    onSave(draft);
    const instance = effectiveTemplateId
      ? createOnboardingInstance(draft.id, effectiveTemplateId)
      : null;
    if (instance) {
      // Table 5 — invite email to the new hire (configurable, on by default).
      notifyStaffLifecycle("staff_invited", {
        email: {
          kind: "invite",
          staffId: draft.id,
          staffName: `${draft.firstName} ${draft.lastName}`.trim(),
          to: draft.email,
          // french-ok: addressed to the NEW HIRE, in their language, not the
          // manager's. Composed server-side is the fix; see the debt map.
          subject: "Welcome to the team — complete your onboarding",
          // french-ok: same message, same reason
          body: `Hi , welcome aboard! Complete your onboarding here: /onboard/`,
        },
      });
      toast.success(fill("sentTo", { email: draft.email }), {
        description: fill("linkIs", { link: `/onboard/${instance.token}` }),
        action: {
          label: t("copyLink"),
          onClick: () =>
            navigator.clipboard?.writeText(
              `${window.location.origin}/onboard/${instance.token}`,
            ),
        },
      });
    } else {
      toast.success(fill("createdInvited", { email: draft.email }));
    }
    onOpenChange(false);
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
                onSave(draft);
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
            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!profileValid || !effectiveTemplateId}
              onClick={createAndSend}
            >
              <Send className="size-4" />
              {t("createAndSend")}
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
  const fullName =
    `${draft.firstName} ${draft.lastName}`.trim() || t("newHire");
  const roleLabels = [draft.primaryRole, ...draft.additionalRoles]
    .map((r) => roleLabel(r))
    .join(", ");
  const locationNames =
    FACILITY_LOCATIONS.filter((l) => draft.assignedLocations.includes(l.id))
      .map((l) => l.label)
      .join(", ") || "—";
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
      // humanizeType() is a regex over an English identifier — it capitalises
      // and cannot translate. Left as-is here rather than half-fixed: the
      // employment types have their own catalogue block in settings, and
      // wiring this to it is its own change. Recorded in the debt map.
      value: humanizeType(draft.employment.employmentType),
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
