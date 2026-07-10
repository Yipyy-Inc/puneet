"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, AlertTriangle, Ban, Clock } from "lucide-react";
import { outcomeBadgeClass } from "./outcome-meta";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { LogMeta } from "./LogMeta";
import { useCurrentUser } from "@/hooks/use-current-user";
import { staffMembers } from "@/data/staff";
import type {
  ScheduledTask,
  TaskExecution,
  AddonLogDetail,
  AddonGroupInteraction,
  AddonEnergyLevel,
  AddonIncidentSeverity,
} from "@/types/care-log";

const GROUP_INTERACTIONS: {
  value: AddonGroupInteraction;
  label: string;
  tone: "success" | "warning" | "danger";
}[] = [
  { value: "thrived", label: "Thrived", tone: "success" },
  { value: "good", label: "Good", tone: "success" },
  { value: "needed_monitoring", label: "Needed monitoring", tone: "warning" },
  { value: "separated", label: "Had to separate", tone: "danger" },
];

const ENERGY_LEVELS: { value: AddonEnergyLevel; label: string }[] = [
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
  { value: "lethargic", label: "Lethargic" },
];

const INCIDENT_SEVERITIES: {
  value: AddonIncidentSeverity;
  label: string;
  tone: "neutral" | "warning" | "danger";
}[] = [
  { value: "minor", label: "Minor", tone: "neutral" },
  { value: "notable", label: "Notable", tone: "warning" },
  { value: "serious", label: "Serious", tone: "danger" },
];

type Props = {
  open: boolean;
  task: ScheduledTask | null;
  /** When present, the modal opens pre-filled to edit this existing log. */
  existing?: TaskExecution;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: {
    outcome: string;
    notes?: string;
    staffName: string;
    staffInitials: string;
    /** Override log time as "HH:MM"; omitted means stamp the current time. */
    executedAt?: string;
    /** Set when the service could not be delivered — logs a missed service. */
    missedReason?: string;
    /** Whether to notify the owner about a missed service. */
    notifyOwner?: boolean;
    addon?: AddonLogDetail;
  }) => void;
};

/**
 * Dedicated Add-On log modal.
 *  • TOP — read-only from the booking: service name, booked duration, owner
 *    instructions.
 *  • BOTTOM — actual duration (pre-filled, editable), outcome/notes, the staff
 *    member who delivered, and Logged-by. Play sessions unlock group
 *    interaction, energy level, and an incident toggle. A "Cannot deliver
 *    today" path logs the missed service with a required reason.
 */
export function AddOnLogModal({
  open,
  task,
  existing,
  onOpenChange,
  onSubmit,
}: Props) {
  const { user } = useCurrentUser();
  const activeStaff = staffMembers.filter((s) => s.isActive);

  const [mode, setMode] = useState<"deliver" | "cannot">("deliver");
  const [actualMinutes, setActualMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [groupInteraction, setGroupInteraction] = useState<
    AddonGroupInteraction | ""
  >("");
  const [energyLevel, setEnergyLevel] = useState<AddonEnergyLevel | "">("");
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentSeverity, setIncidentSeverity] =
    useState<AddonIncidentSeverity>("minor");
  const [incidentNote, setIncidentNote] = useState("");
  const [reason, setReason] = useState("");
  const [notifyOwner, setNotifyOwner] = useState(false);
  const [nowValue, setNowValue] = useState("");
  const [logTime, setLogTime] = useState("");

  const detail = task?.addonDetail;
  const bookedMinutes = detail?.bookedMinutes;

  // On open: seed from the existing execution when editing, otherwise clear and
  // pre-fill actual duration from the booked duration.
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    // Capturing the wall clock at open time is a legitimate on-open reset, not
    // a cascading-render smell — the modal stays mounted between opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowValue(
      `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`,
    );
    if (existing) {
      const a = existing.addon;
      setMode(existing.missedReason ? "cannot" : "deliver");
      setActualMinutes(
        a?.actualMinutes != null
          ? String(a.actualMinutes)
          : bookedMinutes != null
            ? String(bookedMinutes)
            : "",
      );
      setNotes(existing.notes ?? "");
      setDeliveredBy(a?.deliveredByStaffId ?? "");
      setGroupInteraction(a?.groupInteraction ?? "");
      setEnergyLevel(a?.energyLevel ?? "");
      setIncidentOpen(Boolean(a?.incident));
      setIncidentSeverity(a?.incident?.severity ?? "minor");
      setIncidentNote(a?.incident?.note ?? "");
      setReason(existing.missedReason ?? "");
      setNotifyOwner(false);
      setLogTime(existing.executedAt);
    } else {
      setMode("deliver");
      setActualMinutes(bookedMinutes != null ? String(bookedMinutes) : "");
      setNotes("");
      setDeliveredBy("");
      setGroupInteraction("");
      setEnergyLevel("");
      setIncidentOpen(false);
      setIncidentSeverity("minor");
      setIncidentNote("");
      setReason("");
      setNotifyOwner(false);
      setLogTime("");
    }
  }, [open, task?.id, existing, bookedMinutes]);

  if (!task) return null;

  const meta = metaFor(task.taskType, task.subType);
  const Icon = meta.Icon;
  const serviceName = detail?.name ?? task.details;
  const instructions = detail?.instructions;
  const isPlaySession = detail?.isPlaySession ?? false;

  const minutesValue = Number(actualMinutes);
  const minutesOk =
    actualMinutes !== "" && Number.isFinite(minutesValue) && minutesValue > 0;
  const incidentOk = !incidentOpen || incidentNote.trim().length > 0;

  const canSubmit =
    mode === "cannot" ? reason.trim().length > 0 : minutesOk && incidentOk;

  function handleSubmit() {
    if (mode === "cannot") {
      onSubmit({
        outcome: "skipped",
        notes: notes.trim() || undefined,
        staffName: user.name,
        staffInitials: user.initials,
        executedAt: logTime || undefined,
        missedReason: reason.trim(),
        notifyOwner,
      });
      onOpenChange(false);
      return;
    }
    const staff = activeStaff.find((s) => s.id === deliveredBy);
    const addon: AddonLogDetail = {
      actualMinutes: minutesOk ? minutesValue : undefined,
      deliveredByStaffId: deliveredBy || undefined,
      deliveredByName: staff?.name,
      groupInteraction: isPlaySession
        ? groupInteraction || undefined
        : undefined,
      energyLevel: isPlaySession ? energyLevel || undefined : undefined,
      incident:
        incidentOpen && incidentNote.trim()
          ? { severity: incidentSeverity, note: incidentNote.trim() }
          : undefined,
    };
    onSubmit({
      outcome: "completed",
      notes: notes.trim() || undefined,
      staffName: user.name,
      staffInitials: user.initials,
      executedAt: logTime || undefined,
      addon,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
            >
              <Icon className={`size-5 ${meta.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">
                {existing ? "Edit" : "Log"} add-on
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {task.petName} · {task.kennelName} ·{" "}
                {format12h(task.scheduledTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
          {/* ── TOP: read-only service detail from the booking ────────────── */}
          <div className="bg-muted/40 space-y-2 rounded-md border p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4" />
              {serviceName}
            </p>
            <dl className="space-y-1 text-xs">
              {bookedMinutes != null && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-24 shrink-0">
                    Booked duration
                  </dt>
                  <dd className="min-w-0 flex-1 font-medium">
                    {bookedMinutes} min
                  </dd>
                </div>
              )}
              {instructions && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-24 shrink-0">
                    Owner instructions
                  </dt>
                  <dd className="min-w-0 flex-1">{instructions}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="border-t" />

          {mode === "cannot" ? (
            /* ── Cannot deliver: missed-service path ─────────────────────── */
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <Ban className="size-4 shrink-0" />
                Logging this service as not delivered today.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cannot-reason" className="text-xs">
                  Reason{" "}
                  <span className="text-muted-foreground font-normal">
                    (required)
                  </span>
                </Label>
                <Textarea
                  id="cannot-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why couldn't it be delivered? (weather, staffing, pet unwell...)"
                  className="resize-none"
                  aria-invalid={reason.trim().length === 0}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={notifyOwner}
                  onCheckedChange={(v) => setNotifyOwner(v === true)}
                />
                Notify the owner about the missed service
              </label>
              <button
                type="button"
                onClick={() => setMode("deliver")}
                className="text-primary text-xs hover:underline"
              >
                ← Back to delivery
              </button>
            </div>
          ) : (
            /* ── Deliver: the standard log zone ──────────────────────────── */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="actual-minutes" className="text-xs">
                  Actual duration (minutes)
                </Label>
                <div className="relative">
                  <Clock className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    id="actual-minutes"
                    type="number"
                    min={1}
                    value={actualMinutes}
                    onChange={(e) => setActualMinutes(e.target.value)}
                    className="pl-8"
                    aria-invalid={!minutesOk}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="delivered-by" className="text-xs">
                  Staff member who delivered
                </Label>
                <Select value={deliveredBy} onValueChange={setDeliveredBy}>
                  <SelectTrigger id="delivered-by" className="w-full">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addon-notes" className="text-xs">
                  Outcome / notes{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="addon-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="How did it go?"
                  className="resize-none"
                />
              </div>

              {isPlaySession && (
                <div className="space-y-3 rounded-md border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                    Play session
                  </p>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Group interaction</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {GROUP_INTERACTIONS.map((g) => {
                        const selected = groupInteraction === g.value;
                        return (
                          <button
                            key={g.value}
                            type="button"
                            onClick={() =>
                              setGroupInteraction(selected ? "" : g.value)
                            }
                            data-selected={selected}
                            className="rounded-md border px-2.5 py-1 text-xs font-medium transition-all data-[selected=false]:opacity-60 data-[selected=true]:ring-2 data-[selected=true]:ring-offset-1"
                          >
                            <Badge
                              variant="outline"
                              className={outcomeBadgeClass(g.tone)}
                            >
                              {g.label}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Energy level</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {ENERGY_LEVELS.map((e) => {
                        const selected = energyLevel === e.value;
                        return (
                          <button
                            key={e.value}
                            type="button"
                            onClick={() =>
                              setEnergyLevel(selected ? "" : e.value)
                            }
                            data-selected={selected}
                            className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 data-[selected=false]:text-muted-foreground rounded-md border px-2.5 py-1 text-xs font-medium transition-all data-[selected=true]:ring-1"
                          >
                            {e.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={incidentOpen}
                      onCheckedChange={(v) => setIncidentOpen(v === true)}
                    />
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="size-4 text-amber-500" />
                      Any incidents
                    </span>
                  </label>

                  {incidentOpen && (
                    <div className="space-y-3 pl-6">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Severity</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {INCIDENT_SEVERITIES.map((s) => {
                            const selected = incidentSeverity === s.value;
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => setIncidentSeverity(s.value)}
                                data-selected={selected}
                                className="rounded-md border px-2.5 py-1 text-xs font-medium transition-all data-[selected=false]:opacity-60 data-[selected=true]:ring-2 data-[selected=true]:ring-offset-1"
                              >
                                <Badge
                                  variant="outline"
                                  className={outcomeBadgeClass(s.tone)}
                                >
                                  {s.label}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="incident-note" className="text-xs">
                          What happened?
                        </Label>
                        <Textarea
                          id="incident-note"
                          value={incidentNote}
                          onChange={(e) => setIncidentNote(e.target.value)}
                          rows={2}
                          placeholder="Describe the incident for the manager..."
                          className="resize-none"
                          aria-invalid={incidentOpen && !incidentOk}
                        />
                        <p className="text-muted-foreground text-[11px]">
                          Flags {task.petName} for attention and notifies the
                          manager.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setMode("cannot")}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:underline dark:text-red-400"
              >
                <Ban className="size-3.5" />
                Cannot deliver today
              </button>
            </div>
          )}

          <LogMeta nowValue={nowValue} value={logTime} onChange={setLogTime} />

          <p className="text-muted-foreground text-xs">
            Logged by:{" "}
            <span className="text-foreground font-medium">{user.name}</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {mode === "cannot"
              ? "Log missed service"
              : existing
                ? "Update log"
                : "Save log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
