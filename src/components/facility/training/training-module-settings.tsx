"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Bell,
  BookOpen,
  Building,
  CalendarClock,
  Check,
  ClipboardCheck,
  Edit,
  FileSignature,
  GraduationCap,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Plus,
  Save,
  Settings as SettingsIcon,
  Sun,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import {
  DURATION_OPTIONS,
  REPORT_CARD_SEND_MODE_HELP,
  REPORT_CARD_SEND_MODE_LABELS,
  defaultTrainingModuleSettings,
  type ReportCardSendMode,
  type TrainingLocation,
  type TrainingModuleSettings,
} from "@/lib/training-module-settings";
import { defaultTrainingWaivers } from "@/data/training-waivers";

// Module-level seed for newly-created location ids — keeps writes pure for
// the React Compiler (no Date.now() inside render).
let newLocationSeed = 0;
function nextLocationId(): string {
  newLocationSeed += 1;
  return `loc-custom-${newLocationSeed}`;
}

export function TrainingModuleSettings() {
  const [draft, setDraft] = useState<TrainingModuleSettings>(
    defaultTrainingModuleSettings,
  );
  const [saved, setSaved] = useState<TrainingModuleSettings>(
    defaultTrainingModuleSettings,
  );
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<TrainingLocation | null>(
    null,
  );
  const [deletingLocation, setDeletingLocation] =
    useState<TrainingLocation | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  function update<K extends keyof TrainingModuleSettings>(
    key: K,
    value: TrainingModuleSettings[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateNotifications<
    K extends keyof TrainingModuleSettings["notifications"],
  >(key: K, value: TrainingModuleSettings["notifications"][K]) {
    setDraft((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  }

  function handleSave() {
    setSaved(draft);
    toast.success("Training module settings saved.");
  }

  function handleRevert() {
    setDraft(saved);
    toast.success("Reverted unsaved changes.");
  }

  function openAddLocation() {
    setEditingLocation(null);
    setLocationDialogOpen(true);
  }

  function openEditLocation(location: TrainingLocation) {
    setEditingLocation(location);
    setLocationDialogOpen(true);
  }

  function persistLocation(record: TrainingLocation) {
    setDraft((prev) => {
      const exists = prev.locations.some((l) => l.id === record.id);
      const locations = exists
        ? prev.locations.map((l) => (l.id === record.id ? record : l))
        : [...prev.locations, record];
      return { ...prev, locations };
    });
    setLocationDialogOpen(false);
    setEditingLocation(null);
  }

  function confirmDeleteLocation() {
    if (!deletingLocation) return;
    setDraft((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.id !== deletingLocation.id),
    }));
    toast.success(`"${deletingLocation.name}" removed`);
    setDeletingLocation(null);
  }

  return (
    <>
      <div className="space-y-6 pb-24">
        {/* ── Module ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="text-muted-foreground size-4" />
              Training module
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Master switches for the whole module. Turn off to hide
              training everywhere — staff and customer portal both.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label="Module enabled"
              description="When off, the Training nav and all training pages are hidden."
              checked={draft.enabled}
              onCheckedChange={(v) => update("enabled", v)}
            />
            <ToggleRow
              label="Visible to customers"
              description="Owners see the Training section in their portal when enabled."
              checked={draft.visibleToCustomers}
              onCheckedChange={(v) => update("visibleToCustomers", v)}
              disabled={!draft.enabled}
            />
          </CardContent>
        </Card>

        {/* ── Training locations ────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="text-muted-foreground size-4" />
                Training locations
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Physical rooms and outdoor areas where training happens. Used
                as the picker on the Series Create dialog.
              </p>
            </div>
            <Button onClick={openAddLocation} size="sm">
              <Plus className="mr-1.5 size-4" />
              Add location
            </Button>
          </CardHeader>
          <CardContent>
            {draft.locations.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
                No training locations yet — add one to start scheduling
                series.
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {draft.locations.map((location) => (
                  <li
                    key={location.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm",
                      !location.isActive && "opacity-70",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        location.type === "indoor"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {location.type === "indoor" ? (
                        <Home className="size-4" />
                      ) : (
                        <Sun className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {location.name}
                      </p>
                      <p className="text-muted-foreground mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 text-[11px]">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border text-[10px]",
                            location.type === "indoor"
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {location.type === "indoor" ? "Indoor" : "Outdoor"}
                        </Badge>
                        {location.capacity && (
                          <span className="inline-flex items-center gap-0.5">
                            <Users className="size-3" />
                            max {location.capacity}
                          </span>
                        )}
                        {!location.isActive && (
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                          >
                            Hidden
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEditLocation(location)}
                        title="Edit location"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-8"
                        onClick={() => setDeletingLocation(location)}
                        title="Delete location"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Session defaults ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="text-muted-foreground size-4" />
              Session defaults
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Prefilled values when staff create a new series. They can
              still override per-series.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Default session duration
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((mins) => {
                  const active = draft.defaultSessionDurationMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        update("defaultSessionDurationMinutes", mins)
                      }
                      data-active={active || undefined}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-slate-700 transition-colors",
                        "hover:bg-slate-100",
                        "data-active:border-slate-900 data-active:bg-slate-900 data-active:text-white",
                      )}
                    >
                      {mins} min
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold" htmlFor="default-class-size">
                Default group class size
              </Label>
              <Input
                id="default-class-size"
                type="number"
                min={1}
                max={50}
                value={draft.defaultClassSize}
                onChange={(e) =>
                  update(
                    "defaultClassSize",
                    Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                  )
                }
                className="max-w-32"
              />
              <p className="text-muted-foreground text-[11px]">
                Used as the default `maxCapacity` on new group series.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Enrollment ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="text-muted-foreground size-4" />
              Enrollment
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              How customers join. Each series can still override these via
              its own `enrollmentRules`.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label="Allow online enrollment"
              description="Customers can enroll their dogs through the portal without staff intervention."
              checked={draft.allowOnlineEnrollment}
              onCheckedChange={(v) => update("allowOnlineEnrollment", v)}
            />
            <ToggleRow
              label="Allow drop-ins globally"
              description="When off, the Book Drop-In Session button is hidden everywhere even when a series opts in."
              checked={draft.allowDropIns}
              onCheckedChange={(v) => update("allowDropIns", v)}
            />
            <ToggleRow
              label="Require evaluation before enrollment"
              description="Customers must complete a pre-enrollment evaluation before they can book advanced programs."
              checked={draft.requireEvaluationBeforeEnrollment}
              onCheckedChange={(v) =>
                update("requireEvaluationBeforeEnrollment", v)
              }
            />
            <div className="space-y-1.5 pt-2">
              <Label className="text-sm font-semibold" htmlFor="default-message">
                Default enrollment message
              </Label>
              <Textarea
                id="default-message"
                rows={3}
                value={draft.defaultEnrollmentMessage}
                onChange={(e) =>
                  update("defaultEnrollmentMessage", e.target.value)
                }
                placeholder="Welcome! We can't wait to meet your dog…"
              />
              <p className="text-muted-foreground text-[11px]">
                Surfaced in the enrollment confirmation email + the
                customer-portal confirmation modal.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Waivers ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="text-muted-foreground size-4" />
              Waiver requirements
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Toggle which waivers customers must sign before enrolling in
              any training class. Each card flips between Required and
              Optional independently.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {defaultTrainingWaivers.map((waiver) => {
                const overridden =
                  draft.waiverRequiredOverrides[waiver.id] !== undefined;
                const required = overridden
                  ? draft.waiverRequiredOverrides[waiver.id]!
                  : waiver.required;
                return (
                  <li
                    key={waiver.id}
                    className={cn(
                      "rounded-xl border bg-card p-3 shadow-sm",
                      required && "border-rose-200/70 bg-rose-50/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-800">
                            {waiver.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              required
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-slate-200 bg-slate-50 text-slate-600",
                            )}
                          >
                            {required ? "Required" : "Optional"}
                          </Badge>
                          {overridden && (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                              title="Overrides the catalog default"
                            >
                              Overridden
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-[12px]/relaxed">
                          {waiver.summary}
                        </p>
                      </div>
                      <Switch
                        checked={required}
                        onCheckedChange={(next) =>
                          setDraft((prev) => {
                            const overrides = { ...prev.waiverRequiredOverrides };
                            if (next === waiver.required) {
                              // Back to catalog default — clear the override.
                              delete overrides[waiver.id];
                            } else {
                              overrides[waiver.id] = next;
                            }
                            return {
                              ...prev,
                              waiverRequiredOverrides: overrides,
                            };
                          })
                        }
                        aria-label={`Toggle ${waiver.title} required`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* ── Report cards ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="text-muted-foreground size-4" />
              Report cards
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              How fresh training report cards get drafted + delivered.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label="Auto-create on session completion"
              description="A draft report card is built automatically when a session is marked complete. Trainers can edit before sending."
              checked={draft.autoCreateReportCardOnSessionComplete}
              onCheckedChange={(v) =>
                update("autoCreateReportCardOnSessionComplete", v)
              }
            />
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Send to owner
              </Label>
              <RadioGroup
                value={draft.reportCardSendMode}
                onValueChange={(v) =>
                  update("reportCardSendMode", v as ReportCardSendMode)
                }
                className="grid grid-cols-1 gap-2 md:grid-cols-3"
              >
                {(Object.keys(REPORT_CARD_SEND_MODE_LABELS) as ReportCardSendMode[]).map(
                  (mode) => (
                    <label
                      key={mode}
                      htmlFor={`mode-${mode}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors",
                        draft.reportCardSendMode === mode
                          ? "border-slate-900 bg-slate-50"
                          : "hover:bg-slate-50/60",
                      )}
                    >
                      <RadioGroupItem
                        value={mode}
                        id={`mode-${mode}`}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {REPORT_CARD_SEND_MODE_LABELS[mode]}
                        </p>
                        <p className="text-muted-foreground text-[11px]/relaxed">
                          {REPORT_CARD_SEND_MODE_HELP[mode]}
                        </p>
                      </div>
                    </label>
                  ),
                )}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* ── Notifications ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="text-muted-foreground size-4" />
              Notifications
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Customer-facing reminders about sessions, homework, and
              report cards.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ToggleRow
                label="Email reminders"
                description=""
                icon={Mail}
                checked={draft.notifications.emailEnabled}
                onCheckedChange={(v) => updateNotifications("emailEnabled", v)}
              />
              <ToggleRow
                label="SMS reminders"
                description=""
                icon={MessageSquare}
                checked={draft.notifications.smsEnabled}
                onCheckedChange={(v) => updateNotifications("smsEnabled", v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-sm font-semibold"
                htmlFor="reminder-lead"
              >
                Reminder lead time
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="reminder-lead"
                  type="number"
                  min={1}
                  max={168}
                  value={draft.notifications.reminderLeadHours}
                  onChange={(e) =>
                    updateNotifications(
                      "reminderLeadHours",
                      Math.max(1, Math.min(168, Number(e.target.value) || 24)),
                    )
                  }
                  className="max-w-24"
                />
                <span className="text-muted-foreground text-[12px]">
                  hours before each session
                </span>
              </div>
            </div>
            <div className="space-y-2 border-t pt-3">
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                Event triggers
              </p>
              <ToggleRow
                label="Homework assigned"
                description="Email the owner when fresh homework is logged at session completion."
                checked={draft.notifications.homeworkAssigned}
                onCheckedChange={(v) =>
                  updateNotifications("homeworkAssigned", v)
                }
              />
              <ToggleRow
                label="Report card sent"
                description="Email the owner when a new training report card is delivered."
                checked={draft.notifications.reportCardSent}
                onCheckedChange={(v) =>
                  updateNotifications("reportCardSent", v)
                }
              />
              <ToggleRow
                label="Series cancelled"
                description="Email + SMS all enrolled owners when staff cancels a session or series."
                checked={draft.notifications.seriesCancelled}
                onCheckedChange={(v) =>
                  updateNotifications("seriesCancelled", v)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky save bar — only renders while there are unsaved changes so
          the form sits flush most of the time. */}
      {dirty && (
        <div className="bg-card sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 shadow-lg">
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px]">
            <SettingsIcon className="size-3.5" />
            You have unsaved changes.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRevert}>
              Revert
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1">
              <Save className="size-4" />
              Save changes
            </Button>
          </div>
        </div>
      )}

      <LocationDialog
        open={locationDialogOpen}
        onOpenChange={(o) => {
          setLocationDialogOpen(o);
          if (!o) setEditingLocation(null);
        }}
        editing={editingLocation}
        onSave={persistLocation}
      />

      <AlertDialog
        open={!!deletingLocation}
        onOpenChange={(o) => !o && setDeletingLocation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deletingLocation?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Series currently scheduled at this location will keep their
              text label, but staff won&apos;t be able to pick it again on
              new series.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLocation}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TrainingLocation | null;
  onSave: (location: TrainingLocation) => void;
}

function LocationDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: LocationDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"indoor" | "outdoor">("indoor");
  const [capacity, setCapacity] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setCapacity(editing.capacity?.toString() ?? "");
      setIsActive(editing.isActive);
    } else {
      setName("");
      setType("indoor");
      setCapacity("");
      setIsActive(true);
    }
  }, [open, editing]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required.");
      return;
    }
    const cap = capacity.trim() ? Number(capacity) : undefined;
    onSave({
      id: editing?.id ?? nextLocationId(),
      name: trimmed,
      type,
      capacity:
        cap !== undefined && !Number.isNaN(cap) && cap > 0 ? cap : undefined,
      isActive,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4" />
            {editing ? "Edit location" : "Add training location"}
          </DialogTitle>
          <DialogDescription>
            Physical rooms and outdoor areas where training happens.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Training Room A, Outdoor Field"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Type</Label>
            <div className="flex gap-1.5">
              <TypePill
                active={type === "indoor"}
                onClick={() => setType("indoor")}
                icon={Home}
                label="Indoor"
                tone="indigo"
              />
              <TypePill
                active={type === "outdoor"}
                onClick={() => setType("outdoor")}
                icon={Sun}
                label="Outdoor"
                tone="emerald"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              Capacity (optional)
            </Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 8"
              className="max-w-32"
            />
            <p className="text-muted-foreground text-[11px]">
              Surfaces as &quot;max N dogs&quot; on the series creation
              picker.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-muted-foreground text-xs">
                Hidden locations don&apos;t appear in the series-create
                picker but stay in this list for history.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editing ? "Save changes" : "Add location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TYPE_PILL_ACTIVE_CLS: Record<"indigo" | "emerald", string> = {
  indigo: "border-indigo-300 bg-indigo-50 text-indigo-800",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

function TypePill({
  active,
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Home;
  label: string;
  tone: "indigo" | "emerald";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active || undefined}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? TYPE_PILL_ACTIVE_CLS[tone]
          : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <Icon className="size-4" />
      {label}
      {active && <Check className="size-3.5" />}
    </button>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  icon?: typeof BookOpen;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({
  label,
  description,
  icon: Icon,
  checked,
  onCheckedChange,
  disabled,
}: ToggleRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-3 py-2",
        disabled && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
          {Icon && <Icon className="text-muted-foreground size-3.5" />}
          {label}
        </p>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-[11.5px]/relaxed">
            {description}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
