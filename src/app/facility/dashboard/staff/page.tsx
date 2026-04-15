"use client";

import { useMemo, useState } from "react";
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
  UserPlus,
  LayoutGrid,
  List,
  Mail,
  Building2,
} from "lucide-react";
import { DepartmentSettings } from "@/components/facility/DepartmentSettings";
import {
  ROLE_META,
  type FacilityStaffRole,
  type StaffProfile,
} from "@/types/facility-staff";
import { facilityStaff, FACILITY_LOCATIONS } from "@/data/facility-staff";
import { StaffCard } from "./_components/staff-card";
import { StaffProfileSheet } from "./_components/staff-profile-sheet";
import { StaffFormDialog } from "./_components/staff-form-dialog";
import { RoleAccessMatrix } from "./_components/role-matrix";
import {
  RolePill,
  ServiceChip,
  StaffAvatar,
  fullNameOf,
  formatRelative,
  RoleIcon,
} from "./_components/staff-shared";

const ROLE_FILTERS: { value: FacilityStaffRole | "all"; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "reception", label: "Reception" },
  { value: "groomer", label: "Groomer" },
  { value: "trainer", label: "Trainer" },
  { value: "daycare_attendant", label: "Daycare" },
  { value: "boarding_attendant", label: "Boarding" },
  { value: "sanitation", label: "Sanitation" },
];

export default function FacilityStaffPage() {
  const [staff, setStaff] = useState<StaffProfile[]>(facilityStaff);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<FacilityStaffRole | "all">(
    "all",
  );
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [viewing, setViewing] = useState<StaffProfile | null>(null);
  const [editing, setEditing] = useState<StaffProfile | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<StaffProfile | null>(null);
  const [transferring, setTransferring] = useState<StaffProfile | null>(null);
  const [inviteTarget, setInviteTarget] = useState<StaffProfile | null>(null);
  const [departmentsOpen, setDepartmentsOpen] = useState(false);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (roleFilter !== "all" && s.primaryRole !== roleFilter) return false;
      if (
        locationFilter !== "all" &&
        !s.assignedLocations.includes(locationFilter)
      )
        return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
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
  }, [staff, query, roleFilter, locationFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === "active").length;
    const invited = staff.filter((s) => s.status === "invited").length;
    const roles = new Set(staff.map((s) => s.primaryRole)).size;
    const services = new Set(staff.flatMap((s) => s.serviceAssignments)).size;
    return { total, active, invited, roles, services };
  }, [staff]);

  function handleSave(next: StaffProfile) {
    setStaff((list) => {
      const idx = list.findIndex((s) => s.id === next.id);
      if (idx === -1) return [next, ...list];
      const copy = [...list];
      copy[idx] = next;
      return copy;
    });
    setViewing(null);
  }

  function openEdit(profile: StaffProfile) {
    setViewing(null);
    setEditing(profile);
    setFormOpen(true);
  }

  function openAddNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Sparkles className="size-3" /> Team directory
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              Your staff, your access rules
            </h2>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Role-based by default, override per permission. Every account sees
              their schedule, documents, and tasks — service access unlocks the
              rest.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDepartmentsOpen(true)}>
              <Building2 className="size-4" /> Manage departments
            </Button>
            <Button variant="outline">
              <ArrowUpDown className="size-4" /> Sort staff
            </Button>
            <Button onClick={openAddNew}>
              <Plus className="size-4" /> Add new staff
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatPill
            icon={Users}
            label="Total staff"
            value={stats.total}
            tone="bg-primary/10 text-primary"
          />
          <StatPill
            icon={UserCheck}
            label="Active"
            value={stats.active}
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatPill
            icon={Mail}
            label="Invited"
            value={stats.invited}
            tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatPill
            icon={ShieldCheck}
            label="Roles in use"
            value={stats.roles}
            tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <StatPill
            icon={Sparkles}
            label="Services covered"
            value={stats.services}
            tone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
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
                placeholder="Search by name, email, phone…"
                className="pl-9"
              />
            </div>

            <Select
              value={roleFilter}
              onValueChange={(v) =>
                setRoleFilter(v as FacilityStaffRole | "all")
              }
            >
              <SelectTrigger className="w-40">
                <Filter className="text-muted-foreground size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {FACILITY_LOCATIONS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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
                <LayoutGrid className="size-3.5" /> Grid
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
                <List className="size-3.5" /> List
              </button>
            </div>
          </div>

          {/* Role chip strip */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ROLE_FILTERS.map((r) => {
              const count =
                r.value === "all"
                  ? staff.length
                  : staff.filter((s) => s.primaryRole === r.value).length;
              const active = roleFilter === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setRoleFilter(r.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-card hover:bg-muted",
                  )}
                >
                  {r.value !== "all" && (
                    <RoleIcon role={r.value} className="size-3" />
                  )}
                  {r.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold",
                      active
                        ? "bg-primary-foreground/20"
                        : "bg-muted text-muted-foreground",
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

      {/* Directory */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Users className="text-muted-foreground size-8" />
            <div className="font-semibold">No staff match those filters</div>
            <p className="text-muted-foreground text-sm">
              Try clearing filters or add someone new.
            </p>
          </CardContent>
        </Card>
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
            />
          ))}
        </div>
      ) : (
        <StaffListView
          profiles={filtered}
          onView={setViewing}
          onEdit={openEdit}
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
          setStaff((list) => {
            const idx = list.findIndex((s) => s.id === next.id);
            if (idx === -1) return list;
            const copy = [...list];
            copy[idx] = next;
            return copy;
          });
          setViewing(next);
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
      />

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete staff profile</DialogTitle>
            <DialogDescription>
              {deleting && (
                <>
                  Remove {fullNameOf(deleting)}? They&apos;ll lose access
                  immediately. Assigned appointments will need to be
                  transferred.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) {
                  setStaff((l) => l.filter((s) => s.id !== deleting.id));
                }
                setDeleting(null);
              }}
            >
              Delete profile
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
            <DialogTitle>Transfer upcoming appointments</DialogTitle>
            <DialogDescription>
              {transferring && (
                <>
                  {transferring.upcomingAppointments} upcoming appointments
                  assigned to {fullNameOf(transferring)}. Pick who takes them
                  over.
                </>
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
                      {ROLE_META[s.primaryRole].label}
                    </div>
                  </div>
                  <ArrowLeftRight className="text-muted-foreground size-4" />
                </button>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferring(null)}>
              Cancel
            </Button>
            <Button onClick={() => setTransferring(null)}>Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Departments management */}
      <Dialog open={departmentsOpen} onOpenChange={setDepartmentsOpen}>
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Departments</DialogTitle>
            <DialogDescription>
              Create departments to organize your staff and assign tasks by
              team. Each staff member belongs to one department.
            </DialogDescription>
          </DialogHeader>
          <DepartmentSettings />
        </DialogContent>
      </Dialog>

      {/* Invite confirm */}
      <Dialog
        open={!!inviteTarget}
        onOpenChange={(v) => !v && setInviteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send invitation</DialogTitle>
            <DialogDescription>
              {inviteTarget && (
                <>
                  We&apos;ll email {inviteTarget.email} an invite link to join
                  Doggieville and set their password.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => setInviteTarget(null)}>
              <UserPlus className="size-4" /> Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
}: {
  profiles: StaffProfile[];
  onView: (p: StaffProfile) => void;
  onEdit: (p: StaffProfile) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Staff</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium">Services</th>
                <th className="px-4 py-2.5 text-left font-medium">Locations</th>
                <th className="px-4 py-2.5 text-left font-medium">
                  Last active
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
                      ? "All"
                      : `${p.assignedLocations.length}/${FACILITY_LOCATIONS.length}`}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {formatRelative(p.lastActive)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(p);
                      }}
                    >
                      Edit
                    </Button>
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
