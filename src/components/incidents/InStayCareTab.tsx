"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Pill,
  ClipboardList,
  Plus,
  Camera,
  AlertTriangle,
  Lock,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { hasPermission } from "@/lib/role-utils";
import { addCareAction, addIncidentMedication } from "@/data/incidents";
import { bookings } from "@/data/bookings";
import { boardingGuests } from "@/data/boarding";
import { facilityConfig } from "@/data/facility-config";
import type {
  Incident,
  IncidentCareAction,
  IncidentMedication,
  IncidentCareLog,
  CareActionFrequency,
  CareActionDuration,
  CareActionStart,
  IncidentMedType,
  IncidentMedFeeType,
} from "@/types/incidents";

// ── In-stay resolution ────────────────────────────────────────────────────────
// The tab renders only while at least one involved pet is on premises. Services
// that have an "in-stay" phase (2B); one-shot services never show the tab.
const IN_STAY_SERVICES = new Set(["boarding", "daycare", "grooming"]);
// Booking statuses that mean the pet is physically here right now.
const ON_PREMISES_STATUSES = new Set(["checked_in", "in_progress", "ready"]);

function bookingHasPet(
  petId: number,
  bookingPetId: number | number[],
): boolean {
  return Array.isArray(bookingPetId)
    ? bookingPetId.includes(petId)
    : bookingPetId === petId;
}

/**
 * True when at least one pet involved in the incident is currently checked in to
 * an active boarding/daycare/grooming stay. Resolved two ways (2B / 0.1):
 *  - the incident's booking link → that booking's service + status, or
 *  - any involved pet's active stay (checked-in boarding guest, or an
 *    on-premises booking for that pet).
 * When every involved pet has checked out the incident is historical → false.
 */
export function isIncidentInStay(incident: Incident): boolean {
  // Path A — explicit booking link (0.1).
  if (incident.bookingId != null) {
    const booking = bookings.find((b) => b.id === incident.bookingId);
    if (
      booking &&
      IN_STAY_SERVICES.has(booking.service.toLowerCase()) &&
      ON_PREMISES_STATUSES.has(booking.status)
    ) {
      return true;
    }
  }

  // Path B — any involved pet has an active stay.
  return incident.petIds.some(
    (petId) =>
      boardingGuests.some(
        (g) => g.petId === petId && g.status === "checked-in",
      ) ||
      bookings.some(
        (b) =>
          IN_STAY_SERVICES.has(b.service.toLowerCase()) &&
          ON_PREMISES_STATUSES.has(b.status) &&
          bookingHasPet(petId, b.petId),
      ),
  );
}

// ── Option lists ──────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS: { value: CareActionFrequency; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "every_x_hours", label: "Every X hours" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "once_daily", label: "Once daily" },
  { value: "custom", label: "Custom schedule" },
];

const DURATION_OPTIONS: { value: CareActionDuration; label: string }[] = [
  { value: "until_checkout", label: "Until checkout" },
  { value: "x_days", label: "For X days" },
  { value: "until_stopped", label: "Until stopped" },
];

const START_OPTIONS: { value: CareActionStart; label: string }[] = [
  { value: "immediately", label: "Immediately" },
  { value: "next_care_time", label: "Next care time" },
  { value: "next_morning_8am", label: "Next morning (8 AM)" },
];

const MED_TYPE_OPTIONS: { value: IncidentMedType; label: string }[] = [
  { value: "oral", label: "Oral" },
  { value: "topical", label: "Topical" },
  { value: "injection", label: "Injection" },
  { value: "other", label: "Other" },
];

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function describeSchedule(a: IncidentCareAction): string {
  const freq =
    a.frequency === "every_x_hours"
      ? `Every ${a.everyXHours ?? "?"}h`
      : a.frequency === "custom"
        ? a.customSchedule || "Custom schedule"
        : humanize(a.frequency);
  const duration =
    a.duration === "x_days" ? `${a.days ?? "?"} days` : humanize(a.duration);
  return `${freq} · ${duration} · starts ${humanize(a.starts).toLowerCase()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

// General medication-administration fee (2G) — used to prefill the fee inputs.
const GENERAL_MED_FEE = facilityConfig.serviceFees.medication.adminFee;

export function InStayCareTab({ incident }: { incident: Incident }) {
  const { user } = useCurrentUser();
  const { role, userId } = useFacilityRole();
  const locked = !!incident.inStayCareLocked;
  // Only a manager/senior (manage_incidents) may create/edit care actions.
  // Front-line staff can still log administrations (2B.4), just not create.
  const canManageCare = hasPermission(
    role,
    "manage_incidents",
    userId ?? undefined,
  );
  const canEditCare = canManageCare && !locked;

  const [careActions, setCareActions] = useState<IncidentCareAction[]>(
    incident.careActions,
  );
  const [medications, setMedications] = useState<IncidentMedication[]>(
    incident.incidentMedications,
  );

  const [showCareForm, setShowCareForm] = useState(false);
  const [showMedForm, setShowMedForm] = useState(false);

  const [careForm, setCareForm] = useState({
    name: "",
    frequency: "once" as CareActionFrequency,
    everyXHours: 4,
    duration: "until_checkout" as CareActionDuration,
    days: 3,
    starts: "immediately" as CareActionStart,
    staffInstructions: "",
    requiresPhoto: false,
  });

  const [medForm, setMedForm] = useState({
    name: "",
    medType: "oral" as IncidentMedType,
    dosage: "",
    frequency: "Once daily",
    instructions: "",
    critical: false,
    // Default fee from the facility's general medication fee (2G) if enabled.
    chargeFee: GENERAL_MED_FEE.enabled,
    feeType: "per_admin" as IncidentMedFeeType,
    feeAmount: GENERAL_MED_FEE.amount,
  });

  const resetCareForm = () =>
    setCareForm({
      name: "",
      frequency: "once",
      everyXHours: 4,
      duration: "until_checkout",
      days: 3,
      starts: "immediately",
      staffInstructions: "",
      requiresPhoto: false,
    });

  const handleAddCare = () => {
    if (!careForm.name.trim()) return;
    const created = addCareAction(incident.id, {
      name: careForm.name.trim(),
      frequency: careForm.frequency,
      ...(careForm.frequency === "every_x_hours"
        ? { everyXHours: careForm.everyXHours }
        : {}),
      duration: careForm.duration,
      ...(careForm.duration === "x_days" ? { days: careForm.days } : {}),
      starts: careForm.starts,
      staffInstructions: careForm.staffInstructions.trim(),
      requiresPhoto: careForm.requiresPhoto,
      createdBy: user.name,
      active: true,
    });
    if (created) setCareActions((prev) => [...prev, created]);
    resetCareForm();
    setShowCareForm(false);
  };

  const handleAddMed = () => {
    if (!medForm.name.trim()) return;
    const created = addIncidentMedication(incident.id, {
      name: medForm.name.trim(),
      medType: medForm.medType,
      dosage: medForm.dosage.trim(),
      frequency: medForm.frequency.trim(),
      instructions: medForm.instructions.trim(),
      critical: medForm.critical,
      chargeFee: medForm.chargeFee,
      ...(medForm.chargeFee
        ? { feeType: medForm.feeType, feeAmount: medForm.feeAmount }
        : {}),
      createdBy: user.name,
    });
    if (created) setMedications((prev) => [...prev, created]);
    setMedForm({
      name: "",
      medType: "oral",
      dosage: "",
      frequency: "Once daily",
      instructions: "",
      critical: false,
      chargeFee: GENERAL_MED_FEE.enabled,
      feeType: "per_admin",
      feeAmount: GENERAL_MED_FEE.amount,
    });
    setShowMedForm(false);
  };

  const targetLabel = (log: IncidentCareLog): string => {
    if (log.careActionId) {
      const a = careActions.find((c) => c.id === log.careActionId);
      return a ? a.name : "Care action";
    }
    if (log.medicationId) {
      const m = medications.find((x) => x.id === log.medicationId);
      return m ? m.name : "Medication";
    }
    return "General note";
  };

  // Append-only audit trail — read straight from the incident (entries are
  // created from Daily Care / the booking overview, 2D), newest first.
  const sortedLogs = incident.careLogs
    .slice()
    .sort(
      (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
    );

  return (
    <div className="space-y-4">
      {locked && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
          <Lock className="size-4 shrink-0" />
          In-stay care was locked at checkout — records are read-only.
        </div>
      )}

      {/* 2B.2 — Care Actions */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Care Actions
              <Badge variant="secondary" className="text-[10px]">
                {careActions.length}
              </Badge>
            </Label>
            {canEditCare && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCareForm((v) => !v)}
              >
                <Plus className="mr-1 size-4" />
                Add Care Action
              </Button>
            )}
          </div>

          {!canManageCare && !locked && (
            <p className="text-muted-foreground text-xs">
              Only a manager can add or edit care actions. You can still log
              care below.
            </p>
          )}

          {showCareForm && canEditCare && (
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={careForm.name}
                  onChange={(e) =>
                    setCareForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Ice-pack the swelling"
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Frequency</Label>
                  <Select
                    value={careForm.frequency}
                    onValueChange={(v) =>
                      setCareForm((p) => ({
                        ...p,
                        frequency: v as CareActionFrequency,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="text-xs"
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {careForm.frequency === "every_x_hours" && (
                  <div>
                    <Label className="text-xs">Every (hours)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={careForm.everyXHours}
                      onChange={(e) =>
                        setCareForm((p) => ({
                          ...p,
                          everyXHours: Number(e.target.value),
                        }))
                      }
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Duration</Label>
                  <Select
                    value={careForm.duration}
                    onValueChange={(v) =>
                      setCareForm((p) => ({
                        ...p,
                        duration: v as CareActionDuration,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="text-xs"
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {careForm.duration === "x_days" && (
                  <div>
                    <Label className="text-xs">Days</Label>
                    <Input
                      type="number"
                      min={1}
                      value={careForm.days}
                      onChange={(e) =>
                        setCareForm((p) => ({
                          ...p,
                          days: Number(e.target.value),
                        }))
                      }
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Starts</Label>
                  <Select
                    value={careForm.starts}
                    onValueChange={(v) =>
                      setCareForm((p) => ({
                        ...p,
                        starts: v as CareActionStart,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {START_OPTIONS.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="text-xs"
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Staff instructions</Label>
                <Textarea
                  value={careForm.staffInstructions}
                  onChange={(e) =>
                    setCareForm((p) => ({
                      ...p,
                      staffInstructions: e.target.value,
                    }))
                  }
                  placeholder="What should staff do each time?"
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox
                  checked={careForm.requiresPhoto}
                  onCheckedChange={(v) =>
                    setCareForm((p) => ({ ...p, requiresPhoto: v === true }))
                  }
                />
                <Camera className="size-3.5" />
                Require a photo each time
              </label>
              <div>
                <Label className="text-xs">Created by</Label>
                <Input
                  value={user.name}
                  readOnly
                  disabled
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCareForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddCare}
                  disabled={!careForm.name.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {careActions.length > 0 ? (
            <div className="divide-y">
              {careActions.map((a) => (
                <div key={a.id} className="py-3 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{a.name}</span>
                    {a.requiresPhoto && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Camera className="size-3" />
                        Photo
                      </Badge>
                    )}
                    {!a.active && (
                      <Badge variant="secondary" className="text-[10px]">
                        Stopped
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {describeSchedule(a)}
                  </p>
                  {a.staffInstructions && (
                    <p className="text-muted-foreground mt-1 text-xs italic">
                      {a.staffInstructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-center text-sm">
              No care actions yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2B.3 — Medications */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-base">
              <Pill className="size-4" />
              Medications
              <Badge variant="secondary" className="text-[10px]">
                {medications.length}
              </Badge>
            </Label>
            {!locked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMedForm((v) => !v)}
              >
                <Plus className="mr-1 size-4" />
                Add Medication
              </Button>
            )}
          </div>

          {showMedForm && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={medForm.name}
                    onChange={(e) =>
                      setMedForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Amoxicillin"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dosage</Label>
                  <Input
                    value={medForm.dosage}
                    onChange={(e) =>
                      setMedForm((p) => ({ ...p, dosage: e.target.value }))
                    }
                    placeholder="e.g. 250mg"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={medForm.medType}
                    onValueChange={(v) =>
                      setMedForm((p) => ({
                        ...p,
                        medType: v as IncidentMedType,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MED_TYPE_OPTIONS.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="text-xs"
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Frequency</Label>
                  <Input
                    value={medForm.frequency}
                    onChange={(e) =>
                      setMedForm((p) => ({ ...p, frequency: e.target.value }))
                    }
                    placeholder="e.g. Twice daily"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Instructions</Label>
                <Textarea
                  value={medForm.instructions}
                  onChange={(e) =>
                    setMedForm((p) => ({ ...p, instructions: e.target.value }))
                  }
                  placeholder="e.g. Give with food"
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <Checkbox
                    checked={medForm.critical}
                    onCheckedChange={(v) =>
                      setMedForm((p) => ({ ...p, critical: v === true }))
                    }
                  />
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  Critical medication
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <Checkbox
                    checked={medForm.chargeFee}
                    onCheckedChange={(v) =>
                      setMedForm((p) => ({ ...p, chargeFee: v === true }))
                    }
                  />
                  Charge a fee
                </label>
              </div>
              {medForm.chargeFee && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Fee type</Label>
                    <Select
                      value={medForm.feeType}
                      onValueChange={(v) =>
                        setMedForm((p) => ({
                          ...p,
                          feeType: v as IncidentMedFeeType,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_admin" className="text-xs">
                          Per administration
                        </SelectItem>
                        <SelectItem value="one_time" className="text-xs">
                          One-time
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Amount ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={medForm.feeAmount}
                      onChange={(e) =>
                        setMedForm((p) => ({
                          ...p,
                          feeAmount: Number(e.target.value),
                        }))
                      }
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMedForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddMed}
                  disabled={!medForm.name.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {medications.length > 0 ? (
            <div className="divide-y">
              {medications.map((m) => (
                <div key={m.id} className="py-3 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{m.name}</span>
                    {m.critical && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400"
                      >
                        <AlertTriangle className="size-3" />
                        Critical
                      </Badge>
                    )}
                    {m.chargeFee && (
                      <Badge variant="secondary" className="text-[10px]">
                        ${(m.feeAmount ?? 0).toFixed(2)}{" "}
                        {m.feeType === "one_time" ? "one-time" : "per admin"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                    {m.dosage} · {m.medType} · {m.frequency}
                  </p>
                  {m.instructions && (
                    <p className="text-muted-foreground mt-1 text-xs italic">
                      {m.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-center text-sm">
              No medications yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2B.4 — Care Log */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" />
              Completed Care Log
              <Badge variant="secondary" className="text-[10px]">
                {incident.careLogs.length}
              </Badge>
            </Label>
          </div>
          <p className="text-muted-foreground text-xs">
            Full audit trail — every care action and medication logged, newest
            first. Append-only.
          </p>

          {sortedLogs.length > 0 ? (
            <div className="space-y-2">
              {sortedLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-muted/40 flex items-start gap-3 rounded-lg p-3"
                >
                  {log.photoUrl ? (
                    <div className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                      <ImageIcon className="text-muted-foreground size-5" />
                    </div>
                  ) : (
                    <Clock className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium">{targetLabel(log)}</span>
                      <span className="text-muted-foreground">
                        {new Date(log.loggedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        · {log.loggedBy}
                      </span>
                    </div>
                    {log.note && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {log.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-center text-sm">
              No care logged yet — entries appear here as staff log care from
              Daily Care or the booking overview.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
