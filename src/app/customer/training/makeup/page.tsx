"use client";

import { useState, useMemo, useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  GraduationCap,
  DollarSign,
} from "lucide-react";
import { type TrainingEnrollment, type SessionAttendance } from "@/lib/training-enrollment";
import { type TrainingSeries, calculateSessionDates, getDayName } from "@/lib/training-series";
import {
  type MakeupSession,
  getMissedSessions,
  canScheduleMakeup,
  calculateMakeupPrice,
} from "@/lib/training-makeup";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

// Mock data - In production, this would come from API
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

// Mock attendance data - Week 2 was missed
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

const mockMakeupSessions: MakeupSession[] = [];

interface MissedSessionInfo {
  attendance: SessionAttendance;
  enrollment: TrainingEnrollment;
  series: TrainingSeries;
  sessionDate: string;
  canSchedule: boolean;
  existingMakeup: MakeupSession | null;
}

export default function TrainingMakeupPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);
  const [enrollments] = useState<TrainingEnrollment[]>(mockEnrollments);
  const [series] = useState<TrainingSeries[]>(mockSeries);
  const [attendances] = useState<SessionAttendance[]>(mockAttendances);
  const [makeupSessions, setMakeupSessions] = useState<MakeupSession[]>(mockMakeupSessions);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [selectedMissedSession, setSelectedMissedSession] = useState<MissedSessionInfo | null>(null);
  const [makeupAction, setMakeupAction] = useState<"schedule" | "skip">("schedule");

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get all missed sessions for customer's pets
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
          seriesItem.numberOfWeeks
        );
        const sessionDate = sessionDates[attendance.sessionNumber - 1] || attendance.sessionDate;

        const existingMakeup = makeupSessions.find(
          (m) => m.missedSessionId === attendance.sessionId
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
    setIsMakeupModalOpen(true);
  };

  const confirmMakeupAction = async () => {
    if (!selectedMissedSession) return;

    if (makeupAction === "schedule") {
      try {
        // TODO: API call to schedule makeup
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
            selectedMissedSession.attendance.sessionNumber
          ),
          trainerId: null,
          trainerName: null,
          notes: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setMakeupSessions([...makeupSessions, newMakeup]);
        toast.success(
          `Makeup session requested for Week ${selectedMissedSession.attendance.sessionNumber}. You'll be contacted to schedule.`
        );
      } catch (error: any) {
        toast.error(error.message || "Failed to schedule makeup");
      }
    } else {
      // Skip session
      try {
        // TODO: API call to skip session
        await new Promise((resolve) => setTimeout(resolve, 500));
        toast.success(
          `Week ${selectedMissedSession.attendance.sessionNumber} skipped. Continuing with Week ${selectedMissedSession.enrollment.currentSessionNumber}.`
        );
      } catch (error: any) {
        toast.error(error.message || "Failed to skip session");
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Makeup Sessions</h2>
        <p className="text-muted-foreground">
          Schedule makeup sessions for missed training classes
        </p>
      </div>

      {missedSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p className="text-lg font-medium">No missed sessions</p>
            <p className="text-sm mt-2">All your training sessions have been attended!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {missedSessions.map((missed) => {
            const pet = customer?.pets.find((p) => p.id === missed.enrollment.petId);
            const makeupPrice = calculateMakeupPrice(missed.series, missed.attendance.sessionNumber);

            return (
              <Card key={missed.attendance.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {missed.enrollment.petName} ({missed.enrollment.petBreed})
                        <Badge variant="destructive">Absent - Week {missed.attendance.sessionNumber}</Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {missed.series.courseTypeName}
                      </CardDescription>
                    </div>
                    {missed.existingMakeup && (
                      <Badge variant="outline">
                        {missed.existingMakeup.status === "pending" && "Makeup Pending"}
                        {missed.existingMakeup.status === "scheduled" && "Makeup Scheduled"}
                        {missed.existingMakeup.status === "completed" && "Makeup Completed"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(missed.sessionDate)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {getDayName(missed.series.dayOfWeek)} {missed.series.startTime}
                    </div>
                  </div>

                  {missed.existingMakeup ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Makeup Session Status</p>
                      <p className="text-sm text-muted-foreground">
                        {missed.existingMakeup.status === "pending" &&
                          "Your makeup request is pending. We'll contact you to schedule."}
                        {missed.existingMakeup.status === "scheduled" &&
                          `Scheduled for ${missed.existingMakeup.scheduledDate ? formatDate(missed.existingMakeup.scheduledDate) : "TBD"} at ${missed.existingMakeup.scheduledTime || "TBD"}`}
                        {missed.existingMakeup.status === "completed" &&
                          "Makeup session completed."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 border rounded-lg space-y-3">
                        <p className="text-sm font-medium">What would you like to do?</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleScheduleMakeup(missed)}
                          >
                            <GraduationCap className="mr-2 h-4 w-4" />
                            Schedule Private Makeup
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSkipSession(missed)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Skip and Continue Week {missed.enrollment.currentSessionNumber}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                          <DollarSign className="h-4 w-4" />
                          Makeup session: ${makeupPrice}
                        </div>
                      </div>
                    </>
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
              {makeupAction === "schedule" ? "Schedule Makeup Session" : "Skip Session"}
            </DialogTitle>
            <DialogDescription>
              {selectedMissedSession?.enrollment.petName} - Week {selectedMissedSession?.attendance.sessionNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedMissedSession && (
            <div className="space-y-4 py-4">
              {makeupAction === "schedule" ? (
                <>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Makeup Session Details</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Private one-on-one session with trainer</p>
                      <p>• Covers material from Week {selectedMissedSession.attendance.sessionNumber}</p>
                      <p>• Price: ${calculateMakeupPrice(selectedMissedSession.series, selectedMissedSession.attendance.sessionNumber)}</p>
                      <p>• We'll contact you to schedule a convenient time</p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      After requesting, our team will contact you within 24 hours to schedule your makeup session.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-900 font-medium mb-2">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Skipping Week {selectedMissedSession.attendance.sessionNumber}
                    </p>
                    <p className="text-sm text-yellow-800">
                      You'll continue with Week {selectedMissedSession.enrollment.currentSessionNumber} without making up the missed session.
                      You can still schedule a makeup session later if needed.
                    </p>
                  </div>
                </>
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
              {makeupAction === "schedule" ? "Request Makeup Session" : "Skip Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
