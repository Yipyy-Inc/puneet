"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, AlertTriangle } from "lucide-react";
import { boardingGuests, type BoardingGuest } from "@/data/boarding";
import { useDailyCareConfig } from "@/hooks/use-daily-care-config";
import { useGuestCareLog } from "@/hooks/use-care-log";
import { generateScheduledTasks, todayIso } from "@/lib/care-log-scheduler";
import { JournalDayCard } from "./JournalDayCard";
import { JournalActivityLog } from "./JournalActivityLog";
import { TaskLogModal } from "@/components/daily-care/TaskLogModal";
import { toast } from "sonner";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

type Props = {
  /** The booking ID, e.g. "bk-001" or numeric — we resolve guests by either */
  bookingId: number | string;
  /** Optional list of pet IDs from the booking. If provided, we filter guests
   *  to only those pets. Otherwise we match by bookingId. */
  petIds?: number[];
};

function dateRange(checkIn: string, checkOut: string): string[] {
  // Both inputs may include a time component; normalize to date-only
  const start = new Date((checkIn ?? "").slice(0, 10) + "T00:00:00");
  const end = new Date((checkOut ?? "").slice(0, 10) + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function GuestJournalContent({ guest }: { guest: BoardingGuest }) {
  const { config } = useDailyCareConfig();
  const { executions, log } = useGuestCareLog(guest.id);

  const days = useMemo(
    () => dateRange(guest.checkInDate, guest.checkOutDate),
    [guest.checkInDate, guest.checkOutDate],
  );

  const today = todayIso();
  const [activeDay, setActiveDay] = useState<string>(() => {
    if (days.includes(today)) return today;
    return days[0] ?? today;
  });

  const tasksForDay = useMemo(() => {
    const dateObj = new Date(activeDay + "T00:00:00");
    return generateScheduledTasks([guest], config, dateObj);
  }, [guest, config, activeDay]);

  const dayExecutions = useMemo(
    () => executions.filter((e) => e.date === activeDay),
    [executions, activeDay],
  );

  const [modalState, setModalState] = useState<{
    task: ScheduledTask | null;
    existing: TaskExecution | undefined;
  }>({ task: null, existing: undefined });

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
      date: activeDay,
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

  const stayDayIndex = days.indexOf(activeDay);
  const dayLabel =
    stayDayIndex >= 0
      ? `Day ${stayDayIndex + 1} of ${days.length}`
      : "Outside stay";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {days.map((d, i) => {
          const isActive = d === activeDay;
          const isToday = d === today;
          const dateObj = new Date(d + "T00:00:00");
          const label = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              data-active={isActive}
              data-today={isToday}
              className="rounded-md border px-2.5 py-1 text-xs font-medium transition-all data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[today=true]:border-amber-400"
            >
              <span className="mr-1 text-[9px] opacity-70">D{i + 1}</span>
              {label}
            </button>
          );
        })}
      </div>

      <JournalDayCard
        date={activeDay}
        dayLabel={dayLabel}
        tasks={tasksForDay}
        executions={dayExecutions}
        onLog={handleLog}
      />

      <JournalActivityLog executions={executions} />

      <TaskLogModal
        open={modalState.task !== null}
        task={modalState.task}
        onOpenChange={(open) => {
          if (!open) setModalState({ task: null, existing: undefined });
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export function ReservationJournalPanel({ bookingId, petIds }: Props) {
  const guests = useMemo(() => {
    const refId =
      typeof bookingId === "number"
        ? `bk-${String(bookingId).padStart(3, "0")}`
        : bookingId;
    let matches = boardingGuests.filter((g) => g.bookingId === refId);
    if (matches.length === 0 && petIds && petIds.length > 0) {
      matches = boardingGuests.filter((g) => petIds.includes(g.petId));
    }
    return matches;
  }, [bookingId, petIds]);

  if (guests.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4" />
            Guest Journal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="size-4 shrink-0" />
            <div>
              <p className="font-medium">Journal not yet built for this reservation.</p>
              <p className="mt-0.5">
                The Guest Journal is auto-generated from the feeding plan,
                medications, and add-ons entered when the booking was confirmed.
                Once those details are present this panel will populate
                automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (guests.length === 1) {
    const guest = guests[0]!;
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4" />
              Guest Journal · {guest.petName}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {guest.totalNights}{" "}
              {guest.totalNights === 1 ? "night" : "nights"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <GuestJournalContent guest={guest} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4" />
          Guest Journals
          <Badge variant="secondary" className="text-[10px]">
            {guests.length} pets
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={guests[0]!.id}>
          <TabsList className="mb-3">
            {guests.map((g) => (
              <TabsTrigger key={g.id} value={g.id}>
                {g.petName}
              </TabsTrigger>
            ))}
          </TabsList>
          {guests.map((g) => (
            <TabsContent key={g.id} value={g.id}>
              <GuestJournalContent guest={g} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
