"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowLeft, BookOpen, Settings, Printer } from "lucide-react";
import { getCurrentGuests } from "@/data/boarding";
import { useDailyCareConfig } from "@/hooks/use-daily-care-config";
import { useDateCareLog } from "@/hooks/use-care-log";
import {
  generateScheduledTasks,
  todayIso,
} from "@/lib/care-log-scheduler";
import { ProgressHeader } from "./ProgressHeader";
import { Section } from "./Section";
import { TaskLogModal } from "./TaskLogModal";
import { ReservationJournalPanel } from "@/components/guest-journal/ReservationJournalPanel";
import { toast } from "sonner";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

export function DailyCareView() {
  const { config } = useDailyCareConfig();
  const date = todayIso();
  const { executions, log } = useDateCareLog(date);

  const guests = useMemo(() => getCurrentGuests(), []);
  const allTasks = useMemo(
    () => generateScheduledTasks(guests, config),
    [guests, config],
  );

  const [modalState, setModalState] = useState<{
    task: ScheduledTask | null;
    existing: TaskExecution | undefined;
  }>({ task: null, existing: undefined });

  const [journalSheetOpen, setJournalSheetOpen] = useState(false);
  const [selectedJournalGuestId, setSelectedJournalGuestId] = useState<
    string | null
  >(null);

  const selectedJournalGuest = useMemo(
    () => guests.find((g) => g.id === selectedJournalGuestId) ?? null,
    [guests, selectedJournalGuestId],
  );

  // Group tasks under their source step (the step that produced them).
  // Tasks without a sourceStepId fall under a synthetic "Unscheduled" bucket
  // — keeps add-ons and feedings whose times don't match any step visible.
  const sortedSteps = useMemo(
    () =>
      [...config.steps]
        .filter((s) => s.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config.steps],
  );

  const tasksByStep = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>();
    for (const step of sortedSteps) map.set(step.id, []);

    for (const task of allTasks) {
      if (task.sourceStepId && map.has(task.sourceStepId)) {
        map.get(task.sourceStepId)!.push(task);
        continue;
      }
      // Match to nearest step by task type + time as fallback
      const fallback = sortedSteps.find(
        (s) =>
          (s.taskType === task.taskType ||
            (s.taskType === "addon" && task.taskType === "addon") ||
            (s.taskType === "medication" && task.taskType === "medication") ||
            (s.taskType === "feeding" && task.taskType === "feeding")) &&
          s.time === task.scheduledTime,
      );
      if (fallback) {
        map.get(fallback.id)!.push(task);
      } else {
        // Append to the closest step of the same type
        const sameType = sortedSteps.find((s) => s.taskType === task.taskType);
        if (sameType) map.get(sameType.id)!.push(task);
      }
    }
    return map;
  }, [allTasks, sortedSteps]);

  const totalTasks = allTasks.length;
  const completedTasks = useMemo(
    () =>
      allTasks.filter((t) => executions.some((e) => e.taskId === t.id)).length,
    [allTasks, executions],
  );

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const overdueTasks = useMemo(() => {
    return sortedSteps.reduce((acc, step) => {
      const stepTasks = tasksByStep.get(step.id) ?? [];
      const remaining = stepTasks.filter(
        (t) => !executions.some((e) => e.taskId === t.id),
      ).length;
      const [h, m] = step.time.split(":").map((n) => parseInt(n, 10));
      const stepMin = (h ?? 0) * 60 + (m ?? 0);
      if (remaining > 0 && nowMinutes > stepMin + config.alertOverdueAfterMinutes) {
        return acc + remaining;
      }
      return acc;
    }, 0);
  }, [sortedSteps, tasksByStep, executions, nowMinutes, config.alertOverdueAfterMinutes]);

  function handleLog(task: ScheduledTask, existing?: TaskExecution) {
    setModalState({ task, existing });
  }

  function handleSubmit(entry: {
    outcome: string;
    notes?: string;
    staffInitials: string;
    servedAt?: string;
    photoUrl?: string;
  }) {
    if (!modalState.task) return;
    const task = modalState.task;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    log({
      taskId: task.id,
      guestId: task.guestId,
      bookingId: task.bookingId,
      taskType: task.taskType,
      date,
      executedAt: `${hh}:${mm}`,
      outcome: entry.outcome,
      notes: entry.notes,
      staffInitials: entry.staffInitials,
      servedAt: entry.servedAt,
      photoUrl: entry.photoUrl,
    });

    toast.success(`Logged for ${task.petName}`);
    setModalState({ task: null, existing: undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedJournalGuestId(null);
            setJournalSheetOpen(true);
          }}
        >
          <BookOpen className="mr-2 size-4" />
          Guest Journals
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 size-4" />
          Print
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/facility/dashboard/daily-care/settings">
            <Settings className="mr-2 size-4" />
            Configure schedule
          </Link>
        </Button>
      </div>

      <ProgressHeader
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        overdueTasks={overdueTasks}
        guestCount={guests.length}
        date={date}
      />

      {sortedSteps.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No daily care steps configured yet.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/facility/dashboard/daily-care/settings">
              Set up your daily routine
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSteps.map((step) => (
            <Section
              key={step.id}
              step={step}
              tasks={tasksByStep.get(step.id) ?? []}
              executions={executions}
              overdueAfterMinutes={config.alertOverdueAfterMinutes}
              nowMinutes={nowMinutes}
              onLog={handleLog}
            />
          ))}
        </div>
      )}

      <TaskLogModal
        open={modalState.task !== null}
        task={modalState.task}
        onOpenChange={(open) => {
          if (!open) setModalState({ task: null, existing: undefined });
        }}
        onSubmit={handleSubmit}
      />

      <Sheet open={journalSheetOpen} onOpenChange={setJournalSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedJournalGuest && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 size-7"
                  onClick={() => setSelectedJournalGuestId(null)}
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}
              <BookOpen className="size-4" />
              {selectedJournalGuest
                ? `${selectedJournalGuest.petName}'s Journal`
                : "Guest Journals"}
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-6">
            {selectedJournalGuest ? (
              <ReservationJournalPanel
                bookingId={selectedJournalGuest.bookingId ?? ""}
                petIds={[selectedJournalGuest.petId]}
              />
            ) : (
              <div className="space-y-2">
                {guests.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No guests in house.
                  </p>
                ) : (
                  guests.map((guest) => {
                    const initial = guest.petName.charAt(0);
                    return (
                      <button
                        key={guest.id}
                        onClick={() => setSelectedJournalGuestId(guest.id)}
                        className="flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                      >
                        <Avatar className="size-9 shrink-0">
                          {guest.petPhotoUrl && (
                            <AvatarImage
                              src={guest.petPhotoUrl}
                              alt={guest.petName}
                            />
                          )}
                          <AvatarFallback className="text-xs font-semibold">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {guest.petName}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {guest.kennelName}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {guest.totalNights}{" "}
                            {guest.totalNights === 1 ? "night" : "nights"}
                            {guest.ownerName && ` · ${guest.ownerName}`}
                          </p>
                        </div>
                        <BookOpen className="text-muted-foreground size-4 shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
