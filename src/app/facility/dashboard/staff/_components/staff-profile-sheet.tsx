"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ROLE_META,
  NOTIFICATION_EVENT_META,
  type StaffProfile,
} from "@/types/facility-staff";
import { AccessTab } from "./access-tab";
import { WarningsTab } from "./warnings-tab";
import { EmployeeFilesTab } from "./employee-files-tab";
import { StaffAuditTrail } from "./staff-audit-trail";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { FACILITY_LOCATIONS } from "@/data/facility-staff";
import {
  RolePill,
  ServiceChip,
  StaffAvatar,
  fullNameOf,
  formatRelative,
} from "./staff-shared";
import { StatusBadge } from "./status-change-dialog";

const STATUS_REASON_LABELS: Record<string, string> = {
  vacation: "Vacation",
  medical_leave: "Medical leave",
  resigned: "Resigned voluntarily",
  terminated_cause: "Terminated for cause",
  performance: "Performance-based termination",
  rehired: "Returned from leave",
  other: "Other",
};

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
  const { can, viewer } = useFacilityRbac();
  const canSeeAccess = can("view_staff_permissions");
  const canSeePayroll = can("view_payroll");
  const canSeeAudit =
    viewer.primaryRole === "owner" || viewer.primaryRole === "manager";
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
                <ScrollableTabsBar>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  {canSeeAccess && (
                    <TabsTrigger value="access">Access</TabsTrigger>
                  )}
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="warnings">Warnings</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  {canSeePayroll && (
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                  )}
                  {canSeeAudit && (
                    <TabsTrigger value="audit">Audit trail</TabsTrigger>
                  )}
                </ScrollableTabsBar>

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
                  <EmployeeFilesTab profile={profile} />
                </TabsContent>
                <TabsContent value="warnings" className="mt-4 space-y-4">
                  <WarningsTab profile={profile} />
                </TabsContent>
                <TabsContent value="notifications" className="mt-4 space-y-4">
                  <NotificationsTab profile={profile} />
                </TabsContent>
                {canSeePayroll && (
                  <TabsContent value="payroll" className="mt-4 space-y-4">
                    <PayrollTab profile={profile} />
                  </TabsContent>
                )}
                {canSeeAudit && (
                  <TabsContent value="audit" className="mt-4">
                    <StaffAuditTrail staffId={profile.id} />
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

function ScrollableTabsBar({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -160 : 160,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative -mx-6">
      {/* Left arrow */}
      <button
        type="button"
        aria-label="Scroll tabs left"
        onClick={() => scroll("left")}
        className={cn(
          "absolute top-1/2 left-1.5 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-all duration-200 hover:text-foreground",
          canLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <ChevronLeft className="size-3.5" />
      </button>

      {/* Right arrow */}
      <button
        type="button"
        aria-label="Scroll tabs right"
        onClick={() => scroll("right")}
        className={cn(
          "absolute top-1/2 right-1.5 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-all duration-200 hover:text-foreground",
          canRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <ChevronRight className="size-3.5" />
      </button>

      {/* Edge fades */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r from-background/90 to-transparent transition-opacity",
          canLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l from-background/90 to-transparent transition-opacity",
          canRight ? "opacity-100" : "opacity-0",
        )}
      />

      <div ref={scrollRef} className="scrollbar-hidden overflow-x-auto px-6">
        <TabsList className="w-max min-w-full justify-start bg-transparent p-0">
          {children}
        </TabsList>
      </div>
    </div>
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
          <DialogDescription className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <Clock className="size-3" />
            {profile.status === "active" || profile.status === "invited"
              ? <>Active {formatRelative(profile.lastActive)}</>
              : <>Last active {formatRelative(profile.lastActive)}</>
            }
            {(profile.status === "inactive" || profile.status === "terminated") && (
              <>
                <span>·</span>
                <StatusBadge status={profile.status} />
                {profile.statusReason && (
                  <span>{STATUS_REASON_LABELS[profile.statusReason]}</span>
                )}
              </>
            )}
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
      {(profile.status === "inactive" || profile.status === "terminated") && (
        <div
          className={cn(
            "rounded-xl border p-4",
            profile.status === "inactive"
              ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
              : "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20",
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge status={profile.status} />
            {profile.statusChangedAt && (
              <span
                className={cn(
                  "text-xs",
                  profile.status === "inactive"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-rose-700 dark:text-rose-400",
                )}
              >
                since {new Date(profile.statusChangedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {profile.statusReason && (
            <div
              className={cn(
                "text-sm font-medium",
                profile.status === "inactive"
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-rose-800 dark:text-rose-300",
              )}
            >
              {STATUS_REASON_LABELS[profile.statusReason] ?? profile.statusReason}
            </div>
          )}
          {profile.statusNote && (
            <p
              className={cn(
                "mt-1 text-xs/relaxed",
                profile.status === "inactive"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-rose-700 dark:text-rose-400",
              )}
            >
              {profile.statusNote}
            </p>
          )}
        </div>
      )}

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
