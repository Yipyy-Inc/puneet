"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Clock,
  GraduationCap,
  MapPin,
  PawPrint,
  Phone,
  User2,
  Users,
} from "lucide-react";
import type { TrainingSession } from "@/types/training";
import { trainingQueries } from "@/lib/api/training";
import { STATUS_META, colorForTrainer } from "./training-calendar-utils";

interface Props {
  session: TrainingSession | null;
  onClose: () => void;
}

export function TrainingSessionPanel({ session, onClose }: Props) {
  const { data: classRecord } = useQuery({
    ...trainingQueries.classDetail(session?.classId ?? ""),
    enabled: !!session,
  });
  const { data: allEnrollments } = useQuery({
    ...trainingQueries.enrollments(),
    enabled: !!session,
  });

  const open = !!session;
  const enrollmentsForSession =
    session && allEnrollments
      ? allEnrollments.filter((e) => session.attendees.includes(e.id))
      : [];

  const isPrivate = classRecord?.classType === "private";
  const status = session ? STATUS_META[session.status] : null;
  const trainerColor = session ? colorForTrainer(session.trainerId) : "#6366f1";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {session && (
          <>
            <DialogHeader className="border-b p-4">
              <div className="flex items-start gap-3 pr-8 text-left">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: trainerColor }}
                >
                  {isPrivate ? (
                    <User2 className="size-5" />
                  ) : (
                    <GraduationCap className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-base/tight">
                    {session.className}
                  </DialogTitle>
                  <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent",
                        isPrivate
                          ? "bg-orange-100 text-orange-700"
                          : "bg-indigo-100 text-indigo-700",
                      )}
                    >
                      {isPrivate ? (
                        <>
                          <User2 className="mr-1 size-3" /> Private 1-on-1
                        </>
                      ) : (
                        <>
                          <Users className="mr-1 size-3" /> Group class
                        </>
                      )}
                    </Badge>
                    {status && (
                      <Badge
                        variant="outline"
                        className={cn("border-transparent", status.bg, status.text)}
                      >
                        {status.label}
                      </Badge>
                    )}
                    {classRecord && (
                      <span className="text-muted-foreground text-[11px] capitalize">
                        {classRecord.skillLevel}
                      </span>
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              {/* When + where */}
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-muted-foreground size-4" />
                  <span>
                    {new Date(session.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground size-4" />
                  <span>
                    {session.startTime} – {session.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-muted-foreground size-4" />
                  <span>{session.trainerName}</span>
                </div>
                {classRecord?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="text-muted-foreground size-4" />
                    <span>{classRecord.location}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Attendees */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {isPrivate ? "Attendee" : "Enrolled"}
                  </p>
                  {!isPrivate && classRecord && (
                    <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                      {enrollmentsForSession.length} / {classRecord.capacity}
                    </span>
                  )}
                </div>
                {enrollmentsForSession.length === 0 ? (
                  <p className="text-muted-foreground rounded-md bg-slate-50 px-3 py-2 text-xs">
                    No attendees yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {enrollmentsForSession.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 rounded-md border border-slate-100 px-2 py-1.5"
                      >
                        <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
                          <PawPrint className="text-muted-foreground size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">
                            {e.petName}{" "}
                            <span className="text-muted-foreground font-normal">
                              · {e.petBreed}
                            </span>
                          </p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {e.ownerName}
                          </p>
                        </div>
                        {e.ownerPhone && (
                          <a
                            href={`tel:${e.ownerPhone}`}
                            className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors"
                            title={`Call ${e.ownerName}`}
                          >
                            <Phone className="size-3.5" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {session.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Trainer notes
                    </p>
                    <p className="text-sm/relaxed text-slate-700">
                      {session.notes}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={session.status === "in-progress"}
                >
                  Start Session
                </Button>
                <Button size="sm" variant="outline">
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={session.status === "cancelled"}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
