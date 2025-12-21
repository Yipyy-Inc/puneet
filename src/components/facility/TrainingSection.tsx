"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { Modal } from "@/components/ui/modal";

import {
  Search,
  PawPrint,
  Phone,
  Clock,
  GraduationCap,
  CheckCircle,
  Eye,
  PlayCircle,
  Calendar,
  User,
  Users,
  Hourglass,
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
  const [selectedSession, setSelectedSession] =
    useState<TrainingSessionLocal | null>(null);
  const [arrivedPets, setArrivedPets] = useState<Set<number>>(new Set());

  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // For undo functionality
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter visibility states
  const [showScheduled, setShowScheduled] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showInProgress, setShowInProgress] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

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

  // Filter sessions based on visibility toggles
  const filteredSessions = useMemo(() => {
    return todaySessions.filter((session) => {
      if (session.status === "scheduled" && !showScheduled) return false;
      if (session.status === "pending" && !showPending) return false;
      if (session.status === "in-progress" && !showInProgress) return false;
      if (session.status === "completed" && !showCompleted) return false;
      return true;
    });
  }, [
    todaySessions,
    showScheduled,
    showPending,
    showInProgress,
    showCompleted,
  ]);

  // Get enrollments for a session
  const getSessionEnrollments = useCallback(
    (attendeeIds: string[]): EnrollmentLocal[] => {
      return typedEnrollments.filter((e) => attendeeIds.includes(e.id));
    },
    [typedEnrollments],
  );

  // Search results
  const displayedSessions = useMemo(() => {
    if (!searchQuery.trim()) return filteredSessions;
    const query = searchQuery.toLowerCase();
    return filteredSessions.filter(
      (session) =>
        session.className.toLowerCase().includes(query) ||
        session.trainerName.toLowerCase().includes(query) ||
        getSessionEnrollments(session.attendees).some(
          (e) =>
            e.petName.toLowerCase().includes(query) ||
            e.ownerName.toLowerCase().includes(query),
        ),
    );
  }, [filteredSessions, searchQuery, getSessionEnrollments]);

  // Get counts for badges
  const counts = useMemo(
    () => ({
      scheduled: todaySessions.filter((s) => s.status === "scheduled").length,
      pending: todaySessions.filter((s) => s.status === "pending").length,
      inProgress: todaySessions.filter((s) => s.status === "in-progress")
        .length,
      completed: todaySessions.filter((s) => s.status === "completed").length,
    }),
    [todaySessions],
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
            <Calendar className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Hourglass className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <PlayCircle className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCardStyles = (status: SessionStatus) => {
    switch (status) {
      case "scheduled":
        return {
          bg: "bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30",
          iconBg: "bg-orange-100 dark:bg-orange-900",
          icon: "text-orange-600",
        };
      case "pending":
        return {
          bg: "bg-yellow-50/50 dark:bg-yellow-950/20 hover:bg-yellow-100/50 dark:hover:bg-yellow-950/30",
          iconBg: "bg-yellow-100 dark:bg-yellow-900",
          icon: "text-yellow-600",
        };
      case "in-progress":
        return {
          bg: "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30",
          iconBg: "bg-blue-100 dark:bg-blue-900",
          icon: "text-blue-600",
        };
      case "completed":
        return {
          bg: "bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100/50 dark:hover:bg-green-950/30",
          iconBg: "bg-green-100 dark:bg-green-900",
          icon: "text-green-600",
        };
      default:
        return {
          bg: "bg-card hover:bg-muted/50",
          iconBg: "bg-primary/10",
          icon: "text-primary",
        };
    }
  };

  const getActionButton = (session: TrainingSessionLocal) => {
    switch (session.status) {
      case "scheduled":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMarkPending(session)}
            className="gap-1"
          >
            <Hourglass className="h-3 w-3" />
            Ready
          </Button>
        );
      case "pending":
        const available = isTrainerAvailable(session.trainerId);
        return (
          <Button
            size="sm"
            onClick={() => handleStartSession(session)}
            className="gap-1 bg-blue-600 hover:bg-blue-700"
            disabled={!available}
            title={
              !available
                ? `${session.trainerName} is currently busy`
                : undefined
            }
          >
            <PlayCircle className="h-3 w-3" />
            Start
          </Button>
        );
      case "in-progress":
        return null;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Header with Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Training</h3>
            <Badge variant="outline">{todaySessions.length} today</Badge>
          </div>

          {/* Filter Toggles */}
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div className="flex rounded-lg border p-1 gap-1 flex-wrap">
              <Button
                size="sm"
                variant={showScheduled ? "default" : "ghost"}
                onClick={() => setShowScheduled(!showScheduled)}
                className="h-7 px-3 gap-1"
              >
                <Calendar className="h-3 w-3" />
                Scheduled
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.scheduled}
                </Badge>
              </Button>
              <Button
                size="sm"
                variant={showPending ? "default" : "ghost"}
                onClick={() => setShowPending(!showPending)}
                className="h-7 px-3 gap-1"
              >
                <Hourglass className="h-3 w-3" />
                Pending
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.pending}
                </Badge>
              </Button>
              <Button
                size="sm"
                variant={showInProgress ? "default" : "ghost"}
                onClick={() => setShowInProgress(!showInProgress)}
                className="h-7 px-3 gap-1"
              >
                <PlayCircle className="h-3 w-3" />
                In Progress
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.inProgress}
                </Badge>
              </Button>
              <Button
                size="sm"
                variant={showCompleted ? "default" : "ghost"}
                onClick={() => setShowCompleted(!showCompleted)}
                className="h-7 px-3 gap-1"
              >
                <CheckCircle className="h-3 w-3" />
                Completed
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.completed}
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by class name, trainer, pet, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sessions List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {displayedSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery
                ? "No sessions match your search"
                : "No training sessions for today"}
            </p>
          ) : (
            displayedSessions.map((session) => {
              const styles = getCardStyles(session.status);
              const sessionEnrollments = getSessionEnrollments(
                session.attendees,
              );
              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${styles.bg} transition-colors cursor-pointer`}
                  onClick={() => handleViewDetails(session)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-full ${styles.iconBg} flex items-center justify-center shrink-0`}
                    >
                      <GraduationCap className={`h-5 w-5 ${styles.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {session.className}
                        </p>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{sessionEnrollments.length} attendees</span>
                        <span>•</span>
                        <span>
                          {sessionEnrollments
                            .slice(0, 2)
                            .map((e) => e.petName)
                            .join(", ")}
                          {sessionEnrollments.length > 2 &&
                            ` +${sessionEnrollments.length - 2} more`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(session.startTime)} -{" "}
                          {formatTime(session.endTime)}
                        </span>
                        <span>•</span>
                        <User className="h-3 w-3" />
                        <span>{session.trainerName}</span>
                        <span>•</span>
                        {isTrainerAvailable(session.trainerId) ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs h-5">
                            Available
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs h-5">
                            Busy
                            {getTrainerCurrentClass(session.trainerId) &&
                              ` - ${getTrainerCurrentClass(session.trainerId)}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getActionButton(session)}
                  </div>
                </div>
              );
            })
          )}
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
                <h3 className="text-lg font-semibold mb-3">Pet Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  {getSessionEnrollments(selectedSession.attendees).map(
                    (enrollment) => {
                      return (
                        <div
                          key={enrollment.id}
                          className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
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
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <PawPrint className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{enrollment.petName}</p>
                            <p className="text-sm text-muted-foreground">
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
                <h3 className="text-lg font-semibold mb-3">
                  Owner Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {getSessionEnrollments(selectedSession.attendees).map(
                    (enrollment) => {
                      return (
                        <div
                          key={enrollment.id}
                          className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
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
                            <p className="text-sm text-muted-foreground">
                              {enrollment.ownerEmail}
                            </p>
                            <p className="text-sm text-muted-foreground">
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
                <h3 className="text-lg font-semibold mb-3">Booking Details</h3>
                <div className="p-4 rounded-lg bg-muted/50">
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
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                    onClick={() => revertToScheduled(selectedSession)}
                  >
                    Revert to Scheduled
                  </Button>
                )}
                {selectedSession?.status === "in-progress" && (
                  <>
                    <Button
                      variant="outline"
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      onClick={() => revertToScheduled(selectedSession)}
                    >
                      Revert to Scheduled
                    </Button>
                    <Button
                      variant="outline"
                      className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                      onClick={() => revertToPending(selectedSession)}
                    >
                      Revert to Pending
                    </Button>
                  </>
                )}
                {selectedSession?.status === "completed" && (
                  <Button
                    variant="outline"
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
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
                    <Hourglass className="h-4 w-4 mr-2" />
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
                    <PlayCircle className="h-4 w-4 mr-2" />
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
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">
                      {selectedSession.className}
                    </p>
                    {getStatusBadge(selectedSession.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
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
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
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
                                <div className="h-8 w-8 rounded-full overflow-hidden">
                                  <Image
                                    src={getPetImage(enrollment.petId)!}
                                    alt={enrollment.petName}
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
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
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <PawPrint className="h-4 w-4 text-primary" />
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
                                className="font-medium text-sm hover:underline"
                              >
                                {enrollment.petName}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {enrollment.ownerName} • {enrollment.petBreed}
                              </p>
                            </div>
                            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
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
