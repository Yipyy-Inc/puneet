"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";
import { TagList } from "@/components/shared/TagList";
import { hasCriticalTags, hasWarningTags } from "@/data/tags-notes";
import { cn } from "@/lib/utils";

import {
  Search,
  PawPrint,
  Phone,
  GraduationCap,
  CheckCircle,
  PlayCircle,
  Calendar,
  Hourglass,
  Clock,
  LogIn,
  Filter,
} from "lucide-react";
import { trainingSessions, trainers, enrollments } from "@/data/training";
import { clients } from "@/data/clients";

type SessionStatus = "scheduled" | "pending" | "in-progress" | "completed";

interface TrainingSessionLocal {
  id: string;
  classId: string;
  className: string;
  trainerId: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  attendees: string[];
  notes: string;
  price: number;
}

interface EnrollmentLocal {
  id: string;
  classId: string;
  className: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  enrollmentDate: string;
  status: string;
  sessionsAttended: number;
  totalSessions: number;
  notes: string;
}

interface TrainerLocal {
  id: string;
  name: string;
  status: string;
}

// Map pet IDs to dog images
const petImages: Record<number, string> = {
  1: "/dogs/dog-1.jpg",
  13: "/dogs/dog-2.jpg",
  14: "/dogs/dog-3.jpg",
  5: "/dogs/dog-4.jpg",
  3: "/dogs/dog-1.jpg",
  6: "/dogs/dog-2.jpg",
  7: "/dogs/dog-3.jpg",
  8: "/dogs/dog-4.jpg",
};

const getPetImage = (petId: number): string | null => {
  return petImages[petId] || null;
};

// Helper function to find client for a pet
const findClientForPet = (petId: number) => {
  return clients.find((client) => client.pets.some((pet) => pet.id === petId));
};

export function TrainingSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inProgressQuery, setInProgressQuery] = useState("");
  const [completedQuery, setCompletedQuery] = useState("");
  const [selectedSession, setSelectedSession] =
    useState<TrainingSessionLocal | null>(null);
  const [arrivedPets, setArrivedPets] = useState<Set<number>>(new Set());

  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [trainerFilter, setTrainerFilter] = useState<string>("all");
  const [showScheduled, setShowScheduled] = useState(true);
  const [showInProgress, setShowInProgress] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  // For undo functionality
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter visibility states

  // Local state for sessions data with pending status support
  const [sessionsData, setSessionsData] = useState<TrainingSessionLocal[]>(
    trainingSessions.map((s) => ({
      id: s.id as string,
      classId: s.classId as string,
      className: s.className as string,
      trainerId: s.trainerId as string,
      trainerName: s.trainerName as string,
      date: s.date as string,
      startTime: s.startTime as string,
      endTime: s.endTime as string,
      status: s.status as SessionStatus,
      attendees: s.attendees as string[],
      notes: s.notes as string,
      price: 75,
    })),
  );

  // Type-safe trainers
  const typedTrainers: TrainerLocal[] = trainers.map((t) => ({
    id: t.id as string,
    name: t.name as string,
    status: t.status as string,
  }));

  // Type-safe enrollments
  const typedEnrollments: EnrollmentLocal[] = enrollments.map((e) => ({
    id: e.id as string,
    classId: e.classId as string,
    className: e.className as string,
    petId: e.petId as number,
    petName: e.petName as string,
    petBreed: e.petBreed as string,
    ownerId: e.ownerId as number,
    ownerName: e.ownerName as string,
    ownerPhone: e.ownerPhone as string,
    ownerEmail: e.ownerEmail as string,
    enrollmentDate: e.enrollmentDate as string,
    status: e.status as string,
    sessionsAttended: e.sessionsAttended as number,
    totalSessions: e.totalSessions as number,
    notes: e.notes as string,
  }));

  // Get trainer availability based on in-progress sessions
  const trainerStatus = useMemo(() => {
    const statusMap: Record<string, { busy: boolean; currentClass?: string }> =
      {};

    // Initialize all trainers as available
    typedTrainers.forEach((trainer) => {
      statusMap[trainer.id] = { busy: false };
    });

    // Mark trainers with in-progress sessions as busy
    sessionsData.forEach((session) => {
      if (session.status === "in-progress") {
        statusMap[session.trainerId] = {
          busy: true,
          currentClass: session.className,
        };
      }
    });

    return statusMap;
  }, [sessionsData, typedTrainers]);

  const isTrainerAvailable = (trainerId: string) => {
    return !trainerStatus[trainerId]?.busy;
  };

  const getTrainerCurrentClass = (trainerId: string) => {
    return trainerStatus[trainerId]?.currentClass;
  };

  // Get today's sessions
  const todaySessions = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessionsData.filter((session) => session.date === today);
  }, [sessionsData]);

  // Get enrollments for a session
  const getSessionEnrollments = useCallback(
    (attendeeIds: string[]): EnrollmentLocal[] => {
      return typedEnrollments.filter((e) => attendeeIds.includes(e.id));
    },
    [typedEnrollments],
  );

  const executeAction = (
    session: TrainingSessionLocal,
    newStatus: SessionStatus,
    actionLabel: string,
  ) => {
    const previousStatus = session.status;

    // Update the status
    setSessionsData((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, status: newStatus } : s)),
    );

    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Show toast with undo option
    toast.success(`${session.className} - ${actionLabel}`, {
      description: `Status changed to ${newStatus.replace("-", " ")}`,
      action: {
        label: "Undo",
        onClick: () => {
          setSessionsData((prev) =>
            prev.map((s) =>
              s.id === session.id ? { ...s, status: previousStatus } : s,
            ),
          );
          toast.info("Action undone", {
            description: `${session.className} restored to ${previousStatus.replace("-", " ")}`,
          });
        },
      },
      duration: 5000,
    });
  };

  const revertToScheduled = (session: TrainingSessionLocal) => {
    const previousStatus = session.status;
    setSessionsData((prev) =>
      prev.map((s) =>
        s.id === session.id ? { ...s, status: "scheduled" as const } : s,
      ),
    );

    toast.success(`${session.className} - Reverted to Scheduled`, {
      description: "Status has been reset",
      action: {
        label: "Undo",
        onClick: () => {
          setSessionsData((prev) =>
            prev.map((s) =>
              s.id === session.id ? { ...s, status: previousStatus } : s,
            ),
          );
          toast.info("Action undone");
        },
      },
      duration: 5000,
    });

    setIsDetailsModalOpen(false);
    setSelectedSession(null);
  };

  const revertToPending = (session: TrainingSessionLocal) => {
    const previousStatus = session.status;
    setSessionsData((prev) =>
      prev.map((s) =>
        s.id === session.id ? { ...s, status: "pending" as const } : s,
      ),
    );

    toast.success(`${session.className} - Reverted to Pending`, {
      description: "Status has been reset",
      action: {
        label: "Undo",
        onClick: () => {
          setSessionsData((prev) =>
            prev.map((s) =>
              s.id === session.id ? { ...s, status: previousStatus } : s,
            ),
          );
          toast.info("Action undone");
        },
      },
      duration: 5000,
    });

    setIsDetailsModalOpen(false);
    setSelectedSession(null);
  };

  const handleMarkPending = (session: TrainingSessionLocal) => {
    setSelectedSession(session);
    setArrivedPets(new Set());
    setIsDetailsModalOpen(false);
    setIsCheckInModalOpen(true);
  };

  const handleStartSession = (session: TrainingSessionLocal) => {
    setSelectedSession(session);
    setArrivedPets(new Set());
    setIsDetailsModalOpen(false);
    setIsCheckInModalOpen(true);
  };

  const handleViewDetails = (session: TrainingSessionLocal) => {
    setSelectedSession(session);
    setArrivedPets(new Set());
    setIsCheckInModalOpen(false);
    setIsDetailsModalOpen(true);
  };

  const canStartSession = (session: TrainingSessionLocal) => {
    const now = new Date();
    const sessionTime = new Date(`${session.date}T${session.startTime}`);
    const allArrived = getSessionEnrollments(session.attendees).every((e) =>
      arrivedPets.has(e.petId),
    );
    return allArrived || now >= sessionTime;
  };

  const confirmCheckIn = () => {
    if (!selectedSession) return;
    if (selectedSession.status === "scheduled") {
      executeAction(selectedSession, "pending", "Checked in");
    } else if (selectedSession.status === "pending") {
      if (!canStartSession(selectedSession)) {
        toast.error(
          "Cannot start session until all pets arrived or session time reached",
        );
        return;
      }
      executeAction(selectedSession, "in-progress", "Session started");
    }
    setIsCheckInModalOpen(false);
    setSelectedSession(null);
  };

  const handleDetailsCheckIn = () => {
    if (!selectedSession) return;
    if (selectedSession.status === "scheduled") {
      executeAction(selectedSession, "pending", "Checked in");
    } else if (selectedSession.status === "pending") {
      if (!canStartSession(selectedSession)) {
        toast.error(
          "Cannot start session until all pets arrived or session time reached",
        );
        return;
      }
      executeAction(selectedSession, "in-progress", "Session started");
    }
    setIsDetailsModalOpen(false);
    setSelectedSession(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <Calendar className="mr-1 size-3" />
            Scheduled
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Hourglass className="mr-1 size-3" />
            Pending
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <PlayCircle className="mr-1 size-3" />
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="mr-1 size-3" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActionButton = (session: TrainingSessionLocal) => {
    switch (session.status) {
      case "scheduled":
      case "pending":
        return (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              executeAction(session, "in-progress", "Checked In");
            }}
            className="shrink-0 gap-1 bg-green-600 hover:bg-green-700"
          >
            <LogIn className="size-3" />
            Check In
          </Button>
        );
      case "in-progress":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              executeAction(session, "completed", "Checked Out");
            }}
            className="shrink-0 gap-1"
          >
            <CheckCircle className="size-3" />
            Check Out
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Header with Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-primary size-5" />
            <h3 className="text-base font-semibold md:text-lg">Training</h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="size-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Trainer</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={trainerFilter}
                onValueChange={setTrainerFilter}
              >
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                {trainers.map((t) => (
                  <DropdownMenuRadioItem key={t.id} value={t.id}>
                    {t.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Show sections</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={showScheduled}
                onCheckedChange={(v) => setShowScheduled(!!v)}
              >
                Scheduled
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showInProgress}
                onCheckedChange={(v) => setShowInProgress(!!v)}
              >
                In Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showCompleted}
                onCheckedChange={(v) => setShowCompleted(!!v)}
              >
                Completed
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Column-based layout matching CheckInOutSection */}
        <div
          className={`grid gap-4 ${
            [showScheduled, showInProgress, showCompleted].filter(Boolean)
              .length === 1
              ? "lg:grid-cols-1"
              : [showScheduled, showInProgress, showCompleted].filter(Boolean)
                    .length === 2
                ? "lg:grid-cols-2"
                : "lg:grid-cols-3"
          } `}
        >
          {/* Scheduled Column */}
          {showScheduled &&
            (() => {
              const scheduled = todaySessions
                .filter(
                  (s) => s.status === "scheduled" || s.status === "pending",
                )
                .filter(
                  (s) =>
                    trainerFilter === "all" || s.trainerId === trainerFilter,
                );
              const filtered = searchQuery.trim()
                ? scheduled.filter((s) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      s.className.toLowerCase().includes(q) ||
                      s.trainerName.toLowerCase().includes(q)
                    );
                  })
                : scheduled;
              return (
                <Card>
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="size-4 text-blue-600" />
                        Scheduled
                      </CardTitle>
                      <Badge variant="secondary">{filtered.length}</Badge>
                    </div>
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-9 text-sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] space-y-2 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                          No scheduled sessions
                        </p>
                      ) : (
                        filtered.map((session) => {
                          const sessionEnrollments = getSessionEnrollments(
                            session.attendees,
                          );
                          const firstPet = sessionEnrollments[0];
                          const client = firstPet
                            ? findClientForPet(firstPet.petId)
                            : undefined;
                          const hasCritical =
                            firstPet && hasCriticalTags("pet", firstPet.petId);
                          const hasWarn =
                            firstPet &&
                            !hasCritical &&
                            hasWarningTags("pet", firstPet.petId);
                          return (
                            <div
                              key={session.id}
                              className={cn(
                                "hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors md:gap-3 md:p-2.5",
                              )}
                              onClick={() => handleViewDetails(session)}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                {firstPet && getPetImage(firstPet.petId) ? (
                                  <Link
                                    href={
                                      client
                                        ? `/facility/dashboard/clients/${client.id}/pets/${firstPet.petId}`
                                        : "#"
                                    }
                                    className="shrink-0"
                                  >
                                    <div className="size-10 overflow-hidden rounded-full">
                                      <Image
                                        src={getPetImage(firstPet.petId)!}
                                        alt={firstPet.petName}
                                        width={40}
                                        height={40}
                                        className="size-full object-cover"
                                      />
                                    </div>
                                  </Link>
                                ) : (
                                  <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                                    <GraduationCap className="text-primary size-5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-semibold">
                                      {firstPet?.petName ?? session.className}
                                    </span>
                                    {sessionEnrollments.length > 1 && (
                                      <Badge
                                        variant="secondary"
                                        className="h-5 text-[10px]"
                                      >
                                        +{sessionEnrollments.length - 1} more
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                      <GraduationCap className="mr-1 size-3" />
                                      Training
                                    </Badge>
                                    {session.status === "pending" && (
                                      <Badge
                                        variant="secondary"
                                        className="h-5 text-[10px]"
                                      >
                                        Pending
                                      </Badge>
                                    )}
                                    {firstPet && (
                                      <TagList
                                        entityType="pet"
                                        entityId={firstPet.petId}
                                        compact
                                        maxVisible={2}
                                      />
                                    )}
                                  </div>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {firstPet?.ownerName ?? ""}
                                    {firstPet?.petBreed
                                      ? ` · ${firstPet.petBreed}`
                                      : ""}{" "}
                                    · {session.className}
                                  </p>
                                  <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                                    <Clock className="size-3" />
                                    <span>
                                      {formatTime(session.startTime)} -{" "}
                                      {formatTime(session.endTime)}
                                    </span>
                                    <span>·</span>
                                    <span>{session.trainerName}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {getActionButton(session)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          {/* In Progress Column */}
          {showInProgress &&
            (() => {
              const inProgress = todaySessions
                .filter((s) => s.status === "in-progress")
                .filter(
                  (s) =>
                    trainerFilter === "all" || s.trainerId === trainerFilter,
                );
              const filteredInProgress = inProgressQuery.trim()
                ? inProgress.filter((s) => {
                    const q = inProgressQuery.toLowerCase();
                    return (
                      s.className.toLowerCase().includes(q) ||
                      s.trainerName.toLowerCase().includes(q)
                    );
                  })
                : inProgress;
              return (
                <Card>
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <GraduationCap className="size-4 text-amber-600" />
                        In Progress
                      </CardTitle>
                      <Badge variant="secondary">
                        {filteredInProgress.length}
                      </Badge>
                    </div>
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                      <Input
                        placeholder="Search in progress..."
                        value={inProgressQuery}
                        onChange={(e) => setInProgressQuery(e.target.value)}
                        className="h-8 pl-9 text-sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] space-y-2 overflow-y-auto">
                      {filteredInProgress.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                          No active sessions
                        </p>
                      ) : (
                        filteredInProgress.map((session) => {
                          const sessionEnrollments = getSessionEnrollments(
                            session.attendees,
                          );
                          const firstPet = sessionEnrollments[0];
                          const client = firstPet
                            ? findClientForPet(firstPet.petId)
                            : undefined;
                          return (
                            <div
                              key={session.id}
                              className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors md:gap-3 md:p-2.5"
                              onClick={() => handleViewDetails(session)}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                {firstPet && getPetImage(firstPet.petId) ? (
                                  <Link
                                    href={
                                      client
                                        ? `/facility/dashboard/clients/${client.id}/pets/${firstPet.petId}`
                                        : "#"
                                    }
                                    className="shrink-0"
                                  >
                                    <div className="size-10 overflow-hidden rounded-full">
                                      <Image
                                        src={getPetImage(firstPet.petId)!}
                                        alt={firstPet.petName}
                                        width={40}
                                        height={40}
                                        className="size-full object-cover"
                                      />
                                    </div>
                                  </Link>
                                ) : (
                                  <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                                    <GraduationCap className="text-primary size-5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-semibold">
                                      {firstPet?.petName ?? session.className}
                                    </span>
                                    {sessionEnrollments.length > 1 && (
                                      <Badge
                                        variant="secondary"
                                        className="h-5 text-[10px]"
                                      >
                                        +{sessionEnrollments.length - 1} more
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                      <GraduationCap className="mr-1 size-3" />
                                      Training
                                    </Badge>
                                    {firstPet && (
                                      <TagList
                                        entityType="pet"
                                        entityId={firstPet.petId}
                                        compact
                                        maxVisible={2}
                                      />
                                    )}
                                  </div>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {firstPet?.ownerName ?? ""} ·{" "}
                                    {session.className}
                                  </p>
                                  <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                                    <Clock className="size-3" />
                                    <span>
                                      {formatTime(session.startTime)} -{" "}
                                      {formatTime(session.endTime)}
                                    </span>
                                    <span>·</span>
                                    <span>{session.trainerName}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {getActionButton(session)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          {/* Completed Column */}
          {showCompleted &&
            (() => {
              const completed = todaySessions
                .filter((s) => s.status === "completed")
                .filter(
                  (s) =>
                    trainerFilter === "all" || s.trainerId === trainerFilter,
                );
              const filteredCompleted = completedQuery.trim()
                ? completed.filter((s) => {
                    const q = completedQuery.toLowerCase();
                    return (
                      s.className.toLowerCase().includes(q) ||
                      s.trainerName.toLowerCase().includes(q)
                    );
                  })
                : completed;
              return (
                <Card>
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle className="size-4 text-green-600" />
                        Completed
                      </CardTitle>
                      <Badge variant="secondary">
                        {filteredCompleted.length}
                      </Badge>
                    </div>
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                      <Input
                        placeholder="Search completed..."
                        value={completedQuery}
                        onChange={(e) => setCompletedQuery(e.target.value)}
                        className="h-8 pl-9 text-sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] space-y-2 overflow-y-auto">
                      {filteredCompleted.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                          No completed today
                        </p>
                      ) : (
                        filteredCompleted.map((session) => {
                          const sessionEnrollments = getSessionEnrollments(
                            session.attendees,
                          );
                          const firstPet = sessionEnrollments[0];
                          const client = firstPet
                            ? findClientForPet(firstPet.petId)
                            : undefined;
                          return (
                            <div
                              key={session.id}
                              className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors md:gap-3 md:p-2.5"
                              onClick={() => handleViewDetails(session)}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                {firstPet && getPetImage(firstPet.petId) ? (
                                  <Link
                                    href={
                                      client
                                        ? `/facility/dashboard/clients/${client.id}/pets/${firstPet.petId}`
                                        : "#"
                                    }
                                    className="shrink-0"
                                  >
                                    <div className="size-10 overflow-hidden rounded-full">
                                      <Image
                                        src={getPetImage(firstPet.petId)!}
                                        alt={firstPet.petName}
                                        width={40}
                                        height={40}
                                        className="size-full object-cover"
                                      />
                                    </div>
                                  </Link>
                                ) : (
                                  <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                                    <GraduationCap className="text-primary size-5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="truncate text-sm font-semibold">
                                    {firstPet?.petName ?? session.className}
                                  </span>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                      <GraduationCap className="mr-1 size-3" />
                                      Training
                                    </Badge>
                                    {firstPet && (
                                      <TagList
                                        entityType="pet"
                                        entityId={firstPet.petId}
                                        compact
                                        maxVisible={2}
                                      />
                                    )}
                                  </div>
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {firstPet?.ownerName ?? ""} ·{" "}
                                    {session.className} · {session.trainerName}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
        </div>

        {/* Check-In Modal */}
        <Modal
          open={isCheckInModalOpen}
          onOpenChange={setIsCheckInModalOpen}
          type="confirmation"
          size="xl"
          title="Check-In Training Session"
          description="Confirm pet arrival and session details"
          actions={{
            secondary: {
              label: "Close",
              onClick: () => setIsCheckInModalOpen(false),
              variant: "outline",
            },
            primary: {
              label:
                selectedSession?.status === "scheduled"
                  ? "Mark as Ready"
                  : "Start Session",
              onClick: confirmCheckIn,
              disabled:
                selectedSession?.status === "pending" &&
                selectedSession &&
                !canStartSession(selectedSession),
            },
          }}
        >
          {selectedSession && (
            <div className="space-y-6">
              {/* Pet Information */}
              <div>
                <h3 className="mb-3 text-base font-semibold md:text-lg">
                  Pet Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {getSessionEnrollments(selectedSession.attendees).map(
                    (enrollment) => {
                      return (
                        <div
                          key={enrollment.id}
                          className="bg-muted/50 flex items-center gap-4 rounded-lg p-4"
                        >
                          <Checkbox
                            checked={arrivedPets.has(enrollment.petId)}
                            onCheckedChange={(checked) => {
                              setArrivedPets((prev) => {
                                const newSet = new Set(prev);
                                if (checked) {
                                  newSet.add(enrollment.petId);
                                } else {
                                  newSet.delete(enrollment.petId);
                                }
                                return newSet;
                              });
                            }}
                          />
                          {getPetImage(enrollment.petId) ? (
                            <Image
                              src={getPetImage(enrollment.petId)!}
                              alt={enrollment.petName}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                              <PawPrint className="text-primary size-6" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{enrollment.petName}</p>
                            <p className="text-muted-foreground text-sm">
                              {enrollment.petBreed}
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h3 className="mb-3 text-base font-semibold md:text-lg">
                  Owner Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {getSessionEnrollments(selectedSession.attendees).map(
                    (enrollment) => {
                      return (
                        <div
                          key={enrollment.id}
                          className="bg-muted/50 flex items-center gap-4 rounded-lg p-4"
                        >
                          <Image
                            src="/people/person-2.jpg"
                            alt={enrollment.ownerName}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                          <div>
                            <p className="font-medium">
                              {enrollment.ownerName}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {enrollment.ownerEmail}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {enrollment.ownerPhone}
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div>
                <h3 className="mb-3 text-base font-semibold md:text-lg">
                  Booking Details
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Service</p>
                      <p className="font-medium">{selectedSession.className}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Trainer</p>
                      <p className="font-medium">
                        {selectedSession.trainerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date & Time</p>
                      <p className="font-medium">
                        {selectedSession.date}{" "}
                        {formatTime(selectedSession.startTime)} -{" "}
                        {formatTime(selectedSession.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">${selectedSession.price}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Details Modal */}
        <Modal
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          type="details"
          size="xl"
          title="Session Details"
          description="View training session information"
          closable={false}
          footer={
            <div className="flex w-full justify-between">
              <div className="flex gap-2">
                <Link href="/facility/dashboard/bookings">
                  <Button variant="outline">Booking Details</Button>
                </Link>
                {selectedSession?.status === "pending" && (
                  <Button
                    variant="outline"
                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                    onClick={() => revertToScheduled(selectedSession)}
                  >
                    Revert to Scheduled
                  </Button>
                )}
                {selectedSession?.status === "in-progress" && (
                  <>
                    <Button
                      variant="outline"
                      className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      onClick={() => revertToScheduled(selectedSession)}
                    >
                      Revert to Scheduled
                    </Button>
                    <Button
                      variant="outline"
                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                      onClick={() => revertToPending(selectedSession)}
                    >
                      Revert to Pending
                    </Button>
                  </>
                )}
                {selectedSession?.status === "completed" && (
                  <Button
                    variant="outline"
                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                    onClick={() => revertToScheduled(selectedSession)}
                  >
                    Revert to Scheduled
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </Button>
                {selectedSession?.status === "scheduled" && (
                  <Button variant="outline" onClick={handleDetailsCheckIn}>
                    <Hourglass className="mr-2 size-4" />
                    Mark Ready
                  </Button>
                )}
                {selectedSession?.status === "pending" && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleDetailsCheckIn}
                    disabled={
                      !isTrainerAvailable(selectedSession.trainerId) ||
                      !canStartSession(selectedSession)
                    }
                  >
                    <PlayCircle className="mr-2 size-4" />
                    {!isTrainerAvailable(selectedSession.trainerId)
                      ? `${selectedSession.trainerName} is Busy`
                      : !canStartSession(selectedSession)
                        ? "Waiting for all pets or session time"
                        : "Start Session"}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          {selectedSession && (
            <div className="space-y-4">
              <div className="bg-muted flex items-center gap-4 rounded-lg p-4">
                <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                  <GraduationCap className="text-primary size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold md:text-lg">
                      {selectedSession.className}
                    </p>
                    {getStatusBadge(selectedSession.status)}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Trainer: {selectedSession.trainerName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Session Time</p>
                  <p className="font-medium">
                    {formatTime(selectedSession.startTime)} -{" "}
                    {formatTime(selectedSession.endTime)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trainer</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedSession.trainerName}</p>
                    {isTrainerAvailable(selectedSession.trainerId) ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Available
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Busy
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-2">
                    Attendees (
                    {getSessionEnrollments(selectedSession.attendees).length})
                  </p>
                  <div className="space-y-2">
                    {getSessionEnrollments(selectedSession.attendees).map(
                      (enrollment) => {
                        const client = findClientForPet(enrollment.petId);
                        return (
                          <div
                            key={enrollment.id}
                            className="bg-muted/50 flex items-center gap-3 rounded-lg p-2"
                          >
                            <Checkbox
                              checked={arrivedPets.has(enrollment.petId)}
                              onCheckedChange={(checked) => {
                                setArrivedPets((prev) => {
                                  const newSet = new Set(prev);
                                  if (checked) {
                                    newSet.add(enrollment.petId);
                                  } else {
                                    newSet.delete(enrollment.petId);
                                  }
                                  return newSet;
                                });
                              }}
                            />
                            {getPetImage(enrollment.petId) ? (
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${enrollment.petId}`
                                    : "#"
                                }
                                className="shrink-0"
                              >
                                <div className="size-8 overflow-hidden rounded-full">
                                  <Image
                                    src={getPetImage(enrollment.petId)!}
                                    alt={enrollment.petName}
                                    width={32}
                                    height={32}
                                    className="size-full object-cover"
                                  />
                                </div>
                              </Link>
                            ) : (
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${enrollment.petId}`
                                    : "#"
                                }
                                className="shrink-0"
                              >
                                <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
                                  <PawPrint className="text-primary size-4" />
                                </div>
                              </Link>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${enrollment.petId}`
                                    : "#"
                                }
                                className="text-sm font-medium hover:underline"
                              >
                                {enrollment.petName}
                              </Link>
                              <p className="text-muted-foreground text-xs">
                                {enrollment.ownerName} • {enrollment.petBreed}
                              </p>
                            </div>
                            <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                              <Phone className="size-3" />
                              {enrollment.ownerPhone}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {selectedSession.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedSession.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </CardContent>
    </Card>
  );
}
