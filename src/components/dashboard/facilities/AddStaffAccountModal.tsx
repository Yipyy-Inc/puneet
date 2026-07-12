"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import {
  ROLE_META,
  ROLE_PRESETS,
  buildDefaultNotifications,
  type FacilityStaffRole,
  type StaffProfile,
} from "@/types/facility-staff";
import { FACILITY_LOCATIONS } from "@/data/facility-staff";

const PRESET_ROLES = Object.keys(ROLE_META) as FacilityStaffRole[];

// A neutral base role for a custom-role hire — always-on permissions plus the
// custom role's own grants (which union on top via the RBAC resolver).
const CUSTOM_BASE_ROLE: FacilityStaffRole = "reception";

const isMultiLocation = FACILITY_LOCATIONS.length > 1;

export interface AddStaffAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the fully-built invited StaffProfile for persistence. */
  onCreate: (staff: StaffProfile) => void;
}

export function AddStaffAccountModal({
  open,
  onOpenChange,
  onCreate,
}: AddStaffAccountModalProps) {
  const { customRoles } = useFacilityRbac();
  const customList = useMemo(() => Object.values(customRoles), [customRoles]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Encoded as `preset:<role>` or `custom:<id>`.
  const [roleValue, setRoleValue] = useState<string>(`preset:reception`);
  const [locationIds, setLocationIds] = useState<string[]>(
    isMultiLocation ? [] : [FACILITY_LOCATIONS[0].id],
  );
  const [startDate, setStartDate] = useState("");

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const locationsOk = !isMultiLocation || locationIds.length > 0;
  const valid =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    validEmail &&
    locationsOk;

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRoleValue(`preset:reception`);
    setLocationIds(isMultiLocation ? [] : [FACILITY_LOCATIONS[0].id]);
    setStartDate("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function toggleLocation(id: string) {
    setLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function buildProfile(): StaffProfile {
    const isCustom = roleValue.startsWith("custom:");
    const customRoleId = isCustom ? roleValue.slice("custom:".length) : null;
    const primaryRole: FacilityStaffRole = isCustom
      ? CUSTOM_BASE_ROLE
      : (roleValue.slice("preset:".length) as FacilityStaffRole);

    return {
      id: `fs-${Math.random().toString(36).slice(2, 9)}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      colorHex: "#0284C7",
      primaryRole,
      additionalRoles: [],
      customRoleIds: customRoleId ? [customRoleId] : undefined,
      serviceAssignments: ROLE_PRESETS[primaryRole].services,
      assignedLocations:
        locationIds.length > 0 ? locationIds : [FACILITY_LOCATIONS[0].id],
      showOnCalendar: true,
      calendarAccess: { mode: "all" },
      clockIn: { requireAccessCode: false },
      permissionOverrides: {},
      notifications: buildDefaultNotifications(primaryRole),
      payroll: {
        generalServiceCommission: 0,
        hourlyRate: 0,
        tipsRate: 0,
        overrides: [],
      },
      employment: {
        // Start date drives the model's hire date.
        hireDate: startDate || new Date().toISOString().split("T")[0],
        employmentType: "full_time",
        notes: "",
      },
      status: "invited",
      statusChangedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      upcomingAppointments: 0,
      openTasks: 0,
      invitationSentAt: new Date().toISOString(),
    };
  }

  function submit() {
    if (!valid) return;
    const profile = buildProfile();
    onCreate(profile);
    // Simulate the invitation email + secure setup link.
    // TODO: send a real invitation email and generate a secure setup token.
    toast.success(`Invitation sent to ${profile.email}`, {
      description:
        "They'll get a secure setup link to choose a password (expires in 48 hours).",
    });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add new staff</DialogTitle>
          <DialogDescription>
            We&apos;ll email an invitation to set up the account. It stays
            &ldquo;Invited&rdquo; until they complete setup.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-first">First name</Label>
              <Input
                id="staff-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-last">Last name</Label>
              <Input
                id="staff-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email (login)</Label>
              <Input
                id="staff-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@facility.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone (optional)</Label>
              <Input
                id="staff-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-role">Role</Label>
              <Select value={roleValue} onValueChange={setRoleValue}>
                <SelectTrigger id="staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Preset roles</SelectLabel>
                    {PRESET_ROLES.map((r) => (
                      <SelectItem key={r} value={`preset:${r}`}>
                        {ROLE_META[r].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {customList.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Custom roles</SelectLabel>
                      {customList.map((role) => (
                        <SelectItem key={role.id} value={`custom:${role.id}`}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-start">Start date</Label>
              <Input
                id="staff-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {isMultiLocation && (
            <div className="space-y-1.5">
              <Label>Assigned location(s)</Label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {FACILITY_LOCATIONS.map((loc) => {
                  const active = locationIds.includes(loc.id);
                  return (
                    <label
                      key={loc.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors",
                        active
                          ? "border-primary ring-primary/20 bg-primary/5 ring-1"
                          : "border-border/60 hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={active}
                        onCheckedChange={() => toggleLocation(loc.id)}
                      />
                      <MapPin className="text-muted-foreground size-3.5" />
                      <span className="truncate">{loc.label}</span>
                    </label>
                  );
                })}
              </div>
              {!locationsOk && (
                <p className="text-[11px] text-rose-600">
                  Select at least one location.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={submit}>
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
