"use client";

import { useSyncExternalStore } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  Pencil,
  Flag,
  AlertTriangle,
  StickyNote,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  outcomeBadgeClass,
  getOutcomeOption,
  FEEDING_SERVED,
} from "./outcome-meta";
import { UtensilsCrossed, Pill } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePermission } from "@/hooks/use-facility-rbac";
import { petFlagsStore } from "@/data/pet-flags-store";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

const ALERT_TONE: Record<string, string> = {
  Allergy: "bg-red-50 text-red-700 border-red-200",
  Meds: "bg-orange-50 text-orange-700 border-orange-200",
  "Post-Surgery": "bg-rose-50 text-rose-700 border-rose-200",
  "Heat Cycle": "bg-pink-50 text-pink-700 border-pink-200",
  Anxiety: "bg-amber-50 text-amber-700 border-amber-200",
  Senior: "bg-purple-50 text-purple-700 border-purple-200",
  "Dog Selective": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Escape Artist": "bg-yellow-50 text-yellow-700 border-yellow-200",
};

function alertTone(tag: string): string {
  return ALERT_TONE[tag] ?? "bg-muted text-muted-foreground border-border";
}

/** The one-tap "Quick Log" default outcome for routine task types, or null when
 *  the task needs the full modal (feeding, medication, add-ons, etc.). */
function quickLogOutcome(task: ScheduledTask): string | null {
  if (task.taskType === "potty") return "both";
  if (
    task.taskType === "care" &&
    (task.subType === "water_refill" || task.subType === "kennel_clean")
  ) {
    return "completed";
  }
  return null;
}

type Props = {
  task: ScheduledTask;
  execution?: TaskExecution;
  /** The day the row belongs to — flags are keyed by date + guest. */
  date: string;
  onLog: () => void;
  /** One-tap log of the routine default outcome (potty/water/cleaning only). */
  onQuickLog?: (outcome: string) => void;
};

export function PetRow({ task, execution, date, onLog, onQuickLog }: Props) {
  const { user } = useCurrentUser();

  // Health-attention flag for this pet on this day (A4.3), from the shared
  // pet-flags store so the row and the journal ⚑ (A8.2) stay in sync.
  const flag = useSyncExternalStore(
    petFlagsStore.subscribe,
    () => petFlagsStore.getSnapshot(date, task.guestId),
    () => petFlagsStore.getSnapshot(date, task.guestId),
  );
  const isFlagged = flag !== null;

  const handleFlag = () => {
    const nowFlagged = petFlagsStore.toggle(date, task.guestId, {
      createdBy: user.name,
      createdAt: new Date().toISOString(),
    });
    // TODO: replace this toast with a real push notification to the on-shift manager.
    if (nowFlagged) {
      toast.warning(
        `${task.petName} flagged for attention — manager notified.`,
      );
    } else {
      toast(`Flag cleared for ${task.petName}.`);
    }
  };

  // Section 5D — logging is gated per task type: feeding rows need
  // log_feedings, medication rows need log_medications. Without the key the row
  // still renders (read-only) — only its action buttons go. Other task types
  // (potty / care / add-ons) are unaffected here.
  const canLogFeedings = usePermission("log_feedings");
  const canLogMedications = usePermission("log_medications");
  const canLogThisTask =
    task.taskType === "feeding"
      ? canLogFeedings
      : task.taskType === "medication"
        ? canLogMedications
        : true;

  const initial = task.petName.charAt(0);
  // Feeding is two-step: a record with the "served" sentinel means the food is
  // down but consumption hasn't been recorded yet — not "done".
  const isServed =
    task.taskType === "feeding" && execution?.outcome === FEEDING_SERVED;
  const isLogged = Boolean(execution) && !isServed;
  const withMeds = task.withMeds ?? [];
  // A meal that carried medication and came back refused / barely eaten.
  const medsNeedFollowUp =
    withMeds.length > 0 &&
    isLogged &&
    (execution?.outcome === "refused" || execution?.outcome === "ate_little");
  const quickValue = quickLogOutcome(task);
  const quickLabel = quickValue
    ? getOutcomeOption(task.taskType, quickValue)?.label
    : undefined;
  const outcomeOpt = execution
    ? getOutcomeOption(task.taskType, String(execution.outcome))
    : undefined;

  const allTags = [...task.alertTags, ...task.behaviorTags];
  // Incident-sourced task (2B): staff may log it here, but its
  // instructions/frequency are managed from the incident's In-Stay Care tab —
  // Daily Care renders no definition-edit affordance for it.
  const isIncident = Boolean(task.sourceIncidentId);

  return (
    <div
      data-logged={isLogged}
      data-served={isServed}
      data-flagged={isFlagged}
      className="group bg-card flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2 transition-colors data-[flagged=true]:ring-1 data-[flagged=true]:ring-red-400 data-[logged=true]:border-l-4 data-[logged=true]:border-l-green-500 data-[logged=true]:bg-green-50/50 data-[served=true]:border-l-4 data-[served=true]:border-l-sky-400 data-[served=true]:bg-sky-50/40 dark:data-[logged=true]:bg-green-950/20 dark:data-[served=true]:bg-sky-950/20"
    >
      <Avatar className="size-9 shrink-0">
        {task.petPhotoUrl && (
          <AvatarImage src={task.petPhotoUrl} alt={task.petName} />
        )}
        <AvatarFallback className="text-xs font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm leading-none font-medium">
            {task.petName}
          </span>
          {isIncident && (
            <Badge
              variant="outline"
              className="h-4 gap-0.5 border-orange-200 bg-orange-50 px-1 py-0 text-[9px] font-medium text-orange-700 dark:border-orange-900 dark:bg-orange-900/20 dark:text-orange-400"
              title="From an incident — manage instructions in the incident's In-Stay Care tab"
            >
              <AlertTriangle className="size-2.5" />
              Incident care
            </Badge>
          )}
          {task.careNote && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Care note for ${task.petName}`}
                  className="shrink-0 text-amber-500 hover:text-amber-600"
                >
                  <StickyNote className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="top"
                className="w-64 space-y-1 p-3"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <StickyNote className="size-3.5" />
                  Care note
                </p>
                <p className="text-muted-foreground text-xs/relaxed">
                  {task.careNote}
                </p>
              </PopoverContent>
            </Popover>
          )}
          <span className="text-muted-foreground text-xs">
            {task.kennelName}
            {task.packageType && ` · ${task.packageType}`}
          </span>
          {allTags.slice(0, 4).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={`h-4 px-1 py-0 text-[9px] font-medium ${alertTone(tag)}`}
            >
              {tag}
            </Badge>
          ))}
        </div>
        {task.subDetails && task.subDetails.length > 0 && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {task.subDetails.join(" · ")}
          </p>
        )}
        {task.avoidList && task.avoidList.length > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertTriangle className="size-3 shrink-0" />
            Avoid: {task.avoidList.join(", ")}
          </p>
        )}
        {/* Doses the parent asked to be given with this meal — served and
            given in the same pass, so there is no separate medication row. */}
        {withMeds.length > 0 && (
          <p className="mt-0.5 flex items-start gap-1 text-xs font-medium text-violet-700 dark:text-violet-400">
            <Pill className="mt-0.5 size-3 shrink-0" />
            <span className="min-w-0">
              With this meal:{" "}
              {withMeds.map((m) => `${m.name} ${m.dosage}`).join(" · ")}
            </span>
          </p>
        )}
        {/* Fork chosen with the user: a refused/barely-eaten meal that carried
            medication is flagged for follow-up, never silently corrected. */}
        {medsNeedFollowUp && (
          <p className="mt-0.5 flex items-start gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            <span className="min-w-0">
              Medication went down with a meal they barely touched — check
              whether a re-dose is needed.
            </span>
          </p>
        )}
        {isServed && execution && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="flex items-center gap-1 font-medium text-sky-700 dark:text-sky-400">
              <UtensilsCrossed className="size-3" />
              Served {execution.servedAt ?? execution.executedAt}
            </span>
            <span className="text-muted-foreground">
              · {execution.staffName ?? execution.staffInitials} · awaiting
              consumption
            </span>
          </div>
        )}
        {isLogged && execution && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {outcomeOpt && (
              <Badge
                variant="outline"
                className={outcomeBadgeClass(outcomeOpt.tone)}
              >
                {outcomeOpt.label}
              </Badge>
            )}
            <span className="text-muted-foreground">
              {execution.executedAt} ·{" "}
              {execution.staffName ?? execution.staffInitials}
            </span>
            {execution.notes && (
              <span className="text-muted-foreground truncate italic">
                &ldquo;{execution.notes}&rdquo;
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions drop to their own full-width row on phones. Inline they left
          the content column ~16px wide (card is only ~260px inside the section
          padding), so "Kennel 8 - Standard" wrapped one word per line. */}
      <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFlag}
          aria-pressed={isFlagged}
          aria-label={
            isFlagged
              ? `Clear attention flag for ${task.petName}`
              : `Flag ${task.petName} for attention`
          }
          className={`size-7 ${isFlagged ? "text-red-600 hover:text-red-700" : "text-muted-foreground"}`}
        >
          <Flag className={`size-4 ${isFlagged ? "fill-red-600" : ""}`} />
        </Button>
        {isLogged ? (
          <>
            <Badge
              variant="outline"
              className="gap-1 border-green-300 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400"
            >
              <Check className="size-3" />
              Done
            </Badge>
            {/* Section 5D: without the log key this row is read-only — the
                outcome stays visible, the edit affordance goes. */}
            {canLogThisTask && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onLog}
                className="text-muted-foreground size-7"
                aria-label={`Edit log for ${task.petName}`}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </>
        ) : !canLogThisTask ? null : isServed ? (
          // Feeding step 2: food is down, record how much they ate.
          <Button
            size="sm"
            onClick={onLog}
            className="h-7 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
          >
            <Check className="size-3.5" />
            Log consumption
          </Button>
        ) : task.taskType === "feeding" ? (
          // Feeding step 1: serve the food.
          <Button size="sm" onClick={onLog} className="h-7 gap-1 text-xs">
            <UtensilsCrossed className="size-3.5" />
            Serve
          </Button>
        ) : quickValue ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => onQuickLog?.(quickValue)}
              className="h-7 gap-1 text-xs"
            >
              <Check className="size-3.5" />
              Log {quickLabel}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLog}
              aria-label="More log options"
              className="text-muted-foreground size-7"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={onLog} className="h-7 gap-1 text-xs">
            <Check className="size-3.5" />
            Log
          </Button>
        )}
      </div>
    </div>
  );
}
