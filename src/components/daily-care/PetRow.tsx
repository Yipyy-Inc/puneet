"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Pencil } from "lucide-react";
import {
  outcomeBadgeClass,
  getOutcomeOption,
} from "./outcome-meta";
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

type Props = {
  task: ScheduledTask;
  execution?: TaskExecution;
  onLog: () => void;
};

export function PetRow({ task, execution, onLog }: Props) {
  const initial = task.petName.charAt(0);
  const isLogged = Boolean(execution);
  const outcomeOpt = execution
    ? getOutcomeOption(task.taskType, String(execution.outcome))
    : undefined;

  const allTags = [...task.alertTags, ...task.behaviorTags];

  return (
    <div
      data-logged={isLogged}
      className="group flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors data-[logged=true]:bg-muted/30"
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
          <span className="font-medium text-sm leading-none">
            {task.petName}
          </span>
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
        {execution && (
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
              {execution.executedAt} · {execution.staffInitials}
            </span>
            {execution.notes && (
              <span className="text-muted-foreground italic truncate">
                &ldquo;{execution.notes}&rdquo;
              </span>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0">
        {isLogged ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLog}
            className="h-7 gap-1 text-xs text-muted-foreground"
          >
            <Pencil className="size-3" />
            Edit
          </Button>
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
