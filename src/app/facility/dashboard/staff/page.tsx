"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Users,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ArrowUpDown,
  Filter,
  ArrowLeftRight,
  LayoutGrid,
  List,
  Mail,
  Building2,
  UserMinus,
} from "lucide-react";
import { DepartmentSettings } from "@/components/facility/DepartmentSettings";
import {
  ROLE_META,
  type FacilityStaffRole,
  type StaffProfile,
} from "@/types/facility-staff";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useStaffRoleLabel } from "@/lib/settings/use-staff-role-label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { staffQueries, useCreateStaff, useUpdateStaff } from "@/lib/api/staff";
// `upsertFacilityStaff` still writes the mock directory, which the 46 files
// that have not moved yet continue to read. Kept in step with the API write
// until they do; it becomes dead the moment the last of them migrates.
import { upsertFacilityStaff, FACILITY_LOCATIONS } from "@/data/facility-staff";
// The MANAGER's per-hire checklist, which is the one part of onboarding with no
// table behind it yet — see the note in review-activate-dialog.tsx. Everything
// the HIRE submits goes through @/lib/api/onboarding-instances.
import { initOnboarding } from "@/data/staff-onboarding";
import { instanceKeys } from "@/lib/api/onboarding-instances";
import { toast } from "sonner";
import { OnboardingProgressList } from "./_components/onboarding-progress-list";
import { StaffCard } from "./_components/staff-card";
import { StaffProfileSheet } from "./_components/staff-profile-sheet";
import { StaffFormDialog } from "./_components/staff-form-dialog";
import { useOnboardingTemplatesQuery } from "@/lib/api/staff-onboarding";
import { ResendInviteDialog } from "./_components/resend-invite-dialog";
import { ReviewActivateDialog } from "./_components/review-activate-dialog";
import { RoleAccessMatrix } from "./_components/role-matrix";
import { StatusChangeDialog } from "./_components/status-change-dialog";
import {
  RolePill,
  ServiceChip,
  StaffAvatar,
  fullNameOf,
  useRelativeTime,
  RoleIcon,
} from "./_components/staff-shared";
import {
  diffProfile,
  logStaffCreated,
  logStaffUpdated,
  logStatusChanged,
  logStaffDeleted,
  logInvitationSent,
} from "@/lib/staff-audit";
import { useFacilityRbac, usePermission } from "@/hooks/use-facility-rbac";
import { runOnboardingNotificationSweep } from "@/lib/staff-notifications";
import { PageHeader } from "@/components/ui/page-header";

const ROLE_FILTERS: (FacilityStaffRole | "all")[] = [
  "all",
  "owner",
  "manager",
  "reception",
  "groomer",
  "trainer",
  "daycare_attendant",
  "boarding_attendant",
  "sanitation",
];

// A staff member counts under a role if it's their primary OR an additional
// role — so a multi-role staffer appears in every matching filter tab.
const staffHasRole = (s: StaffProfile, role: FacilityStaffRole) =>
  s.primaryRole === role || s.additionalRoles.includes(role);

export default function FacilityStaffPage() {
  const { t, fill, locale } = useStaffText("directory");
  const roleLabel = useStaffRoleLabel();
  const { viewer } = useFacilityRbac();
  // Table 4 — editing staff (Add / Edit, incl. the form's payroll fields)
  // requires manage_staff; admin resolves to all-access via the fallback.
  const canManageStaff = usePermission("manage_staff");

  // THE ROSTER COMES FROM POSTGRES.
  //
  // This was `useState(facilityStaff)` — the mock array, edited in place. Every
  // change survived until the next reload and then quietly wasn't there, which
  // is a worse failure than an error because it looks like it worked.
  //
  // `staffQueries.profiles()` serves real rows when there is a session and the
  // same mock array when there is not. Only the first case is reachable now —
  // this page sits behind the facility gate — but the seam stays until the
  // remaining mock-backed tables move. The writes below go to /api/staff, where
  // the database decides what a caller may actually change.
  const { data: roster, isLoading } = useQuery(staffQueries.profiles());
  const staff = useMemo(() => roster ?? [], [roster]);
  const { mutateAsync: createStaff } = useCreateStaff();
  const { mutateAsync: updateStaff } = useUpdateStaff();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<FacilityStaffRole | "all">(
    "all",
  );
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "active" | "onboarding" | "on_leave" | "former"
  >("active");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [viewing, setViewing] = useState<StaffProfile | null>(null);
  const [editing, setEditing] = useState<StaffProfile | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<StaffProfile | null>(null);
  const [transferring, setTransferring] = useState<StaffProfile | null>(null);
  const [inviteTarget, setInviteTarget] = useState<StaffProfile | null>(null);
  const [reviewTarget, setReviewTarget] = useState<StaffProfile | null>(null);
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState<StaffProfile | null>(
    null,
  );

  // Onboarding notification sweep — expired invite links (once) + past-deadline
  // reminders (daily), deduped in the store. Runs when the manager opens the
  // directory (mock stand-in for a scheduled job).
  useEffect(() => {
    runOnboardingNotificationSweep(new Date().toISOString().slice(0, 10));
  }, []);

  // Tab-level base set
  const tabFiltered = useMemo(() => {
    return staff.filter((s) => {
      if (activeTab === "active") return s.status === "active";
      if (activeTab === "onboarding") return s.status === "invited";
      if (activeTab === "on_leave") return s.status === "inactive";
      return s.status === "terminated";
    });
  }, [staff, activeTab]);

  const filtered = useMemo(() => {
    return tabFiltered.filter((s) => {
      if (roleFilter !== "all" && !staffHasRole(s, roleFilter)) return false;
      if (
        locationFilter !== "all" &&
        !s.assignedLocations.includes(locationFilter)
      )
        return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = [
          s.firstName,
          s.lastName,
          s.email,
          s.phone,
          ROLE_META[s.primaryRole].label,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tabFiltered, query, roleFilter, locationFilter]);

  const stats = useMemo(() => {
    const activeStaff = staff.filter(
      (s) => s.status === "active" || s.status === "invited",
    );
    const total = activeStaff.length;
    const active = staff.filter((s) => s.status === "active").length;
    const invited = staff.filter((s) => s.status === "invited").length;
    const onLeave = staff.filter((s) => s.status === "inactive").length;
    const terminated = staff.filter((s) => s.status === "terminated").length;
    const roles = new Set(activeStaff.map((s) => s.primaryRole)).size;
    const services = new Set(activeStaff.flatMap((s) => s.serviceAssignments))
      .size;
    return { total, active, invited, onLeave, terminated, roles, services };
  }, [staff]);

  function handleSave(next: StaffProfile) {
    const actor = {
      actorId: viewer.id,
      actorName: `${viewer.firstName} ${viewer.lastName}`.trim(),
      actorRole: viewer.primaryRole,
    };
    const subject = {
      subjectId: next.id,
      subjectName: `${next.firstName} ${next.lastName}`.trim(),
    };

    const existing = staff.find((s) => s.id === next.id);

    // Fire-and-report rather than fire-and-forget. The database silently
    // reverts fields this caller may not set, so the SAVED record is what gets
    // logged and shown — logging `next` would record a raise that never
    // happened.
    void (async () => {
      try {
        const saved = existing
          ? await updateStaff({ staffId: next.id, patch: next })
          : await createStaff(next);

        if (existing) {
          const changes = diffProfile(existing, saved);
          if (changes.length > 0) logStaffUpdated(subject, actor, changes);
        } else {
          logStaffCreated(subject, actor, saved.primaryRole);
          // Auto-populate a role-appropriate onboarding checklist (spec F1).
          initOnboarding(
            saved.id,
            saved.primaryRole,
            saved.employment.hireDate,
          );
        }
        upsertFacilityStaff(saved);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save the profile.",
        );
      }
    })();
    // Write through to the shared directory so RBAC, the permission editors,
    // Preview, and the /employee portal all resolve this profile by id.
    upsertFacilityStaff(next);
    setViewing(null);
  }

  // Held HERE so it is warm long before the dialog opens — see the note on
  // StaffFormDialog's `templates` prop.
  const { data: onboardingTemplates = [] } = useOnboardingTemplatesQuery();
  const queryClient = useQueryClient();

  function openEdit(profile: StaffProfile) {
    setViewing(null);
    setEditing(profile);
    setFormOpen(true);
  }

  function openAddNew() {
    setEditing(null);
    setFormOpen(true);
  }

  // One-tap reminder — reissues the onboarding link and sends it for real.
  //
  // This used to mint a token in the mock store and write the reminder into a
  // mock outbox, so the "Reminder sent to …" toast was the only thing that
  // happened. It now posts to the same endpoint the resend dialog uses, which
  // reissues the token (invalidating the previous link, since only a hash is
  // stored) and hands the email to the provider.
  //
  // The three outcomes are reported as three different things, exactly as in
  // the dialog: a provider that is not configured is NOT a send, and saying so
  // is the whole reason that branch exists.
  async function handleRemind(p: StaffProfile) {
    try {
      const response = await fetch(`/api/staff/${p.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = (await response.json().catch(() => null)) as {
        sent?: boolean;
        reason?: string;
        message?: string;
        onboardingUrl?: string;
      } | null;

      if (result?.sent) {
        toast.success(fill("reminderSent", { email: p.email }));
      } else if (result?.reason === "not_configured") {
        toast.warning(result.message ?? t("reminderNotConfigured"), {
          description: result.onboardingUrl ? t("reminderCopyLink") : undefined,
          duration: 8000,
        });
      } else {
        toast.error(result?.message ?? t("reminderFailed"));
        return;
      }

      void queryClient.invalidateQueries({ queryKey: instanceKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      logInvitationSent(
        { subjectId: p.id, subjectName: fullNameOf(p) },
        {
          actorId: viewer.id,
          actorName: fullNameOf(viewer),
          actorRole: viewer.primaryRole,
        },
      );
    } catch {
      toast.error(t("networkFailed"));
    }
  }

  function handleStatusChange(
    profileId: string,
    newStatus: "active" | "inactive" | "terminated",
    reason: StaffProfile["statusReason"],
    note: string,
  ) {
    const target = staff.find((s) => s.id === profileId);
    if (target) {
      logStatusChanged(
        {
          subjectId: profileId,
          subjectName: `${target.firstName} ${target.lastName}`.trim(),
        },
        {
          actorId: viewer.id,
          actorName: `${viewer.firstName} ${viewer.lastName}`.trim(),
          actorRole: viewer.primaryRole,
        },
        target.status,
        newStatus,
        reason ?? "other",
        note || undefined,
      );
    }

    const statusChangedAt = new Date().toISOString();
    const patch = {
      status: newStatus,
      statusReason: reason,
      statusNote: note || undefined,
      statusChangedAt,
    };

    void (async () => {
      try {
        const saved = await updateStaff({ staffId: profileId, patch });
        if (target) upsertFacilityStaff({ ...target, ...patch });
        // Reflect the SAVED record in the open sheet, not the requested one.
        // Status is manager-only, so a caller without it gets the row back
        // unchanged — and the sheet should say so rather than show the change
        // they asked for.
        setViewing((v) => (v && v.id === profileId ? saved : v));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not change the status.",
        );
      }
    })();
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Sparkles className="size-3" /> {t("eyebrow")}
            </div>
            <PageHeader
              className="mt-1"
              title={t("title")}
              description={t("description")}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDepartmentsOpen(true)}>
              <Building2 className="size-4" /> {t("manageDepartments")}
            </Button>
            <Button variant="outline">
              <ArrowUpDown className="size-4" /> {t("sortStaff")}
            </Button>
            {canManageStaff && (
              <Button onClick={openAddNew}>
                <Plus className="size-4" /> {t("addStaff")}
              </Button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatPill
            icon={Users}
            label={t("statHeadcount")}
            value={stats.total}
            tone="bg-primary/10 text-primary"
          />
          <StatPill
            icon={UserCheck}
            label={t("statActive")}
            value={stats.active}
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatPill
            icon={Mail}
            label={t("statInvited")}
            value={stats.invited}
            tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatPill
            icon={UserMinus}
            label={t("statOnLeave")}
            value={stats.onLeave}
            tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatPill
            icon={ShieldCheck}
            label={t("statRoles")}
            value={stats.roles}
            tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>

            <Select
              value={roleFilter}
              onValueChange={(v) =>
                setRoleFilter(v as FacilityStaffRole | "all")
              }
            >
              <SelectTrigger className="min-w-40">
                <Filter className="text-muted-foreground size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "all" ? t("allRoles") : roleLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allLocations")}</SelectItem>
                {FACILITY_LOCATIONS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="bg-muted ml-auto flex rounded-md p-0.5">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                  view === "grid"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" /> {t("viewGrid")}
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                  view === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <List className="size-3.5" /> {t("viewList")}
              </button>
            </div>
          </div>

          {/* Role chip strip */}
          <div className="scrollbar-hidden -mx-1 mt-2.5 flex gap-0.5 overflow-x-auto px-1 pb-px">
            {ROLE_FILTERS.map((r) => {
              const count = tabFiltered.filter(
                (s) => r === "all" || staffHasRole(s, r),
              ).length;
              const active = roleFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {r !== "all" && (
                    <RoleIcon role={r} className="size-3 opacity-70" />
                  )}
                  {r === "all" ? t("allRoles") : roleLabel(r)}
                  <span
                    className={cn(
                      "ml-0.5 rounded-sm px-1 text-[10px] tabular-nums",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground/60",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b">
        <TabButton
          active={activeTab === "active"}
          onClick={() => {
            setActiveTab("active");
            setRoleFilter("all");
          }}
          count={staff.filter((s) => s.status === "active").length}
        >
          {t("tabActive")}
        </TabButton>
        <TabButton
          active={activeTab === "onboarding"}
          onClick={() => {
            setActiveTab("onboarding");
            setRoleFilter("all");
          }}
          count={staff.filter((s) => s.status === "invited").length}
        >
          {t("tabOnboarding")}
        </TabButton>
        <TabButton
          active={activeTab === "on_leave"}
          onClick={() => {
            setActiveTab("on_leave");
            setRoleFilter("all");
          }}
          count={stats.onLeave}
        >
          {t("tabOnLeave")}
        </TabButton>
        <TabButton
          active={activeTab === "former"}
          onClick={() => {
            setActiveTab("former");
            setRoleFilter("all");
          }}
          count={stats.terminated}
        >
          {t("tabFormer")}
        </TabButton>
      </div>

      {/* Directory */}
      {isLoading ? (
        // The roster is fetched now rather than imported, so there is a moment
        // with nothing in it. "No staff match those filters" during that moment
        // would be a claim about the facility rather than about the request.
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Users className="text-muted-foreground size-8 animate-pulse" />
            <div className="text-muted-foreground text-sm">{t("loading")}</div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Users className="text-muted-foreground size-8" />
            <div className="font-semibold">{t("emptyTitle")}</div>
            <p className="text-muted-foreground text-sm">{t("emptyBody")}</p>
          </CardContent>
        </Card>
      ) : activeTab === "onboarding" ? (
        <OnboardingProgressList
          profiles={filtered}
          onRemind={handleRemind}
          onView={setViewing}
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((profile) => (
            <StaffCard
              key={profile.id}
              profile={profile}
              onView={setViewing}
              onEdit={openEdit}
              onInvite={setInviteTarget}
              onTransfer={setTransferring}
              onDelete={setDeleting}
              onStatusChange={setStatusChanging}
              onReview={setReviewTarget}
              onRemind={handleRemind}
            />
          ))}
        </div>
      ) : (
        <StaffListView
          profiles={filtered}
          onView={setViewing}
          onEdit={openEdit}
          canEdit={canManageStaff}
        />
      )}

      {/* Role matrix */}
      <RoleAccessMatrix />

      {/* View sheet */}
      <StaffProfileSheet
        profile={viewing}
        onOpenChange={(v) => !v && setViewing(null)}
        onEdit={openEdit}
        onInvite={setInviteTarget}
        onTransfer={setTransferring}
        onUpdate={(next) => {
          void (async () => {
            try {
              const saved = await updateStaff({
                staffId: next.id,
                patch: next,
              });
              // Persist per-person role/override edits to the shared directory
              // so resolvePermissions picks them up (staffOverridesFor falls
              // back to the profile's permissionOverrides).
              upsertFacilityStaff(saved);
              setViewing(saved);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not save that change.",
              );
            }
          })();
        }}
      />

      {/* Edit/Create dialog */}
      <StaffFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        onSave={handleSave}
        templates={onboardingTemplates}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          {/* An employment record is not deleted, it is ENDED — the same call
              bookings makes, and for the same reason. There is no delete policy
              on `staff`: erasing the row would take the audit trail, the past
              appointments and the payroll history with it. The copy says what
              actually happens now that the write reaches a database rather
              than a local array. */}
          <DialogHeader>
            <DialogTitle>{t("endTitle")}</DialogTitle>
            <DialogDescription>
              {deleting && fill("endBody", { name: fullNameOf(deleting) })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) {
                  logStaffDeleted(
                    {
                      subjectId: deleting.id,
                      subjectName: fullNameOf(deleting),
                    },
                    {
                      actorId: viewer.id,
                      actorName: fullNameOf(viewer),
                      actorRole: viewer.primaryRole,
                    },
                  );
                  handleStatusChange(
                    deleting.id,
                    "terminated",
                    "other",
                    "Ended from the staff directory.",
                  );
                }
                setDeleting(null);
              }}
            >
              {t("endTitle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer confirm */}
      <Dialog
        open={!!transferring}
        onOpenChange={(v) => !v && setTransferring(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("transferTitle")}</DialogTitle>
            <DialogDescription>
              {transferring &&
                fill(
                  new Intl.PluralRules(locale).select(
                    transferring.upcomingAppointments,
                  ) === "one"
                    ? "transferBodyOne"
                    : "transferBodyOther",
                  {
                    count: transferring.upcomingAppointments,
                    name: fullNameOf(transferring),
                  },
                )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {staff
              .filter((s) => s.id !== transferring?.id && s.showOnCalendar)
              .map((s) => (
                <button
                  key={s.id}
                  className="border-border/60 hover:bg-muted flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                >
                  <StaffAvatar profile={s} size="sm" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{fullNameOf(s)}</div>
                    <div className="text-muted-foreground text-xs">
                      {roleLabel(s.primaryRole)}
                    </div>
                  </div>
                  <ArrowLeftRight className="text-muted-foreground size-4" />
                </button>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferring(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => setTransferring(null)}>
              {t("transferConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Departments management */}
      <Dialog open={departmentsOpen} onOpenChange={setDepartmentsOpen}>
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t("departmentsTitle")}</DialogTitle>
            <DialogDescription>{t("departmentsBody")}</DialogDescription>
          </DialogHeader>
          <DepartmentSettings />
        </DialogContent>
      </Dialog>

      {/* Send / resend onboarding invite — branded preview + testable link */}
      <ResendInviteDialog
        profile={inviteTarget}
        open={!!inviteTarget}
        onOpenChange={(v) => !v && setInviteTarget(null)}
        onSent={(p) =>
          logInvitationSent(
            { subjectId: p.id, subjectName: fullNameOf(p) },
            {
              actorId: viewer.id,
              actorName: fullNameOf(viewer),
              actorRole: viewer.primaryRole,
            },
          )
        }
      />

      {/* Review submitted onboarding + activate the account */}
      <ReviewActivateDialog
        profile={reviewTarget}
        open={!!reviewTarget}
        onOpenChange={(v) => !v && setReviewTarget(null)}
        onActivated={(next) => {
          void (async () => {
            try {
              const saved = await updateStaff({
                staffId: next.id,
                patch: next,
              });
              upsertFacilityStaff(saved);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not activate that account.",
              );
            }
          })();
        }}
      />

      {/* Status change dialog */}
      <StatusChangeDialog
        open={!!statusChanging}
        onOpenChange={(v) => !v && setStatusChanging(null)}
        profile={statusChanging}
        onConfirm={(profileId, newStatus, reason, note) => {
          handleStatusChange(profileId, newStatus, reason, note);
          // Move to the appropriate tab after confirming
          if (newStatus === "active") setActiveTab("active");
          else if (newStatus === "inactive") setActiveTab("on_leave");
          else setActiveTab("former");
        }}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-foreground after:bg-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "ml-2 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
          active
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="border-border/60 bg-card/80 flex items-center gap-3 rounded-xl border p-3 backdrop-blur-sm">
      <div className={cn("rounded-lg p-2", tone)}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-xl leading-none font-bold">{value}</div>
        <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
      </div>
    </div>
  );
}

function StaffListView({
  profiles,
  onView,
  onEdit,
  canEdit,
}: {
  profiles: StaffProfile[];
  onView: (p: StaffProfile) => void;
  onEdit: (p: StaffProfile) => void;
  canEdit: boolean;
}) {
  const { t } = useStaffText("directory");
  const relative = useRelativeTime();
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("colStaff")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("colRole")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("colServices")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("colLocations")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("colLastActive")}
                </th>
                <th className="px-4 py-2.5 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onView(p)}
                  className="border-border/50 hover:bg-muted/40 cursor-pointer border-t"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <StaffAvatar profile={p} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {fullNameOf(p)}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {p.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <RolePill role={p.primaryRole} />
                      {p.additionalRoles.map((r) => (
                        <RolePill key={r} role={r} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.serviceAssignments.slice(0, 3).map((s) => (
                        <ServiceChip key={s} module={s} />
                      ))}
                      {p.serviceAssignments.length > 3 && (
                        <span className="text-muted-foreground text-[10px]">
                          +{p.serviceAssignments.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {p.assignedLocations.length === FACILITY_LOCATIONS.length
                      ? t("allLocationsShort")
                      : `${p.assignedLocations.length}/${FACILITY_LOCATIONS.length}`}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {/* An empty `lastActive` is not an unknown date, it is a
                        person who has never signed in — the mapper writes ""
                        where the column is null. The formatter's em dash is
                        the right FALLBACK and the wrong ANSWER, so the screen
                        that knows what the blank means says it. */}
                    {p.lastActive ? relative(p.lastActive) : t("neverSignedIn")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(p);
                        }}
                      >
                        {t("edit")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
