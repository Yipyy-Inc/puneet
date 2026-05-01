"use client";

import { useState, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useHydrated } from "@/hooks/use-hydrated";
import { clients } from "@/data/clients";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  GraduationCap,
  DollarSign,
} from "lucide-react";
import {
  type TrainingEnrollment,
  type SessionAttendance,
} from "@/lib/training-enrollment";
import {
  type TrainingSeries,
  calculateSessionDates,
  getDayName,
} from "@/lib/training-series";
import {
  type MakeupSession,
  getMissedSessions,
  canScheduleMakeup,
  calculateMakeupPrice,
} from "@/lib/training-makeup";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MOCK_CUSTOMER_ID = 15;

const mockEnrollments: TrainingEnrollment[] = [
  {
    id: "enroll-001",
    seriesId: "series-001",
    seriesName: "Basic Obedience - Saturday Morning February",
    courseTypeId: "basic-obedience",
    courseTypeName: "Basic Obedience / Beginner Manners",
    petId: 1,
    petName: "Remy",
    petBreed: "Golden Retriever",
    ownerId: 15,
    ownerName: "John Smith",
    ownerPhone: "(514) 555-0101",
    ownerEmail: "john.smith@email.com",
    handlerName: "John",
    enrollmentDate: "2026-01-15",
    status: "enrolled",
    sessionsAttended: 2,
    totalSessions: 6,
    currentSessionNumber: 3,
    progress: 33,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockSeries: TrainingSeries[] = [
  {
    id: "series-001",
    courseTypeId: "basic-obedience",
    courseTypeName: "Basic Obedience / Beginner Manners",
    seriesName: "Basic Obedience - Saturday Morning February",
    startDate: "2026-02-01",
    dayOfWeek: 6,
    startTime: "10:00",
    endTime: "11:00",
    duration: 60,
    numberOfWeeks: 6,
    location: "Training Room A",
    instructorId: "trainer-001",
    instructorName: "Sarah K.",
    maxCapacity: 8,
    enrollmentRules: {
      bookingOpensDate: "2026-01-01",
      bookingClosesDate: "2026-01-30",
      depositRequired: 50,
      fullPaymentAmount: 300,
      waitlistEnabled: true,
      allowDropIns: false,
    },
    status: "in-progress",
    sessions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockAttendances: SessionAttendance[] = [
  {
    id: "att-001",
    enrollmentId: "enroll-001",
    sessionId: "session-001",
    sessionNumber: 1,
    sessionDate: "2026-02-01",
    petId: 1,
    petName: "Remy",
    status: "present",
    checkInTime: "2026-02-01T10:00:00Z",
    checkOutTime: "2026-02-01T11:00:00Z",
    trainerNotes: "Great first session!",
    homeworkUnlocked: true,
    certificateGenerated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "att-002",
    enrollmentId: "enroll-001",
    sessionId: "session-002",
    sessionNumber: 2,
    sessionDate: "2026-02-08",
    petId: 1,
    petName: "Remy",
    status: "absent",
    checkInTime: null,
    checkOutTime: null,
    trainerNotes: "Missed session",
    homeworkUnlocked: false,
    certificateGenerated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface MissedSessionInfo {
  attendance: SessionAttendance;
  enrollment: TrainingEnrollment;
  series: TrainingSeries;
  sessionDate: string;
  canSchedule: boolean;
  existingMakeup: MakeupSession | null;
}

export function MakeupSessionsTab() {
  const { selectedFacility: _selectedFacility } = useCustomerFacility();
  const isMounted = useHydrated();
  const [enrollments] = useState<TrainingEnrollment[]>(mockEnrollments);
  const [series] = useState<TrainingSeries[]>(mockSeries);
  const [attendances] = useState<SessionAttendance[]>(mockAttendances);
  const [makeupSessions, setMakeupSessions] = useState<MakeupSession[]>([]);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [selectedMissedSession, setSelectedMissedSession] =
    useState<MissedSessionInfo | null>(null);
  const [makeupAction, setMakeupAction] = useState<"schedule" | "skip">(
    "schedule",
  );
  const [isSkipConfirmModalOpen, setIsSkipConfirmModalOpen] = useState(false);

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  const missedSessions = useMemo(() => {
    const missed: MissedSessionInfo[] = [];

    enrollments.forEach((enrollment) => {
      if (enrollment.ownerId !== MOCK_CUSTOMER_ID) return;

      const seriesItem = series.find((s) => s.id === enrollment.seriesId);
      if (!seriesItem) return;

      const missedAttendances = getMissedSessions(enrollment, attendances);

      missedAttendances.forEach((attendance) => {
        const sessionDates = calculateSessionDates(
          seriesItem.startDate,
          seriesItem.dayOfWeek,
          seriesItem.numberOfWeeks,
        );
        const sessionDate =
          sessionDates[attendance.sessionNumber - 1] || attendance.sessionDate;

        const existingMakeup = makeupSessions.find(
          (m) => m.missedSessionId === attendance.sessionId,
        );

        missed.push({
          attendance,
          enrollment,
          series: seriesItem,
          sessionDate,
          canSchedule: canScheduleMakeup(attendance, makeupSessions),
          existingMakeup: existingMakeup || null,
        });
      });
    });

    return missed;
  }, [enrollments, series, attendances, makeupSessions]);

  const handleScheduleMakeup = (missed: MissedSessionInfo) => {
    setSelectedMissedSession(missed);
    setMakeupAction("schedule");
    setIsMakeupModalOpen(true);
  };

  const handleSkipSession = (missed: MissedSessionInfo) => {
    setSelectedMissedSession(missed);
    setMakeupAction("skip");
    setIsSkipConfirmModalOpen(true);
  };

  const confirmMakeupAction = async () => {
    if (!selectedMissedSession) return;

    if (makeupAction === "schedule") {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const newMakeup: MakeupSession = {
          id: `makeup-${Date.now()}`,
          enrollmentId: selectedMissedSession.enrollment.id,
          missedSessionId: selectedMissedSession.attendance.sessionId,
          missedSessionNumber: selectedMissedSession.attendance.sessionNumber,
          missedSessionDate: selectedMissedSession.attendance.sessionDate,
          status: "pending",
          scheduledDate: null,
          scheduledTime: null,
          price: calculateMakeupPrice(
            selectedMissedSession.series,
            selectedMissedSession.attendance.sessionNumber,
          ),
          trainerId: null,
          trainerName: null,
          notes: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setMakeupSessions([...makeupSessions, newMakeup]);
        toast.success(
          `Makeup session requested for Week ${selectedMissedSession.attendance.sessionNumber}. You'll be contacted to schedule.`,
        );
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "Failed to schedule makeup",
        );
      }
    } else {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        toast.success(
          `Week ${selectedMissedSession.attendance.sessionNumber} skipped. Continuing with Week ${selectedMissedSession.enrollment.currentSessionNumber}.`,
        );
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "Failed to skip session",
        );
      }
    }

    setIsMakeupModalOpen(false);
    setSelectedMissedSession(null);
  };

  const formatDate = (dateStr: string) => {
    if (!isMounted) return dateStr;
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const makeupConfig = facilityConfig.training?.makeupSessions;
  const expirationDays =
    makeupConfig?.expirationRules?.mustScheduleWithinDays || 30;

  // Suppress unused variable warning — customer is used for pet lookup
  void customer;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>What is a Makeup Session?</AlertTitle>
        <AlertDescription>
          If you miss a training class, you can schedule a{" "}
          <strong>makeup session</strong> — a private one-on-one session with a
          trainer to cover the material you missed. Makeup sessions must be
          scheduled within {expirationDays} days of the missed session.
          {makeupConfig?.expirationRules?.expiresAfterDays &&
            ` Unused makeup credits expire after ${makeupConfig.expirationRules.expiresAfterDays} days.`}
        </AlertDescription>
      </Alert>

      {missedSessions.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-green-600" />
            <p className="text-lg font-medium">No missed sessions</p>
            <p className="mt-2 text-sm">
              All your training sessions have been attended!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {missedSessions.map((missed) => {
            const makeupPrice = calculateMakeupPrice(
              missed.series,
              missed.attendance.sessionNumber,
              facilityConfig,
            );

            return (
              <Card key={missed.attendance.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {missed.enrollment.petName} (
                        {missed.enrollment.petBreed})
                        <Badge variant="destructive">
                          Absent - Week {missed.attendance.sessionNumber}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {missed.series.courseTypeName}
                      </CardDescription>
                    </div>
                    {missed.existingMakeup && (
                      <Badge variant="outline">
                        {missed.existingMakeup.status === "pending" &&
                          "Makeup Pending"}
                        {missed.existingMakeup.status === "scheduled" &&
                          "Makeup Scheduled"}
                        {missed.existingMakeup.status === "completed" &&
                          "Makeup Completed"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 space-y-3 rounded-lg p-4">
                    <p className="text-sm font-medium">Missed Session Details</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="size-4" />
                        <div>
                          <p className="text-foreground font-medium">Date</p>
                          <p>{formatDate(missed.sessionDate)}</p>
                        </div>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Clock className="size-4" />
                        <div>
                          <p className="text-foreground font-medium">Time</p>
                          <p>
                            {getDayName(missed.series.dayOfWeek)}{" "}
                            {missed.series.startTime}
                          </p>
                        </div>
                      </div>
                    </div>
                    {missed.attendance.trainerNotes && (
                      <div className="mt-2 border-t pt-2">
                        <p className="text-foreground mb-1 text-sm font-medium">
                          Reason / Notes:
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {missed.attendance.trainerNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {missed.existingMakeup ? (
                    <div className="bg-muted rounded-lg p-4">
                      <p className="mb-1 text-sm font-medium">
                        Makeup Session Status
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {missed.existingMakeup.status === "pending" &&
                          "Your makeup request is pending. We'll contact you to schedule."}
                        {missed.existingMakeup.status === "scheduled" &&
                          `Scheduled for ${missed.existingMakeup.scheduledDate ? formatDate(missed.existingMakeup.scheduledDate) : "TBD"} at ${missed.existingMakeup.scheduledTime || "TBD"}`}
                        {missed.existingMakeup.status === "completed" &&
                          "Makeup session completed."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-lg border p-4">
                      <p className="text-sm font-medium">
                        What would you like to do?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleScheduleMakeup(missed)}
                        >
                          <GraduationCap className="mr-2 size-4" />
                          Schedule Private Makeup
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleSkipSession(missed)}
                        >
                          <XCircle className="mr-2 size-4" />
                          Skip and Continue Week{" "}
                          {missed.enrollment.currentSessionNumber}
                        </Button>
                      </div>
                      <div className="space-y-2 border-t pt-2">
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <DollarSign className="size-4" />
                          Makeup session: ${makeupPrice}
                        </div>
                        {makeupConfig?.expirationRules?.enabled && (
                          <p className="text-muted-foreground text-xs">
                            Must be scheduled within {expirationDays} days of
                            the missed session
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Makeup Action Modal */}
      <Dialog open={isMakeupModalOpen} onOpenChange={setIsMakeupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {makeupAction === "schedule"
                ? "Schedule Makeup Session"
                : "Skip Session"}
            </DialogTitle>
            <DialogDescription>
              {selectedMissedSession?.enrollment.petName} - Week{" "}
              {selectedMissedSession?.attendance.sessionNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedMissedSession && (
            <div className="space-y-4 py-4">
              {makeupAction === "schedule" ? (
                <>
                  <div className="bg-muted space-y-2 rounded-lg p-4">
                    <p className="text-sm font-medium">
                      Makeup Session Details
                    </p>
                    <div className="text-muted-foreground space-y-1 text-sm">
                      <p>• Private one-on-one session with trainer</p>
                      <p>
                        • Covers material from Week{" "}
                        {selectedMissedSession.attendance.sessionNumber}
                      </p>
                      <p>
                        • Price: $
                        {calculateMakeupPrice(
                          selectedMissedSession.series,
                          selectedMissedSession.attendance.sessionNumber,
                          facilityConfig,
                        )}
                      </p>
                      <p>
                        • We&apos;ll contact you to schedule a convenient time
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-blue-900">
                      <AlertCircle className="mr-1 inline size-4" />
                      After requesting, our team will contact you within 24
                      hours to schedule your makeup session.
                    </p>
                  </div>
                </>
              ) : (
                <div className="border-destructive/20 bg-destructive/10 rounded-lg border p-4">
                  <p className="text-destructive mb-2 text-sm font-medium">
                    <AlertCircle className="mr-1 inline size-4" />
                    You will forfeit this session
                  </p>
                  <p className="text-destructive/80 text-sm">
                    By skipping, you will forfeit Week{" "}
                    {selectedMissedSession.attendance.sessionNumber} and continue
                    directly to Week{" "}
                    {selectedMissedSession.enrollment.currentSessionNumber}. You
                    can still schedule a makeup session later if needed, but this
                    session will be marked as forfeited.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMakeupModalOpen(false);
                setSelectedMissedSession(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmMakeupAction}>
              {makeupAction === "schedule"
                ? "Request Makeup Session"
                : "Skip Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Confirmation Modal */}
      <Dialog
        open={isSkipConfirmModalOpen}
        onOpenChange={setIsSkipConfirmModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Skip Session</DialogTitle>
            <DialogDescription>
              You are about to forfeit Week{" "}
              {selectedMissedSession?.attendance.sessionNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedMissedSession && (
            <div className="space-y-4 py-4">
              <div className="border-destructive/20 bg-destructive/10 rounded-lg border p-4">
                <p className="text-destructive mb-2 text-sm font-medium">
                  <AlertCircle className="mr-1 inline size-4" />
                  Warning: You will forfeit this session
                </p>
                <p className="text-destructive/80 mb-3 text-sm">
                  By skipping, you will forfeit Week{" "}
                  {selectedMissedSession.attendance.sessionNumber} and continue
                  directly to Week{" "}
                  {selectedMissedSession.enrollment.currentSessionNumber}.
                </p>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <p>• This session will be marked as forfeited</p>
                  <p>
                    • You can still schedule a makeup session later if needed
                  </p>
                  <p>• You will continue with the next session in the series</p>
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-900">
                  <AlertCircle className="mr-1 inline size-4" />
                  Consider scheduling a makeup session instead to ensure your
                  pet doesn&apos;t miss important training material.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSkipConfirmModalOpen(false);
                setSelectedMissedSession(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedMissedSession) return;
                setIsSkipConfirmModalOpen(false);
                try {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  toast.success(
                    `Week ${selectedMissedSession.attendance.sessionNumber} skipped. Continuing with Week ${selectedMissedSession.enrollment.currentSessionNumber}.`,
                  );
                } catch (error: unknown) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to skip session",
                  );
                }
                setSelectedMissedSession(null);
              }}
            >
              Yes, Skip and Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
