"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  Utensils,
  Pill,
  AlertTriangle,
  CheckCircle,
  Clock,
  PawPrint,
  Gamepad2,
  Scissors,
  Footprints,
  GraduationCap,
  Heart,
  Sparkles,
  Users,
  SprayCan,
  BedDouble,
  Settings2,
  Stethoscope,
} from "lucide-react";
import type { ScheduledTask, TaskExecution, GuestAlert } from "./guest-journal";

// ── Shared outcome label map ──────────────────────────────────────────────────

export const OUTCOME_LABELS: Record<
  string,
  { label: string; colorClass: string }
> = {
  pee: { label: "Pee", colorClass: "text-blue-600 dark:text-blue-400" },
  poop: { label: "Poop", colorClass: "text-green-700 dark:text-green-500" },
  both: { label: "Pee + Poop", colorClass: "text-green-600 dark:text-green-400" },
  nothing: { label: "Nothing", colorClass: "text-muted-foreground" },
  diarrhea: { label: "Diarrhea ⚠", colorClass: "text-red-600 dark:text-red-400" },
  soft_stool: { label: "Soft Stool", colorClass: "text-orange-600 dark:text-orange-400" },
  vomit_noticed: { label: "Vomit Noticed ⚠", colorClass: "text-red-600 dark:text-red-400" },
  ate_all: { label: "Ate All", colorClass: "text-green-600 dark:text-green-400" },
  ate_half: { label: "Ate Half", colorClass: "text-yellow-600 dark:text-yellow-400" },
  refused: { label: "Refused ✗", colorClass: "text-red-600 dark:text-red-400" },
  vomited_after: { label: "Vomited After ⚠", colorClass: "text-red-600 dark:text-red-400" },
  slow_eater: { label: "Slow Eater", colorClass: "text-orange-600 dark:text-orange-400" },
  administered: { label: "Administered ✓", colorClass: "text-green-600 dark:text-green-400" },
  refused_med: { label: "Refused", colorClass: "text-red-600 dark:text-red-400" },
  spit_out: { label: "Spit Out", colorClass: "text-orange-600 dark:text-orange-400" },
  delayed: { label: "Delayed", colorClass: "text-yellow-600 dark:text-yellow-400" },
  missed: { label: "Missed ✗", colorClass: "text-red-600 dark:text-red-400" },
  // Care module outcomes
  refilled:          { label: "Refilled ✓",          colorClass: "text-cyan-600 dark:text-cyan-400" },
  guest_away:        { label: "Away / Out",           colorClass: "text-muted-foreground" },
  cleaned:           { label: "Cleaned ✓",            colorClass: "text-green-600 dark:text-green-400" },
  accident_found:    { label: "Accident Found ⚠",     colorClass: "text-red-600 dark:text-red-400" },
  changed:           { label: "Changed ✓",            colorClass: "text-green-600 dark:text-green-400" },
  not_needed:        { label: "Not Needed",           colorClass: "text-muted-foreground" },
  normal:            { label: "Normal ✓",             colorClass: "text-green-600 dark:text-green-400" },
  concern_flagged:   { label: "Concern Flagged ⚠",    colorClass: "text-amber-600 dark:text-amber-400" },
  emergency:         { label: "Emergency ⛔",           colorClass: "text-red-600 dark:text-red-400" },
  heavy_discharge:   { label: "Heavy Discharge ⚠",    colorClass: "text-amber-600 dark:text-amber-400" },
  behavioral_change: { label: "Behavioral Change ⚠", colorClass: "text-amber-600 dark:text-amber-400" },
  // Add-on outcomes
  completed: { label: "Completed ✓", colorClass: "text-green-600 dark:text-green-400" },
  partial: { label: "Partial", colorClass: "text-amber-600 dark:text-amber-400" },
  skipped: { label: "Skipped", colorClass: "text-muted-foreground" },
  dog_refused: { label: "Dog Refused", colorClass: "text-red-600 dark:text-red-400" },
  rescheduled: { label: "Rescheduled", colorClass: "text-blue-600 dark:text-blue-400" },
};

// ── Shared UI pieces ──────────────────────────────────────────────────────────

export function PetAvatar({
  petPhotoUrl,
  petName,
}: {
  petPhotoUrl?: string;
  petName: string;
}) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background">
      {petPhotoUrl ? (
        <img
          src={petPhotoUrl}
          alt={petName}
          className="size-11 rounded-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <PawPrint className="size-5 text-muted-foreground" />
      )}
    </div>
  );
}

// Full tag-library color map — matches the spec's badge system
const TAG_STYLES: Record<string, string> = {
  // Alert tags
  Allergy:        "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  Meds:           "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  "Special Diet": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
  "Medical Condition": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  "Post-Surgery": "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700",
  "Heat Cycle":   "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-700",
  // Safety / handling
  "Bite Risk":    "bg-red-200 text-red-800 border-red-400 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700 font-semibold",
  "Food Aggressive": "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  "Resource Guarder": "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
  "Dog Selective":"bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
  Jumper:         "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700",
  "Escape Artist":"bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  "No Jumping":   "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
  "No Stairs":    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
  "Needs Slow Introduction": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  // Personality
  Barker:         "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  "High Energy":  "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  Anxiety:        "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700",
  Nervous:        "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700",
  Friendly:       "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
  "Loves Staff":  "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-700",
  Puppy:          "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-400 dark:border-lime-700",
  Senior:         "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  // Care needs
  "Needs Blanket":"bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700",
};

export function TagChip({ tag }: { tag: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_STYLES[tag] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {tag}
    </span>
  );
}

const ROOM_TIER_STYLES: Record<string, string> = {
  Standard: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  Premium:  "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  Luxury:   "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
};

export function RoomTypeBadge({ packageType }: { packageType?: string }) {
  if (!packageType) return null;
  const tier = packageType.split(" ")[0] ?? packageType;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ROOM_TIER_STYLES[tier] ?? "bg-muted text-muted-foreground border-border"}`}>
      {tier}
    </span>
  );
}

// ── Task Row Components ───────────────────────────────────────────────────────

export function PottyTaskRow({
  task,
  execution,
  onLog,
}: {
  task: ScheduledTask;
  execution?: TaskExecution;
  onLog: (task: ScheduledTask) => void;
}) {
  const done = !!execution;
  const isConcern =
    done &&
    ["diarrhea", "soft_stool", "vomit_noticed"].includes(execution!.outcome);
  const outcomeInfo = done ? OUTCOME_LABELS[execution!.outcome] : null;

  return (
    <div
      data-done={done && !isConcern}
      data-concern={isConcern}
      className="flex items-center gap-3 rounded-xl border p-3 transition-colors data-[concern=true]:border-red-300 data-[concern=true]:bg-red-50/60 data-[done=true]:border-green-200 data-[done=true]:bg-green-50/40 dark:data-[concern=true]:border-red-700 dark:data-[concern=true]:bg-red-900/10 dark:data-[done=true]:border-green-800 dark:data-[done=true]:bg-green-900/10"
    >
      <PetAvatar petPhotoUrl={task.petPhotoUrl} petName={task.petName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold">{task.petName}</span>
          <span className="text-muted-foreground text-sm">{task.kennelName}</span>
          <RoomTypeBadge packageType={task.packageType} />
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {[...task.alertTags, ...task.behaviorTags].map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      </div>
      <div className="shrink-0">
        {done ? (
          <div className="flex items-center gap-1.5">
            {isConcern ? (
              <AlertTriangle className="size-4 text-red-500" />
            ) : (
              <CheckCircle className="size-4 text-green-600" />
            )}
            <span className={`text-sm font-medium ${outcomeInfo?.colorClass ?? ""}`}>
              {outcomeInfo?.label}
            </span>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onLog(task)}>
            <Droplets className="mr-1.5 size-3.5" />
            Log Potty
          </Button>
        )}
      </div>
    </div>
  );
}

export function FeedingTaskRow({
  task,
  served,
  complete,
  execution,
  onLog,
}: {
  task: ScheduledTask;
  served: boolean;
  complete: boolean;
  execution?: TaskExecution;
  onLog: (task: ScheduledTask) => void;
}) {
  const isConcern =
    complete &&
    (execution?.outcome === "refused" || execution?.outcome === "vomited_after");
  const outcomeInfo =
    complete && execution?.outcome ? OUTCOME_LABELS[execution.outcome] : null;

  return (
    <div
      data-complete={complete && !isConcern}
      data-served={served && !complete}
      data-concern={isConcern}
      className="rounded-xl border p-3 transition-colors data-[concern=true]:border-red-300 data-[concern=true]:bg-red-50/60 data-[complete=true]:border-green-200 data-[complete=true]:bg-green-50/40 data-[served=true]:border-amber-200 data-[served=true]:bg-amber-50/40 dark:data-[concern=true]:border-red-700 dark:data-[concern=true]:bg-red-900/10 dark:data-[complete=true]:border-green-800 dark:data-[complete=true]:bg-green-900/10 dark:data-[served=true]:border-amber-700 dark:data-[served=true]:bg-amber-900/10"
    >
      <div className="flex items-start gap-3">
        <PetAvatar petPhotoUrl={task.petPhotoUrl} petName={task.petName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold">{task.petName}</span>
            <span className="text-muted-foreground text-sm">{task.kennelName}</span>
            <RoomTypeBadge packageType={task.packageType} />
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="size-3" />
              {task.scheduledTime}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold">{task.details}</p>
          {task.subDetails?.map((d, i) => (
            <p
              key={i}
              className={`text-xs ${d.startsWith("⚠") ? "mt-1 font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
            >
              {d}
            </p>
          ))}
          <div className="mt-1 flex flex-wrap gap-1">
            {task.alertTags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        </div>
        <div className="shrink-0">
          {complete ? (
            <div className="flex items-center gap-1.5">
              {isConcern ? (
                <AlertTriangle className="size-4 text-red-500" />
              ) : (
                <CheckCircle className="size-4 text-green-600" />
              )}
              <span className={`text-sm font-medium ${outcomeInfo?.colorClass ?? ""}`}>
                {outcomeInfo?.label}
              </span>
            </div>
          ) : served ? (
            <div className="flex flex-col items-end gap-1.5">
              <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                Served
              </Badge>
              <Button size="sm" variant="outline" onClick={() => onLog(task)}>
                Record Intake
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => onLog(task)}>
              <Utensils className="mr-1.5 size-3.5" />
              Serve Food
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MedicationTaskRow({
  task,
  execution,
  onLog,
}: {
  task: ScheduledTask;
  execution?: TaskExecution;
  onLog: (task: ScheduledTask) => void;
}) {
  const done = !!execution;
  const isMissed = execution?.outcome === "missed";
  const outcomeInfo = done ? OUTCOME_LABELS[execution!.outcome] : null;

  return (
    <div
      data-done={done && !isMissed}
      data-missed={isMissed}
      className="rounded-xl border p-3 transition-colors data-[done=true]:border-green-200 data-[done=true]:bg-green-50/40 data-[missed=true]:border-red-300 data-[missed=true]:bg-red-50/60 dark:data-[done=true]:border-green-800 dark:data-[done=true]:bg-green-900/10 dark:data-[missed=true]:border-red-700 dark:data-[missed=true]:bg-red-900/10"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-purple-100 ring-2 ring-background dark:bg-purple-900/40">
          <Pill className="size-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-semibold">{task.petName}</span>
            <span className="text-muted-foreground text-sm">{task.kennelName}</span>
            <RoomTypeBadge packageType={task.packageType} />
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="size-3" />
              {task.scheduledTime}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-purple-700 dark:text-purple-400">
            {task.details}
          </p>
          {task.subDetails?.map((d, i) => (
            <p key={i} className="text-muted-foreground text-xs">{d}</p>
          ))}
          {task.frequencyNote && (
            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {task.frequencyNote}
            </span>
          )}
        </div>
        <div className="shrink-0">
          {done ? (
            <div className="flex items-center gap-1.5">
              {isMissed ? (
                <AlertTriangle className="size-4 text-red-500" />
              ) : (
                <CheckCircle className="size-4 text-green-600" />
              )}
              <span className={`text-sm font-medium ${outcomeInfo?.colorClass ?? ""}`}>
                {outcomeInfo?.label}
              </span>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => onLog(task)}>
              <Pill className="mr-1.5 size-3.5" />
              Administer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlertRow({ alert }: { alert: GuestAlert }) {
  return (
    <div
      data-critical={alert.severity === "critical"}
      className="flex items-start gap-3 rounded-xl border p-3 data-[critical=true]:border-red-300 data-[critical=true]:bg-red-50/60 data-[critical=false]:border-amber-300 data-[critical=false]:bg-amber-50/60 dark:data-[critical=true]:border-red-700 dark:data-[critical=true]:bg-red-900/10 dark:data-[critical=false]:border-amber-700 dark:data-[critical=false]:bg-amber-900/10"
    >
      <div
        data-critical={alert.severity === "critical"}
        className="flex size-11 shrink-0 items-center justify-center rounded-full data-[critical=true]:bg-red-100 data-[critical=false]:bg-amber-100 dark:data-[critical=true]:bg-red-900/30 dark:data-[critical=false]:bg-amber-900/30"
      >
        <AlertTriangle
          data-critical={alert.severity === "critical"}
          className="size-5 data-[critical=true]:text-red-600 data-[critical=false]:text-amber-600 dark:data-[critical=true]:text-red-400 dark:data-[critical=false]:text-amber-400"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">{alert.petName}</span>
          <span className="text-muted-foreground text-sm">{alert.kennelName}</span>
        </div>
        <p
          data-critical={alert.severity === "critical"}
          className="mt-0.5 text-sm data-[critical=true]:text-red-700 data-[critical=false]:text-amber-700 dark:data-[critical=true]:text-red-400 dark:data-[critical=false]:text-amber-400"
        >
          {alert.message}
        </p>
      </div>
      <Badge
        data-critical={alert.severity === "critical"}
        variant="outline"
        className="shrink-0 data-[critical=true]:border-red-400 data-[critical=true]:text-red-700 data-[critical=false]:border-amber-400 data-[critical=false]:text-amber-700 dark:data-[critical=true]:text-red-400 dark:data-[critical=false]:text-amber-400"
      >
        {alert.severity}
      </Badge>
    </div>
  );
}

// ── Add-on helpers ────────────────────────────────────────────────────────────

type AddonIconConfig = {
  Icon: React.ElementType;
  iconColor: string;
  buttonLabel: string;
};

const ADDON_ICON_MAP: Record<string, AddonIconConfig> = {
  play_session: { Icon: Gamepad2,      iconColor: "text-emerald-600 dark:text-emerald-400", buttonLabel: "Log Play" },
  group_play:   { Icon: Users,         iconColor: "text-teal-600 dark:text-teal-400",        buttonLabel: "Log Play" },
  nature_walk:  { Icon: Footprints,    iconColor: "text-lime-600 dark:text-lime-400",        buttonLabel: "Log Walk" },
  grooming:     { Icon: Scissors,      iconColor: "text-pink-600 dark:text-pink-400",        buttonLabel: "Log Groom" },
  training:     { Icon: GraduationCap, iconColor: "text-blue-600 dark:text-blue-400",        buttonLabel: "Log Training" },
  cuddle_time:  { Icon: Heart,         iconColor: "text-rose-600 dark:text-rose-400",        buttonLabel: "Log Cuddle" },
  spa:          { Icon: Sparkles,      iconColor: "text-violet-600 dark:text-violet-400",    buttonLabel: "Log Spa" },
};

export function getAddonIconCfg(addonType: string): AddonIconConfig {
  return ADDON_ICON_MAP[addonType] ?? { Icon: Heart, iconColor: "text-muted-foreground", buttonLabel: "Log" };
}

// ── AddonTaskRow ──────────────────────────────────────────────────────────────

export function AddonTaskRow({
  task,
  addonType,
  execution,
  onLog,
}: {
  task: ScheduledTask;
  addonType: string;
  execution?: TaskExecution;
  onLog: (task: ScheduledTask) => void;
}) {
  const done = !!execution;
  const isSkipped = done && (execution!.outcome === "skipped" || execution!.outcome === "dog_refused");
  const outcomeInfo = done ? OUTCOME_LABELS[execution!.outcome] : null;
  const cfg = getAddonIconCfg(addonType);

  return (
    <div
      data-done={done && !isSkipped}
      data-skipped={isSkipped}
      className="flex items-center gap-3 rounded-xl border p-3 transition-colors data-[done=true]:border-green-200 data-[done=true]:bg-green-50/40 data-[skipped=true]:border-muted data-[skipped=true]:opacity-60 dark:data-[done=true]:border-green-800 dark:data-[done=true]:bg-green-900/10"
    >
      <PetAvatar petPhotoUrl={task.petPhotoUrl} petName={task.petName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold">{task.petName}</span>
          <span className="text-muted-foreground text-sm">{task.kennelName}</span>
          <RoomTypeBadge packageType={task.packageType} />
        </div>
        <p className="mt-0.5 text-sm font-medium">{task.details}</p>
        {task.subDetails && (
          <p className="text-muted-foreground text-xs">{task.subDetails.join(" · ")}</p>
        )}
      </div>
      <div className="shrink-0">
        {done ? (
          <div className="flex items-center gap-1.5">
            {!isSkipped && <CheckCircle className="size-4 text-green-600" />}
            <span className={`text-sm font-medium ${outcomeInfo?.colorClass ?? ""}`}>
              {outcomeInfo?.label}
            </span>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onLog(task)}>
            <cfg.Icon className={`mr-1.5 size-3.5 ${cfg.iconColor}`} />
            {cfg.buttonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── CareTaskRow ───────────────────────────────────────────────────────────────

const CARE_SUBTYPE_CFG: Record<
  string,
  { Icon: React.ElementType; color: string; label: string; buttonLabel: string }
> = {
  water_refill:    { Icon: Droplets,    color: "text-blue-500",   label: "Water Refill",    buttonLabel: "Log Refill" },
  crate_clean:     { Icon: SprayCan,    color: "text-cyan-500",   label: "Crate Cleaning",  buttonLabel: "Log Clean" },
  bedding_change:  { Icon: BedDouble,   color: "text-indigo-500", label: "Bedding Change",  buttonLabel: "Log Change" },
  monitoring:      { Icon: Stethoscope, color: "text-amber-500",  label: "Monitoring",      buttonLabel: "Log Check" },
  heat_tracking:   { Icon: Heart,       color: "text-pink-500",   label: "Heat Tracking",   buttonLabel: "Log Check" },
};

export function CareTaskRow({
  task,
  execution,
  onLog,
}: {
  task: ScheduledTask;
  execution?: TaskExecution;
  onLog: (task: ScheduledTask) => void;
}) {
  const done = !!execution;
  const outcomeInfo = done ? OUTCOME_LABELS[execution!.outcome] : null;
  const cfg = CARE_SUBTYPE_CFG[task.subType ?? ""] ?? {
    Icon: Settings2,
    color: "text-muted-foreground",
    label: task.details,
    buttonLabel: "Log",
  };
  const Icon = cfg.Icon;

  return (
    <div
      data-done={done}
      className="flex items-center gap-3 rounded-xl border p-3 transition-colors data-[done=true]:border-green-200 data-[done=true]:bg-green-50/40 dark:data-[done=true]:border-green-800 dark:data-[done=true]:bg-green-900/10"
    >
      <PetAvatar petPhotoUrl={task.petPhotoUrl} petName={task.petName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold">{task.petName}</span>
          <span className="text-muted-foreground text-sm">{task.kennelName}</span>
          <RoomTypeBadge packageType={task.packageType} />
        </div>
        <p className="mt-0.5 text-sm font-medium">{task.details}</p>
        {task.subDetails && task.subDetails.filter(Boolean).length > 0 && (
          <p className="text-muted-foreground text-xs">{task.subDetails.filter(Boolean).join(" · ")}</p>
        )}
      </div>
      <div className="shrink-0">
        {done ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="size-4 text-green-600" />
            <span className={`text-sm font-medium ${outcomeInfo?.colorClass ?? "text-green-600"}`}>
              {outcomeInfo?.label ?? "Done"}
            </span>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onLog(task)}>
            <Icon className={`mr-1.5 size-3.5 ${cfg.color}`} />
            {cfg.buttonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
