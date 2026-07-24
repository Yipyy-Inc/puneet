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
import {
  ROLE_META,
  ROLE_PRESETS,
  buildDefaultNotifications,
  type FacilityStaffRole,
  type StaffProfile,
} from "@/types/facility-staff";
import { FACILITY_LOCATIONS } from "@/data/facility-staff";
import {
  useOnboardingTemplates,
  resolveTemplateForRole,
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
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-facility-rbac";
import { notifyStaffLifecycle } from "@/lib/staff-notifications";

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: StaffProfile | null;
  onSave: (profile: StaffProfile) => void;
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
      />
    </Dialog>
  );
}

function StaffFormDialogBody({
  onOpenChange,
  editing,
  onSave,
}: StaffFormDialogProps) {
  const isHire = !editing;
  const [section, setSection] = useState<StaffSectionId>("profile");
  const [reviewing, setReviewing] = useState(false);
  const [draft, setDraft] = useState<StaffProfile>(
    () => editing ?? emptyProfile(),
  );

  // Onboarding template — auto-selected by the primary role, overridable on the
  // review screen.
  const templates = useOnboardingTemplates();
  const [templateId, setTemplateId] = useState("");
  const effectiveTemplateId =
    templateId ||
    resolveTemplateForRole(draft.primaryRole)?.id ||
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
          subject: "Welcome to the team — complete your onboarding",
          body: `Hi ${draft.firstName}, welcome aboard! Complete your onboarding here: /onboard/${instance.token}`,
        },
      });
      toast.success(`Onboarding email sent to ${draft.email}`, {
        description: `Link: /onboard/${instance.token}`,
        action: {
          label: "Copy link",
          onClick: () =>
            navigator.clipboard?.writeText(
              `${window.location.origin}/onboard/${instance.token}`,
            ),
        },
      });
    } else {
      toast.success(`Staff created — ${draft.email} invited`);
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
            ? "Edit staff profile"
            : reviewing
              ? "Review & send onboarding"
              : "Add new staff"}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? "Update role, services, and per-permission access."
            : reviewing
              ? "Confirm the details, then create the record and send the onboarding email."
              : "Add the essentials. Access, notifications and payroll are set on the profile once they accept."}
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
                    {s.label}
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
                        {s.label}
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
              Cancel
            </Button>
            <Button
              onClick={() => {
                onSave(draft);
                onOpenChange(false);
              }}
            >
              Save changes
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
              Back
            </Button>
            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!profileValid || !effectiveTemplateId}
              onClick={createAndSend}
            >
              <Send className="size-4" />
              Create staff &amp; send onboarding email
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="gap-1.5"
              disabled={!profileValid}
              onClick={() => setReviewing(true)}
            >
              Review &amp; send onboarding
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
  const fullName = `${draft.firstName} ${draft.lastName}`.trim() || "New hire";
  const roleLabels = [draft.primaryRole, ...draft.additionalRoles]
    .map((r) => ROLE_META[r]?.label ?? humanizeType(r))
    .join(", ");
  const locationNames =
    FACILITY_LOCATIONS.filter((l) => draft.assignedLocations.includes(l.id))
      .map((l) => l.label)
      .join(", ") || "—";
  const template = templates.find((t) => t.id === templateId);
  const stepCount = template?.employeeTasks.length ?? 0;

  const rows = [
    { label: "Name", value: fullName },
    { label: "Email", value: draft.email || "—" },
    { label: "Role(s)", value: roleLabels || "—" },
    { label: "Locations", value: locationNames },
    { label: "Hire date", value: draft.employment.hireDate || "—" },
    {
      label: "Employment type",
      value: humanizeType(draft.employment.employmentType),
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <SectionHeader
          title="Review"
          hint="Confirm the new hire's details before sending."
        />
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
        <Label className="text-xs">Onboarding template</Label>
        <Select value={templateId} onValueChange={onTemplateChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a template…" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
                {t.status === "draft" ? " (draft)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-[11px]">
          Auto-selected by role · {stepCount} self-serve step
          {stepCount === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Onboarding email preview</span>
        </div>
        <div className="text-muted-foreground bg-muted/40 rounded-t-lg border border-b-0 px-4 py-2 text-xs">
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
