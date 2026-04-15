"use client";

import { useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Phone,
  CalendarDays,
  MapPin,
  Clock,
  Bell,
  Wallet,
  BadgeCheck,
  ArrowLeftRight,
  UserPlus,
  Pencil,
  LockKeyhole,
  FileSignature,
  FileText,
  FileCheck2,
  Fingerprint,
  Download,
  ChevronRight,
} from "lucide-react";
import {
  ROLE_META,
  NOTIFICATION_EVENT_META,
  type StaffProfile,
} from "@/types/facility-staff";
import { AccessTab } from "./access-tab";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { FACILITY_LOCATIONS } from "@/data/facility-staff";
import {
  employeeDocumentSubmissions,
  employeeDocumentTemplates,
} from "@/data/scheduling";
import type {
  EmployeeDocumentSubmission,
  EmployeeDocumentTemplate,
} from "@/types/scheduling";
import {
  RolePill,
  ServiceChip,
  StaffAvatar,
  fullNameOf,
  formatRelative,
} from "./staff-shared";

interface StaffProfileSheetProps {
  profile: StaffProfile | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (p: StaffProfile) => void;
  onInvite: (p: StaffProfile) => void;
  onTransfer: (p: StaffProfile) => void;
  /** Called when the profile is updated inline (e.g. from the Access tab). */
  onUpdate?: (p: StaffProfile) => void;
}

export function StaffProfileSheet({
  profile,
  onOpenChange,
  onEdit,
  onInvite,
  onTransfer,
  onUpdate,
}: StaffProfileSheetProps) {
  const { can } = useFacilityRbac();
  const canSeeAccess = can("view_staff_permissions");
  const canSeePayroll = can("view_payroll");
  if (!profile) return null;

  return (
    <Dialog open={!!profile} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="backdrop-blur-sm" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-50 flex flex-col",
            "w-full max-w-2xl max-h-[90vh]",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-xl border shadow-2xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "duration-200",
          )}
        >
          <Header profile={profile} />

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 pb-6">
              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start bg-transparent p-0">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  {canSeeAccess && (
                    <TabsTrigger value="access">Access</TabsTrigger>
                  )}
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  {canSeePayroll && (
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <OverviewTab profile={profile} />
                </TabsContent>
                {canSeeAccess && (
                  <TabsContent value="access" className="mt-4 space-y-4">
                    <AccessTab profile={profile} onUpdate={onUpdate} />
                  </TabsContent>
                )}
                <TabsContent value="services" className="mt-4 space-y-4">
                  <ServicesTab profile={profile} />
                </TabsContent>
                <TabsContent value="documents" className="mt-4 space-y-4">
                  <DocumentsTab profile={profile} />
                </TabsContent>
                <TabsContent value="notifications" className="mt-4 space-y-4">
                  <NotificationsTab profile={profile} />
                </TabsContent>
                {canSeePayroll && (
                  <TabsContent value="payroll" className="mt-4 space-y-4">
                    <PayrollTab profile={profile} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>

          <div className="bg-background/80 flex items-center justify-between gap-2 border-t px-6 py-4 backdrop-blur-sm shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInvite(profile)}
              >
                <UserPlus className="size-4" />
                {profile.status === "invited" ? "Resend invite" : "Send invite"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransfer(profile)}
              >
                <ArrowLeftRight className="size-4" />
                Transfer appts
              </Button>
            </div>
            <Button size="sm" onClick={() => onEdit(profile)}>
              <Pencil className="size-4" />
              Edit profile
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function Header({ profile }: { profile: StaffProfile }) {
  const meta = ROLE_META[profile.primaryRole];
  return (
    <div className={cn("relative shrink-0 overflow-hidden p-6 pb-5 border-b")}>
      <div
        className={cn("pointer-events-none absolute inset-0", meta.accent)}
      />
      <div className="relative flex items-start gap-4">
        <StaffAvatar profile={profile} size="xl" />
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-xl font-bold">
            {fullNameOf(profile)}
          </DialogTitle>
          {profile.jobTitle && (
            <p className="text-foreground/70 mt-0.5 truncate text-sm font-medium">
              {profile.jobTitle}
            </p>
          )}
          <DialogDescription className="mt-1 flex items-center gap-1.5 text-xs">
            <Clock className="size-3" />
            Active {formatRelative(profile.lastActive)} ·{" "}
            <span className="capitalize">{profile.status}</span>
          </DialogDescription>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <RolePill role={profile.primaryRole} size="md" />
            {profile.additionalRoles.map((r) => (
              <RolePill key={r} role={r} size="md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ profile }: { profile: StaffProfile }) {
  const locationLabels = profile.assignedLocations
    .map((id) => FACILITY_LOCATIONS.find((l) => l.id === id)?.label)
    .filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoTile icon={Mail} label="Email" value={profile.email} />
        <InfoTile icon={Phone} label="Phone" value={profile.phone} />
        <InfoTile
          icon={CalendarDays}
          label="Hired"
          value={profile.employment.hireDate}
          sub={profile.employment.employmentType.replace("_", " ")}
        />
        <InfoTile
          icon={MapPin}
          label="Locations"
          value={locationLabels.join(", ") || "—"}
          sub={
            locationLabels.length === FACILITY_LOCATIONS.length
              ? "Access to all locations"
              : `${locationLabels.length} of ${FACILITY_LOCATIONS.length}`
          }
        />
      </div>

      <div className="bg-muted/40 border-border/60 rounded-xl border p-4">
        <div className="mb-1 text-xs font-medium">Internal notes</div>
        <p className="text-muted-foreground text-sm/relaxed">
          {profile.employment.notes || "No notes yet."}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBlock label="Upcoming" value={profile.upcomingAppointments} />
        <StatBlock label="Open tasks" value={profile.openTasks} />
        <StatBlock
          label="On calendar"
          value={profile.showOnCalendar ? "Yes" : "No"}
        />
      </div>
    </div>
  );
}

function ServicesTab({ profile }: { profile: StaffProfile }) {
  if (profile.serviceAssignments.length === 0) {
    return (
      <div className="border-border/60 text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
        No services assigned. This staff member won&apos;t see service-specific
        operations.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Services determine which operational areas this staff member can access
        and contribute to (feedings, grooming queue, training queue, etc.).
      </p>
      <div className="grid grid-cols-2 gap-2">
        {profile.serviceAssignments.map((s) => (
          <div
            key={s}
            className="border-border/60 bg-card rounded-xl border p-3"
          >
            <ServiceChip module={s} size="md" />
            <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
              Access follows the scope on each action — defaults come from the
              staff&apos;s role, overrides apply per-permission.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsTab({ profile }: { profile: StaffProfile }) {
  const fullName = fullNameOf(profile).toLowerCase();
  const submissions = useMemo(
    () =>
      employeeDocumentSubmissions.filter(
        (s) => s.employeeName.toLowerCase() === fullName,
      ),
    [fullName],
  );
  const [viewing, setViewing] = useState<EmployeeDocumentSubmission | null>(
    null,
  );

  const signed = submissions.filter((s) => s.status === "signed").length;
  const pending = submissions.filter((s) => s.status === "pending").length;

  if (submissions.length === 0) {
    return (
      <div className="border-border/60 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <FileSignature className="text-muted-foreground size-7 opacity-40" />
        <div className="text-sm font-semibold">No signed documents yet</div>
        <p className="text-muted-foreground max-w-sm text-xs">
          Send an employment agreement, NDA, or other onboarding document from
          the <span className="text-foreground font-medium">Scheduling &rsaquo; Onboarding &rsaquo; Templates</span>{" "}
          tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="border-border/60 bg-card rounded-xl border p-3">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <FileCheck2 className="size-3 text-emerald-600" /> Signed
          </div>
          <div className="mt-1 text-lg font-bold">{signed}</div>
        </div>
        <div className="border-border/60 bg-card rounded-xl border p-3">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <Clock className="size-3 text-amber-600" /> Pending
          </div>
          <div className="mt-1 text-lg font-bold">{pending}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {submissions.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setViewing(sub)}
            className="group border-border/60 hover:border-primary/40 hover:bg-muted/40 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all"
          >
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {sub.templateTitle}
              </div>
              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                <span>
                  Signed{" "}
                  {sub.signedAt
                    ? new Date(sub.signedAt).toLocaleDateString("en-CA", {
                        dateStyle: "medium",
                      })
                    : "—"}
                </span>
                {sub.ipAddress && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="size-2.5" /> {sub.ipAddress}
                  </span>
                )}
                {sub.deviceId && (
                  <span className="flex items-center gap-0.5">
                    <Fingerprint className="size-2.5" /> {sub.deviceId}
                  </span>
                )}
              </div>
            </div>
            <Badge
              className={cn(
                "border-0 text-[10px]",
                sub.status === "signed"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
            >
              {sub.status === "signed" ? "Signed" : "Pending"}
            </Badge>
            <ChevronRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      <SignedDocumentQuickView
        submission={viewing}
        onOpenChange={(v) => !v && setViewing(null)}
      />
    </div>
  );
}

function SignedDocumentQuickView({
  submission,
  onOpenChange,
}: {
  submission: EmployeeDocumentSubmission | null;
  onOpenChange: (v: boolean) => void;
}) {
  if (!submission) return null;
  const tmpl: EmployeeDocumentTemplate | undefined =
    employeeDocumentTemplates.find((t) => t.id === submission.templateId);
  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="backdrop-blur-sm" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-60 flex flex-col",
            "w-full max-w-xl max-h-[85vh]",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-xl border shadow-2xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "duration-200",
          )}
        >
          <div className="bg-primary/5 shrink-0 border-b px-6 py-4">
            <DialogTitle className="text-base">
              {submission.templateTitle}
            </DialogTitle>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tmpl && (
                <Badge variant="outline" className="text-[10px]">
                  v{tmpl.version}
                </Badge>
              )}
              <Badge
                className={cn(
                  "border-0 text-[10px]",
                  submission.status === "signed"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {submission.status}
              </Badge>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              {submission.signatureData && (
                <div>
                  <div className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                    Signature
                  </div>
                  <div className="bg-background flex h-24 items-center justify-center rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={submission.signatureData}
                      alt="Signature"
                      className="max-h-16 object-contain"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                  Audit trail
                </div>
                <dl className="border-border/60 grid grid-cols-1 divide-y rounded-xl border text-xs sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <AuditItem
                    label="Signed at"
                    value={
                      submission.signedAt
                        ? new Date(submission.signedAt).toLocaleString("en-CA")
                        : "—"
                    }
                  />
                  <AuditItem
                    label="IP address"
                    value={submission.ipAddress ?? "—"}
                    mono
                  />
                  <AuditItem
                    label="Timezone"
                    value={submission.timezone ?? "—"}
                  />
                  <AuditItem
                    label="Device"
                    value={submission.deviceId ?? "—"}
                    mono
                  />
                </dl>
              </div>

              {Object.keys(submission.fieldValues).length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                    Information provided
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(submission.fieldValues).map(([k, v]) => {
                      const field = tmpl?.fields.find((f) => f.id === k);
                      return (
                        <div
                          key={k}
                          className="border-border/60 flex justify-between gap-3 rounded-md border px-3 py-2 text-xs"
                        >
                          <span className="text-muted-foreground">
                            {field?.label ?? k.replace(/_/g, " ")}
                          </span>
                          <span className="text-right font-medium">
                            {v || "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-background/80 flex shrink-0 items-center justify-between gap-2 border-t px-6 py-3 backdrop-blur-sm">
            <div className="text-muted-foreground text-[10px] font-mono">
              {submission.id}
            </div>
            <Button variant="outline" size="sm">
              <Download className="size-3.5" /> Download
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function AuditItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="p-3">
      <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </div>
      <div className={cn("mt-0.5 break-all", mono && "font-mono")}>{value}</div>
    </div>
  );
}

function NotificationsTab({ profile }: { profile: StaffProfile }) {
  const groups = useMemo(() => {
    const byGroup = new Map<
      string,
      { event: string; label: string; scope: string }[]
    >();
    for (const [event, meta] of Object.entries(NOTIFICATION_EVENT_META)) {
      if (!byGroup.has(meta.group)) byGroup.set(meta.group, []);
      byGroup.get(meta.group)!.push({
        event,
        label: meta.label,
        scope:
          profile.notifications[event as keyof typeof profile.notifications],
      });
    }
    return Array.from(byGroup.entries());
  }, [profile]);

  return (
    <div className="space-y-4">
      {groups.map(([group, items]) => (
        <div key={group}>
          <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium">
            <Bell className="size-3" />
            {group}
          </div>
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.event}
                className="border-border/50 bg-card/60 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{item.label}</span>
                <NotificationBadge scope={item.scope} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PayrollTab({ profile }: { profile: StaffProfile }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PayCard
          icon={Wallet}
          label="Service commission"
          value={
            profile.payroll.generalServiceCommission > 0
              ? `${profile.payroll.generalServiceCommission}%`
              : "—"
          }
          sub="On collected service + add-on revenue"
        />
        <PayCard
          icon={Clock}
          label="Hourly rate"
          value={
            profile.payroll.hourlyRate > 0
              ? `$${profile.payroll.hourlyRate}/hr`
              : "—"
          }
          sub="Calculated from clock in/out"
        />
        <PayCard
          icon={BadgeCheck}
          label="Tips"
          value={
            profile.payroll.tipsRate > 0
              ? `${profile.payroll.tipsRate}% retained`
              : "No tips collected"
          }
          sub="From assigned appointments"
        />
      </div>

      {profile.payroll.overrides.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-semibold">Service overrides</div>
          <div className="space-y-1.5">
            {profile.payroll.overrides.map((o) => (
              <div
                key={o.serviceModule}
                className="border-border/60 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <ServiceChip module={o.serviceModule} />
                <span className="font-medium">{o.commission}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tiny presentational helpers
// ============================================================================

function InfoTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="border-border/60 bg-card rounded-xl border p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
      {sub && (
        <div className="text-muted-foreground mt-0.5 text-[11px] capitalize">
          {sub}
        </div>
      )}
    </div>
  );
}

function NotificationBadge({ scope }: { scope: string }) {
  const map: Record<
    string,
    { label: string; tone: string; icon: React.ReactNode }
  > = {
    related_to_them: {
      label: "Related to them",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: <LockKeyhole className="size-3" />,
    },
    at_working_business: {
      label: "At working business",
      tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
      icon: <MapPin className="size-3" />,
    },
    do_not_notify: {
      label: "Off",
      tone: "bg-muted text-muted-foreground",
      icon: null,
    },
  };
  const m = map[scope] ?? map.do_not_notify;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        m.tone,
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-border/60 bg-card rounded-xl border p-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-muted-foreground text-[11px]">{label}</div>
    </div>
  );
}

function PayCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border-border/60 bg-card rounded-xl border p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 text-base font-bold">{value}</div>
      {sub && (
        <div className="text-muted-foreground mt-0.5 text-[11px]">{sub}</div>
      )}
    </div>
  );
}
