"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Droplets,
  Utensils,
  Pill,
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  Star,
  Stethoscope,
} from "lucide-react";
import type {
  LogModalState,
  ScheduledTask,
  PottyOutcome,
  FeedingOutcome,
  MedicationOutcome,
  MissedMedReason,
  AddonOutcome,
} from "./guest-journal";

type SubmitData = {
  outcome: string;
  staffInitials: string;
  notes?: string;
  missedReason?: string;
  isServeStep?: boolean;
};

type Props = {
  modal: LogModalState;
  onClose: () => void;
  onSubmit: (task: ScheduledTask, data: SubmitData) => void;
};

// ── Outcome Button ────────────────────────────────────────────────────────────

function OutcomeBtn({
  value,
  label,
  selected,
  variant,
  onClick,
}: {
  value: string;
  label: string;
  selected: boolean;
  variant?: "danger" | "warning" | "success" | "neutral";
  onClick: () => void;
}) {
  const base =
    "flex-1 min-w-[calc(50%-4px)] rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all cursor-pointer text-center";
  const styles = {
    danger: selected
      ? "border-red-500 bg-red-500 text-white"
      : "border-red-200 bg-red-50/50 text-red-700 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400",
    warning: selected
      ? "border-amber-500 bg-amber-500 text-white"
      : "border-amber-200 bg-amber-50/50 text-amber-700 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
    success: selected
      ? "border-green-500 bg-green-500 text-white"
      : "border-green-200 bg-green-50/50 text-green-700 hover:border-green-400 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400",
    neutral: selected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-muted/30 text-foreground hover:border-primary/50",
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${styles[variant ?? "neutral"]}`}
    >
      {label}
    </button>
  );
}

// ── Potty Form ────────────────────────────────────────────────────────────────

function PottyForm({
  task,
  onSubmit,
  onClose,
}: {
  task: ScheduledTask;
  onSubmit: (data: SubmitData) => void;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<PottyOutcome | "">("");
  const [staffInitials, setStaffInitials] = useState("");
  const [notes, setNotes] = useState("");

  const pottyOptions: {
    value: PottyOutcome;
    label: string;
    variant: "success" | "warning" | "danger" | "neutral";
  }[] = [
    { value: "pee", label: "💧 Pee", variant: "neutral" },
    { value: "poop", label: "✅ Poop", variant: "success" },
    { value: "both", label: "✅ Pee + Poop", variant: "success" },
    { value: "nothing", label: "🚫 Nothing", variant: "neutral" },
    { value: "diarrhea", label: "⚠ Diarrhea", variant: "danger" },
    { value: "soft_stool", label: "⚠ Soft Stool", variant: "warning" },
    { value: "vomit_noticed", label: "⚠ Vomit", variant: "danger" },
  ];

  const isConcern =
    outcome === "diarrhea" ||
    outcome === "soft_stool" ||
    outcome === "vomit_noticed";

  return (
    <div className="space-y-4">
      {/* Pet context */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Droplets className="size-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-semibold">{task.petName}</p>
          <p className="text-muted-foreground text-xs">{task.kennelName}</p>
        </div>
      </div>

      {/* Outcome */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">What happened?</Label>
        <div className="flex flex-wrap gap-2">
          {pottyOptions.map((opt) => (
            <OutcomeBtn
              key={opt.value}
              value={opt.value}
              label={opt.label}
              selected={outcome === opt.value}
              variant={opt.variant}
              onClick={() => setOutcome(opt.value)}
            />
          ))}
        </div>
      </div>

      {isConcern && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">
            This will trigger a supervisor alert. Please add notes below.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Staff Initials</Label>
        <Input
          value={staffInitials}
          onChange={(e) => setStaffInitials(e.target.value.toUpperCase())}
          placeholder="e.g. SJ"
          maxLength={3}
          className="uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations..."
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!outcome || !staffInitials}
          onClick={() =>
            onSubmit({ outcome, staffInitials, notes: notes || undefined })
          }
        >
          <CheckCircle className="mr-2 size-4" />
          Save Log
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Feeding Serve Form ────────────────────────────────────────────────────────

function FeedingServeForm({
  task,
  onSubmit,
  onClose,
}: {
  task: ScheduledTask;
  onSubmit: (data: SubmitData) => void;
  onClose: () => void;
}) {
  const [staffInitials, setStaffInitials] = useState("");

  return (
    <div className="space-y-4">
      {/* Meal details card */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Utensils className="size-4 text-green-600" />
          <span className="font-semibold text-sm">{task.details}</span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs ml-auto">
            <Clock className="size-3" />
            {task.scheduledTime}
          </span>
        </div>
        {task.subDetails?.map((d, i) => (
          <p
            key={i}
            className={`text-sm ${
              d.startsWith("⚠")
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {d}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Staff Initials</Label>
        <Input
          value={staffInitials}
          onChange={(e) => setStaffInitials(e.target.value.toUpperCase())}
          placeholder="e.g. SJ"
          maxLength={3}
          className="uppercase"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!staffInitials}
          onClick={() =>
            onSubmit({ outcome: "", staffInitials, isServeStep: true })
          }
        >
          <Utensils className="mr-2 size-4" />
          Mark as Served
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Feeding Outcome Form ──────────────────────────────────────────────────────

function FeedingOutcomeForm({
  task,
  onSubmit,
}: {
  task: ScheduledTask;
  onSubmit: (data: SubmitData) => void;
}) {
  const [outcome, setOutcome] = useState<FeedingOutcome | "">("");
  const [staffInitials, setStaffInitials] = useState("");
  const [notes, setNotes] = useState("");

  const options: {
    value: FeedingOutcome;
    label: string;
    variant: "success" | "warning" | "danger" | "neutral";
  }[] = [
    { value: "ate_all", label: "✅ Ate All", variant: "success" },
    { value: "ate_half", label: "🍽 Ate Half", variant: "warning" },
    { value: "refused", label: "✗ Refused", variant: "danger" },
    { value: "vomited_after", label: "⚠ Vomited After", variant: "danger" },
    { value: "slow_eater", label: "🐌 Slow Eater", variant: "neutral" },
  ];

  const isConcern =
    outcome === "refused" || outcome === "vomited_after";

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center dark:bg-amber-900/20 dark:border-amber-800">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Food served for {task.petName} ✓
        </p>
        <p className="text-muted-foreground text-xs mt-0.5">
          How much did {task.petName} eat?
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <OutcomeBtn
            key={opt.value}
            value={opt.value}
            label={opt.label}
            selected={outcome === opt.value}
            variant={opt.variant}
            onClick={() => setOutcome(opt.value)}
          />
        ))}
      </div>

      {isConcern && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">
            This will flag a supervisor alert. Notes are recommended.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Staff Initials</Label>
        <Input
          value={staffInitials}
          onChange={(e) => setStaffInitials(e.target.value.toUpperCase())}
          placeholder="e.g. SJ"
          maxLength={3}
          className="uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations..."
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button
          disabled={!outcome || !staffInitials}
          onClick={() =>
            onSubmit({
              outcome,
              staffInitials,
              notes: notes || undefined,
            })
          }
          className="w-full"
        >
          <CheckCircle className="mr-2 size-4" />
          Save Intake Log
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Medication Form ───────────────────────────────────────────────────────────

function MedicationForm({
  task,
  onSubmit,
  onClose,
}: {
  task: ScheduledTask;
  onSubmit: (data: SubmitData) => void;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<MedicationOutcome | "">("");
  const [staffInitials, setStaffInitials] = useState("");
  const [notes, setNotes] = useState("");
  const [missedReason, setMissedReason] = useState<MissedMedReason | "">("");
  const [photoTaken, setPhotoTaken] = useState(false);

  const isMissed = outcome === "missed";

  const medOptions: {
    value: MedicationOutcome;
    label: string;
    variant: "success" | "warning" | "danger" | "neutral";
  }[] = [
    { value: "administered", label: "✅ Administered", variant: "success" },
    { value: "refused", label: "✗ Refused", variant: "danger" },
    { value: "spit_out", label: "💊 Spit Out", variant: "warning" },
    { value: "delayed", label: "⏱ Delayed", variant: "warning" },
    { value: "missed", label: "✗ Missed", variant: "danger" },
  ];

  const missedReasons: { value: MissedMedReason; label: string }[] = [
    { value: "dog_refused", label: "Dog Refused" },
    { value: "out_of_stock", label: "Out of Stock" },
    { value: "staff_forgot", label: "Staff Forgot" },
    { value: "vomited", label: "Vomited After" },
    { value: "other", label: "Other (see notes)" },
  ];

  const canSubmit =
    outcome &&
    staffInitials &&
    (!isMissed || !!missedReason) &&
    (!task.requiresPhotoProof ||
      outcome !== "administered" ||
      photoTaken);

  return (
    <div className="space-y-4">
      {/* Med details */}
      <div className="rounded-xl border bg-purple-50/50 p-4 space-y-1 dark:bg-purple-900/10">
        <div className="flex items-center gap-2">
          <Pill className="size-4 text-purple-600 dark:text-purple-400" />
          <span className="font-semibold text-purple-800 dark:text-purple-300">
            {task.details}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs ml-auto">
            <Clock className="size-3" />
            {task.scheduledTime}
          </span>
        </div>
        {task.subDetails?.map((d, i) => (
          <p key={i} className="text-muted-foreground text-xs">{d}</p>
        ))}
      </div>

      {/* Outcome */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Outcome</Label>
        <div className="flex flex-wrap gap-2">
          {medOptions.map((opt) => (
            <OutcomeBtn
              key={opt.value}
              value={opt.value}
              label={opt.label}
              selected={outcome === opt.value}
              variant={opt.variant}
              onClick={() => setOutcome(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* Missed reason */}
      {isMissed && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-red-700 dark:text-red-400">
            Reason Required *
          </Label>
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-900/10">
            <Select
              value={missedReason}
              onValueChange={(v) => setMissedReason(v as MissedMedReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {missedReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground mt-2 text-xs">
              This is required for legal record-keeping.
            </p>
          </div>
        </div>
      )}

      {/* Photo proof */}
      {task.requiresPhotoProof && outcome === "administered" && (
        <button
          onClick={() => setPhotoTaken(!photoTaken)}
          data-taken={photoTaken}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all data-[taken=true]:border-green-400 data-[taken=true]:bg-green-50 data-[taken=false]:border-amber-300 data-[taken=false]:bg-amber-50/50 dark:data-[taken=true]:border-green-700 dark:data-[taken=true]:bg-green-900/20 dark:data-[taken=false]:border-amber-700 dark:data-[taken=false]:bg-amber-900/10"
        >
          <Camera
            data-taken={photoTaken}
            className="size-5 data-[taken=true]:text-green-600 data-[taken=false]:text-amber-600"
          />
          <div className="text-left">
            <p className="text-sm font-semibold">
              {photoTaken ? "✓ Photo proof taken" : "Photo proof required"}
            </p>
            <p className="text-muted-foreground text-xs">
              {photoTaken ? "Tap to unmark" : "Tap to confirm photo was taken"}
            </p>
          </div>
        </button>
      )}

      <div className="space-y-2">
        <Label>Staff Initials</Label>
        <Input
          value={staffInitials}
          onChange={(e) => setStaffInitials(e.target.value.toUpperCase())}
          placeholder="e.g. SJ"
          maxLength={3}
          className="uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes {isMissed && "(required for missed)"}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations..."
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              outcome,
              staffInitials,
              notes: notes || undefined,
              missedReason: isMissed
                ? (missedReason as MissedMedReason)
                : undefined,
            })
          }
        >
          <CheckCircle className="mr-2 size-4" />
          Save Log
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Care Form ─────────────────────────────────────────────────────────────────

type CareOutcomeOption = {
  value: string;
  label: string;
  variant: "success" | "warning" | "danger" | "neutral";
};

const CARE_OUTCOMES: Record<string, CareOutcomeOption[]> = {
  water_refill: [
    { value: "refilled",   label: "💧 Refilled",    variant: "success" },
    { value: "guest_away", label: "— Away/Out",      variant: "neutral" },
    { value: "skipped",    label: "— Skipped",       variant: "neutral" },
  ],
  crate_clean: [
    { value: "cleaned",       label: "✅ Cleaned",         variant: "success" },
    { value: "accident_found",label: "⚠ Accident Found",  variant: "danger"  },
    { value: "skipped",       label: "— Skipped",          variant: "neutral" },
  ],
  bedding_change: [
    { value: "changed",    label: "✅ Changed",    variant: "success" },
    { value: "not_needed", label: "— Not Needed", variant: "neutral" },
    { value: "skipped",    label: "— Skipped",    variant: "neutral" },
  ],
  monitoring: [
    { value: "normal",          label: "✅ Normal",            variant: "success" },
    { value: "concern_flagged", label: "⚠ Concern Flagged",   variant: "warning" },
    { value: "emergency",       label: "⛔ Emergency",          variant: "danger"  },
  ],
  heat_tracking: [
    { value: "normal",            label: "✅ Normal",                variant: "success" },
    { value: "heavy_discharge",   label: "⚠ Heavy Discharge",      variant: "warning" },
    { value: "behavioral_change", label: "⚠ Behavioral Change",    variant: "warning" },
  ],
};

function CareForm({
  task,
  onSubmit,
  onClose,
}: {
  task: ScheduledTask;
  onSubmit: (data: SubmitData) => void;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState("");
  const [staffInitials, setStaffInitials] = useState("");
  const [notes, setNotes] = useState("");

  const options = CARE_OUTCOMES[task.subType ?? ""] ?? [];
  const isConcern = ["accident_found", "concern_flagged", "emergency", "heavy_discharge", "behavioral_change"].includes(outcome);

  return (
    <div className="space-y-4">
      {/* Task card */}
      <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" />
          <span className="font-semibold text-sm">{task.details}</span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs ml-auto">
            <Clock className="size-3" />
            {task.scheduledTime}
          </span>
        </div>
        {task.subDetails?.map((d, i) => (
          <p key={i} className="text-muted-foreground text-xs">{d}</p>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Outcome</Label>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <OutcomeBtn
              key={opt.value}
              value={opt.value}
              label={opt.label}
              selected={outcome === opt.value}
              variant={opt.variant}
              onClick={() => setOutcome(opt.value)}
            />
          ))}
        </div>
      </div>

      {isConcern && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">
            This will flag a supervisor alert. Please add notes.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Staff Initials</Label>
        <Input
          value={staffInitials}
          onChange={(e) => setStaffInitials(e.target.value.toUpperCase())}
          placeholder="e.g. SJ"
          maxLength={3}
          className="uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations..."
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!outcome || !staffInitials}
          onClick={() => onSubmit({ outcome, staffInitials, notes: notes || undefined })}
        >
          <CheckCircle className="mr-2 size-4" />
          Save Log
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Addon Form ────────────────────────────────────────────────────────────────

function AddonForm({
  task,
  onSubmit,
  onClose,
}: {
  task: ScheduledTask;
  onSubmit: (data: SubmitData) => void;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<AddonOutcome | "">("");
  const [staffInitials, setStaffInitials] = useState("");
  const [notes, setNotes] = useState("");

  const options: {
    value: AddonOutcome;
    label: string;
    variant: "success" | "warning" | "danger" | "neutral";
  }[] = [
    { value: "completed",   label: "✅ Completed",     variant: "success" },
    { value: "partial",     label: "🔶 Partial",        variant: "warning" },
    { value: "rescheduled", label: "🔄 Rescheduled",    variant: "neutral" },
    { value: "dog_refused", label: "✗ Dog Refused",     variant: "danger"  },
    { value: "skipped",     label: "— Skipped",         variant: "neutral" },
  ];

  return (
    <div className="space-y-4">
      {/* Service card */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-emerald-500" />
          <span className="font-semibold text-sm">{task.details}</span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs ml-auto">
            <Clock className="size-3" />
            {task.scheduledTime}
          </span>
        </div>
        {task.subDetails?.map((d, i) => (
          <p key={i} className="text-muted-foreground text-xs">{d}</p>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Outcome</Label>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <OutcomeBtn
              key={opt.value}
              value={opt.value}
              label={opt.label}
              selected={outcome === opt.value}
              variant={opt.variant}
              onClick={() => setOutcome(opt.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Staff Initials</Label>
        <Input
          value={staffInitials}
          onChange={(e) => setStaffInitials(e.target.value.toUpperCase())}
          placeholder="e.g. SJ"
          maxLength={3}
          className="uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it go?"
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!outcome || !staffInitials}
          onClick={() => onSubmit({ outcome, staffInitials, notes: notes || undefined })}
        >
          <CheckCircle className="mr-2 size-4" />
          Save Log
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── TaskLogModal ──────────────────────────────────────────────────────────────

export function TaskLogModal({ modal, onClose, onSubmit }: Props) {
  const { open, task, feedingStep } = modal;

  // Reset form when modal opens on a new task
  useEffect(() => {
    if (!open) return;
  }, [open, task?.id]);

  if (!task) return null;

  const getTitle = () => {
    if (task.taskType === "potty")
      return `Potty Break — ${task.petName}`;
    if (task.taskType === "feeding") {
      if (feedingStep === "serve")
        return `Serve ${task.details} — ${task.petName}`;
      return `Intake — ${task.petName}`;
    }
    if (task.taskType === "addon")
      return `${task.details} — ${task.petName}`;
    if (task.taskType === "care")
      return `${task.details} — ${task.petName}`;
    return `Medication — ${task.petName}`;
  };

  const getIcon = () => {
    if (task.taskType === "potty")
      return <Droplets className="size-5 text-blue-500" />;
    if (task.taskType === "feeding")
      return <Utensils className="size-5 text-green-500" />;
    if (task.taskType === "addon")
      return <Star className="size-5 text-emerald-500" />;
    if (task.taskType === "care")
      return <Stethoscope className="size-5 text-primary" />;
    return <Pill className="size-5 text-purple-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        {task.taskType === "potty" && (
          <PottyForm
            task={task}
            onSubmit={(data) => onSubmit(task, data)}
            onClose={onClose}
          />
        )}
        {task.taskType === "feeding" && feedingStep === "serve" && (
          <FeedingServeForm
            task={task}
            onSubmit={(data) => onSubmit(task, data)}
            onClose={onClose}
          />
        )}
        {task.taskType === "feeding" && feedingStep === "outcome" && (
          <FeedingOutcomeForm
            task={task}
            onSubmit={(data) => onSubmit(task, data)}
          />
        )}
        {task.taskType === "medication" && (
          <MedicationForm
            task={task}
            onSubmit={(data) => onSubmit(task, data)}
            onClose={onClose}
          />
        )}
        {task.taskType === "addon" && (
          <AddonForm
            task={task}
            onSubmit={(data) => onSubmit(task, data)}
            onClose={onClose}
          />
        )}
        {task.taskType === "care" && (
          <CareForm
            task={task}
            onSubmit={(data) => onSubmit(task, data)}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
