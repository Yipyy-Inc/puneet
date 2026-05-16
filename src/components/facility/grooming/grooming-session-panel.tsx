"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ClipboardEdit,
  Smile,
  Flag,
  UtensilsCrossed,
  Pill,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { petQueries } from "@/lib/api/pet";
import { getGroomingPhotoRequirements } from "@/lib/api/grooming";
import type {
  BehaviorTag,
  CareLogEntry,
  GroomingAppointment,
  GroomingIntake,
  GroomingPhoto,
  SessionIssue,
  SessionIssueKind,
} from "@/types/grooming";

const BEHAVIOR_OPTIONS: { value: BehaviorTag; label: string; emoji: string }[] =
  [
    { value: "calm", label: "Calm", emoji: "🟢" },
    { value: "happy", label: "Happy", emoji: "😊" },
    { value: "anxious", label: "Anxious", emoji: "😟" },
    { value: "energetic", label: "Energetic", emoji: "⚡" },
    { value: "reactive", label: "Reactive", emoji: "⚠️" },
    { value: "needed-muzzle", label: "Needed muzzle", emoji: "🛡️" },
  ];

const ISSUE_META: Record<
  SessionIssueKind,
  { label: string; icon: React.ElementType; urgent: boolean }
> = {
  "matting-found": { label: "Matting found", icon: Flag, urgent: false },
  "skin-condition": {
    label: "Skin condition noticed",
    icon: ShieldAlert,
    urgent: false,
  },
  "ear-issue": { label: "Ear issue", icon: Flag, urgent: false },
  "nail-issue": { label: "Nail issue", icon: Flag, urgent: false },
  "behavioral-concern": {
    label: "Behavioral concern",
    icon: AlertTriangle,
    urgent: true,
  },
  "injury-during-groom": {
    label: "Injury during groom",
    icon: AlertTriangle,
    urgent: true,
  },
};

/** Minutes between this start/end string pair — used to gate the Care section. */
function durationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

const LONG_APPOINTMENT_MIN_MINUTES = 90;

interface GroomingSessionPanelProps {
  appointment: GroomingAppointment;
  /** Notifies parent so the page header can reflect saved state / unlock
   *  "Mark Ready" once the requirement is satisfied. */
  onChange?: (next: GroomingIntake) => void;
}

export function GroomingSessionPanel({
  appointment,
  onChange,
}: GroomingSessionPanelProps) {
  const { requireBeforePhotos, requireAfterPhotos } = useMemo(
    getGroomingPhotoRequirements,
    [],
  );

  const [photos, setPhotos] = useState<string[]>(
    appointment.intake?.beforePhotos ?? [],
  );
  const [afterPhotos, setAfterPhotos] = useState<GroomingPhoto[]>(
    appointment.afterPhotos ?? [],
  );
  const [notes, setNotes] = useState<string>(
    appointment.intake?.sessionNotes ?? "",
  );
  const [moods, setMoods] = useState<BehaviorTag[]>(
    appointment.intake?.moodTags ?? [],
  );
  const [issues, setIssues] = useState<SessionIssue[]>(
    appointment.intake?.issues ?? [],
  );
  const [issueDrafts, setIssueDrafts] = useState<
    Partial<Record<SessionIssueKind, string>>
  >({});
  const [careLog, setCareLog] = useState<CareLogEntry[]>(
    appointment.intake?.careLog ?? [],
  );
  const beforeInputRef = useRef<HTMLInputElement | null>(null);
  const afterInputRef = useRef<HTMLInputElement | null>(null);

  // Pull the pet's profile care instructions so feeding / med schedules
  // flow into the care log section. Only runs once; if the appointment
  // already has a careLog, we trust the existing entries and don't reseed.
  const { data: careInstructions } = useQuery(
    petQueries.careInstructions(appointment.petId),
  );
  const appointmentMinutes = useMemo(
    () => durationMinutes(appointment.startTime, appointment.endTime),
    [appointment.startTime, appointment.endTime],
  );
  const isLongAppointment = appointmentMinutes >= LONG_APPOINTMENT_MIN_MINUTES;

  useEffect(() => {
    if (!isLongAppointment) return;
    if (!careInstructions) return;
    if ((appointment.intake?.careLog?.length ?? 0) > 0) return;
    const seeded: CareLogEntry[] = [];
    const feeding = careInstructions.feedingSchedule?.trim();
    const feedingAmount = careInstructions.feedingAmount?.trim();
    if (feeding) {
      seeded.push({
        id: `cl-feed-${Date.now()}`,
        kind: "feeding",
        label: feedingAmount
          ? `Feeding · ${feedingAmount}`
          : "Feeding (per profile schedule)",
        scheduledFor: feeding,
        administered: false,
      });
    }
    for (const med of careInstructions.medicationList ?? []) {
      seeded.push({
        id: `cl-med-${med.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`,
        kind: "medication",
        label: `${med.name} · ${med.dosage}`,
        scheduledFor: med.frequency,
        administered: false,
        notes: med.notes,
      });
    }
    if (seeded.length > 0) setCareLog(seeded);
  }, [careInstructions, isLongAppointment, appointment.intake?.careLog?.length]);

  // Keep parent + the underlying mock appointment in sync so other surfaces
  // (briefing, report card) see the latest values without prop drilling.
  useEffect(() => {
    const next: GroomingIntake = {
      coatCondition: appointment.intake?.coatCondition ?? "normal",
      behaviorNotes: appointment.intake?.behaviorNotes ?? "",
      allergies: appointment.intake?.allergies ?? appointment.allergies ?? [],
      specialInstructions:
        appointment.intake?.specialInstructions ??
        appointment.specialInstructions ??
        "",
      mattingFeeWarning: appointment.intake?.mattingFeeWarning ?? false,
      mattingFeeAmount: appointment.intake?.mattingFeeAmount,
      completedBy: appointment.intake?.completedBy,
      completedAt: appointment.intake?.completedAt,
      dropOffObservations: appointment.intake?.dropOffObservations,
      sessionStartedAt: appointment.intake?.sessionStartedAt,
      beforePhotos: photos,
      sessionNotes: notes,
      moodTags: moods,
      issues,
      careLog,
    };
    (appointment as GroomingAppointment & { intake?: GroomingIntake }).intake =
      next;
    appointment.afterPhotos = afterPhotos;
    onChange?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, afterPhotos, notes, moods, issues, careLog]);

  function handleBeforeFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      urls.push(URL.createObjectURL(file));
    }
    setPhotos((prev) => [...prev, ...urls]);
    toast.success(
      urls.length === 1
        ? "Before photo added"
        : `${urls.length} before photos added`,
    );
  }

  function removeBeforePhoto(url: string) {
    setPhotos((prev) => prev.filter((u) => u !== url));
  }

  function handleAfterFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const taken: GroomingPhoto[] = [];
    const now = new Date().toISOString();
    for (const file of Array.from(files)) {
      taken.push({
        id: `gp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: URL.createObjectURL(file),
        type: "after",
        takenAt: now,
        takenBy: "You",
      });
    }
    setAfterPhotos((prev) => [...prev, ...taken]);
    toast.success(
      taken.length === 1
        ? "After photo added"
        : `${taken.length} after photos added`,
      {
        description: "Attached to the Report Card.",
      },
    );
  }

  function removeAfterPhoto(id: string) {
    setAfterPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function toggleMood(tag: BehaviorTag) {
    setMoods((prev) =>
      prev.includes(tag) ? prev.filter((m) => m !== tag) : [...prev, tag],
    );
  }

  function flagIssue(kind: SessionIssueKind) {
    const note = (issueDrafts[kind] ?? "").trim();
    const entry: SessionIssue = {
      id: `iss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      note: note || undefined,
      reportedBy: "You",
      reportedAt: new Date().toISOString(),
      status: "pending",
    };
    setIssues((prev) => [...prev, entry]);
    setIssueDrafts((prev) => ({ ...prev, [kind]: "" }));
    const meta = ISSUE_META[kind];
    // Mock incident creation + manager notification — surfaced via toasts so
    // staff can see both events happened. A real backend would write an
    // incident record here and trigger the in-app/push channels.
    toast.success(`Incident logged · ${meta.label}`, {
      description: `Linked to appointment ${appointment.id}. Manager notified${
        meta.urgent ? " (urgent)" : ""
      }.`,
    });
  }

  function removeIssue(id: string) {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    toast.info("Issue removed");
  }

  function toggleCare(id: string) {
    setCareLog((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              administered: !c.administered,
              administeredAt: !c.administered
                ? new Date().toISOString()
                : undefined,
              administeredBy: !c.administered ? "You" : undefined,
            }
          : c,
      ),
    );
  }

  const missingBeforePhoto = requireBeforePhotos && photos.length === 0;
  const missingAfterPhoto = requireAfterPhotos && afterPhotos.length === 0;

  return (
    <Card className="border-amber-200/80 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Smile className="text-amber-600 dark:text-amber-300 size-4" />
            Session Panel
            <Badge variant="outline" className="text-[10px]">
              In Progress
            </Badge>
          </span>
          {(missingBeforePhoto || missingAfterPhoto) && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              title="Required by Grooming Settings"
            >
              <AlertTriangle className="size-3" />
              {missingBeforePhoto && missingAfterPhoto
                ? "Before + after photos required"
                : missingBeforePhoto
                  ? "Before photo required"
                  : "After photo required"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Before photos */}
        <section>
          <header className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Camera className="text-muted-foreground size-4" />
              Before Photos
              {requireBeforePhotos && (
                <span className="text-red-600 text-[10px] font-semibold">
                  Required
                </span>
              )}
            </div>
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                handleBeforeFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => beforeInputRef.current?.click()}
            >
              <Camera className="mr-1.5 size-4" />
              Take Before Photo
            </Button>
          </header>
          {photos.length === 0 ? (
            <div className="text-muted-foreground flex h-24 items-center justify-center rounded-md border border-dashed text-xs italic">
              No before photos yet — tap the button to capture one.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {photos.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="group relative size-20 overflow-hidden rounded-md ring-1 ring-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Before photo ${i + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removeBeforePhoto(url)}
                    className="absolute top-1 right-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-muted-foreground mt-1.5 text-[11px]">
            Photos attach to the Report Card automatically.
          </p>
        </section>

        {/* After photos — required (by default) before Mark Ready */}
        <section>
          <header className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Camera className="text-muted-foreground size-4" />
              After Photos
              {requireAfterPhotos && (
                <span className="text-red-600 text-[10px] font-semibold">
                  Required to Mark Ready
                </span>
              )}
            </div>
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                handleAfterFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              className="bg-sky-600 text-white hover:bg-sky-700"
              onClick={() => afterInputRef.current?.click()}
            >
              <Camera className="mr-1.5 size-4" />
              Take After Photo
            </Button>
          </header>
          {afterPhotos.length === 0 ? (
            <div
              className={cn(
                "flex h-24 items-center justify-center rounded-md border border-dashed text-xs italic",
                requireAfterPhotos
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                  : "text-muted-foreground",
              )}
            >
              {requireAfterPhotos
                ? "At least one after photo is required before Mark Ready."
                : "No after photos yet."}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {afterPhotos.map((p, i) => (
                <div
                  key={p.id}
                  className="group relative size-20 overflow-hidden rounded-md ring-1 ring-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`After photo ${i + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removeAfterPhoto(p.id)}
                    className="absolute top-1 right-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-muted-foreground mt-1.5 text-[11px]">
            After photos go to the Report Card alongside the before photos.
          </p>
        </section>

        {/* Session notes */}
        <section>
          <header className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ClipboardEdit className="text-muted-foreground size-4" />
            Session Notes
          </header>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="text-sm"
            placeholder="What did you do this session? Notable observations, time spent dematting, anything the owner should know."
          />
          <p className="text-muted-foreground mt-1.5 text-[11px]">
            Different from alert notes (warnings) and ticket comments (chat) —
            this is the session record the Report Card uses.
          </p>
        </section>

        {/* Mood & behavior */}
        <section>
          <header className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Smile className="text-muted-foreground size-4" />
            Mood &amp; Behavior
            <span className="text-muted-foreground text-[10px] font-normal">
              Select all that apply
            </span>
          </header>
          <div className="flex flex-wrap gap-1.5">
            {BEHAVIOR_OPTIONS.map((opt) => {
              const on = moods.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMood(opt.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    on
                      ? "border-emerald-400 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "bg-background hover:bg-muted/60",
                  )}
                >
                  <span aria-hidden>{opt.emoji}</span>
                  {opt.label}
                  {on && <CheckCircle2 className="size-3" />}
                </button>
              );
            })}
          </div>
          {moods.length > 0 && (
            <p className="text-muted-foreground mt-2 text-[11px]">
              Becomes the mood tag on the owner&apos;s Report Card.
            </p>
          )}
        </section>

        {/* Issues encountered */}
        <section>
          <header className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="text-muted-foreground size-4" />
            Any issues encountered?
            {issues.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {issues.length}
              </Badge>
            )}
          </header>
          <p className="text-muted-foreground mb-2 text-[11px]">
            Flagging an issue creates an incident record on this appointment
            and notifies a manager. The manager decides whether to loop in
            the owner.
          </p>
          {issues.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {issues.map((iss) => {
                const meta = ISSUE_META[iss.kind];
                const Icon = meta.icon;
                return (
                  <li
                    key={iss.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                      meta.urgent
                        ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                        : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
                    )}
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{meta.label}</p>
                      {iss.note && <p className="leading-snug">{iss.note}</p>}
                      <p className="mt-0.5 opacity-70">
                        {iss.reportedBy} ·{" "}
                        {new Date(iss.reportedAt).toLocaleTimeString("en-CA", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}{" "}
                        · {iss.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove issue"
                      onClick={() => removeIssue(iss.id)}
                      className="opacity-70 hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(Object.keys(ISSUE_META) as SessionIssueKind[]).map((kind) => {
              const meta = ISSUE_META[kind];
              const Icon = meta.icon;
              return (
                <div
                  key={kind}
                  className="rounded-md border bg-card px-2.5 py-2"
                >
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                    <Icon
                      className={cn(
                        "size-3.5",
                        meta.urgent ? "text-red-600" : "text-amber-600",
                      )}
                    />
                    {meta.label}
                    {meta.urgent && (
                      <span className="ml-auto rounded-full bg-red-100 px-1.5 text-[9px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      value={issueDrafts[kind] ?? ""}
                      onChange={(e) =>
                        setIssueDrafts((prev) => ({
                          ...prev,
                          [kind]: e.target.value,
                        }))
                      }
                      placeholder="Optional note"
                      className="h-7 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 gap-1 px-2 text-xs"
                      onClick={() => flagIssue(kind)}
                    >
                      <Flag className="size-3" />
                      Flag
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Medication & feeding — for long appointments where the session
            spans a scheduled feeding or medication on the pet's profile. */}
        {isLongAppointment && (
          <section>
            <header className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <UtensilsCrossed className="text-muted-foreground size-4" />
              Medication &amp; Feeding
              <span className="text-muted-foreground text-[10px] font-normal">
                Pulled from {appointment.petName}&apos;s care instructions
              </span>
            </header>
            {careLog.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center text-xs italic">
                No feeding or medication schedule on file for this pet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {careLog.map((c) => {
                  const Icon = c.kind === "feeding" ? UtensilsCrossed : Pill;
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs transition-colors",
                        c.administered
                          ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
                          : "bg-background",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={
                          c.administered ? "Mark not done" : "Mark done"
                        }
                        onClick={() => toggleCare(c.id)}
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                          c.administered
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-input bg-background hover:border-emerald-400",
                        )}
                      >
                        {c.administered && (
                          <CheckCircle2 className="size-3" />
                        )}
                      </button>
                      <Icon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{c.label}</p>
                        {c.scheduledFor && (
                          <p className="text-muted-foreground">
                            Schedule: {c.scheduledFor}
                          </p>
                        )}
                        {c.notes && (
                          <p className="text-muted-foreground italic">
                            {c.notes}
                          </p>
                        )}
                        {c.administered && c.administeredAt && (
                          <p className="text-emerald-700 dark:text-emerald-300">
                            Given{" "}
                            {new Date(c.administeredAt).toLocaleTimeString(
                              "en-CA",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )}
                            {c.administeredBy ? ` by ${c.administeredBy}` : ""}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-muted-foreground mt-1.5 text-[11px]">
              Edit feeding amounts or medications on the pet&apos;s profile
              under Care Instructions.
            </p>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
