"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  GraduationCap,
  LogOut,
  Search,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Award,
} from "lucide-react";
import { type TrainingEnrollment, type SessionAttendance } from "@/lib/training-enrollment";
import { type TrainingSeries, calculateSessionDates, getDayName } from "@/lib/training-series";
import { clients } from "@/data/clients";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

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

interface TodaySession {
  enrollment: TrainingEnrollment;
  series: TrainingSeries;
  sessionDate: string;
  sessionNumber: number;
  attendance: SessionAttendance | null;
}

export default function TrainingCheckOutPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollments] = useState<TrainingEnrollment[]>(mockEnrollments);
  const [series] = useState<TrainingSeries[]>(mockSeries);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TodaySession | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "absent" | "late" | "excused">("present");
  const [trainerNotes, setTrainerNotes] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get today's sessions (checked in pets)
  const todaySessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const sessions: TodaySession[] = [];

    enrollments.forEach((enrollment) => {
      if (enrollment.status !== "enrolled") return;

      const seriesItem = series.find((s) => s.id === enrollment.seriesId);
      if (!seriesItem) return;

      const sessionDates = calculateSessionDates(
        seriesItem.startDate,
        seriesItem.dayOfWeek,
        seriesItem.numberOfWeeks
      );

      const sessionIndex = enrollment.currentSessionNumber - 1;
      if (sessionIndex >= 0 && sessionIndex < sessionDates.length) {
        const sessionDate = sessionDates[sessionIndex];
        if (sessionDate === todayStr) {
          sessions.push({
            enrollment,
            series: seriesItem,
            sessionDate,
            sessionNumber: enrollment.currentSessionNumber,
            attendance: null, // In production, fetch from attendance records
          });
        }
      }
    });

    return sessions;
  }, [enrollments, series]);

  // Filter by search
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return todaySessions;
    const query = searchQuery.toLowerCase();
    return todaySessions.filter(
      (session) =>
        session.enrollment.petName.toLowerCase().includes(query) ||
        session.enrollment.ownerName.toLowerCase().includes(query) ||
        session.series.seriesName.toLowerCase().includes(query)
    );
  }, [todaySessions, searchQuery]);

  const handleCheckOut = (session: TodaySession) => {
    setSelectedSession(session);
    setAttendanceStatus("present");
    setTrainerNotes("");
    setIsCheckOutModalOpen(true);
  };

  const confirmCheckOut = async () => {
    if (!selectedSession) return;

    try {
      // TODO: API call to check out and update attendance
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const isFinalSession = selectedSession.sessionNumber === selectedSession.enrollment.totalSessions;
      const newSessionsAttended = selectedSession.enrollment.sessionsAttended + 1;
      const newProgress = Math.round((newSessionsAttended / selectedSession.enrollment.totalSessions) * 100);

      // Simulate actions
      if (isFinalSession) {
        console.log("Generating certificate for", selectedSession.enrollment.petName);
        console.log("Unlocking Advanced Obedience booking");
        console.log("Sending certificate email to", selectedSession.enrollment.ownerEmail);
      } else {
        console.log("Unlocking homework for Week", selectedSession.sessionNumber);
      }

      toast.success(
        `Check-out complete! ${isFinalSession ? "Certificate generated and sent." : `Week ${selectedSession.sessionNumber} homework unlocked.`}`
      );

      setIsCheckOutModalOpen(false);
      setSelectedSession(null);
      setAttendanceStatus("present");
      setTrainerNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to check out");
    }
  };

  const isFinalSession = (session: TodaySession) => {
    return session.sessionNumber === session.enrollment.totalSessions;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Training Check-Out</h2>
        <p className="text-muted-foreground">
          Mark attendance and complete today's training sessions
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by pet name, owner, or series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No training sessions to check out today.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSessions.map((session) => {
            const pet = clients
              .flatMap((c) => c.pets)
              .find((p) => p.id === session.enrollment.petId);
            const finalSession = isFinalSession(session);

            return (
              <Card key={session.enrollment.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold">
                            {session.enrollment.petName} ({session.enrollment.petBreed})
                          </h3>
                          <Badge variant="outline">
                            {session.series.courseTypeName}
                          </Badge>
                          <Badge variant={finalSession ? "default" : "secondary"}>
                            Week {session.sessionNumber} {finalSession && "(Final)"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getDayName(session.series.dayOfWeek)} {session.series.startTime} - {session.series.endTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {isMounted &&
                              new Date(session.sessionDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {session.enrollment.sessionsAttended} of {session.enrollment.totalSessions} sessions
                            </span>
                          </div>
                          <Progress value={session.enrollment.progress} className="h-2" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleCheckOut(session)}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Check Out
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Check-Out Modal */}
      <Dialog open={isCheckOutModalOpen} onOpenChange={setIsCheckOutModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Check Out & Mark Attendance</DialogTitle>
            <DialogDescription>
              Record attendance and notes for this training session
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6 py-4">
              <div className="p-4 border rounded-lg space-y-2">
                <div className="font-medium">{selectedSession.enrollment.petName}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedSession.series.courseTypeName} - Week {selectedSession.sessionNumber}
                  {isFinalSession(selectedSession) && " (Final Session)"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Attendance Status <span className="text-destructive">*</span></Label>
                <Select
                  value={attendanceStatus}
                  onValueChange={(value) =>
                    setAttendanceStatus(value as "present" | "absent" | "late" | "excused")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Present
                      </div>
                    </SelectItem>
                    <SelectItem value="absent">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Absent
                      </div>
                    </SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="excused">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Trainer Notes</Label>
                <Textarea
                  id="notes"
                  value={trainerNotes}
                  onChange={(e) => setTrainerNotes(e.target.value)}
                  placeholder="e.g., Mastered stay command, Struggled with distractions, Excellent progress..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Notes will be visible to the pet owner in their portal
                </p>
              </div>

              <Separator />

              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <p className="font-medium">Actions that will occur:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Update progress: Week {selectedSession.sessionNumber} of {selectedSession.enrollment.totalSessions} Complete</li>
                  {isFinalSession(selectedSession) ? (
                    <>
                      <li className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Generate digital certificate
                      </li>
                      <li>Email certificate to {selectedSession.enrollment.ownerEmail}</li>
                      <li>Unlock "Advanced Obedience" booking option</li>
                    </>
                  ) : (
                    <li>Unlock homework for Week {selectedSession.sessionNumber} in customer portal</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCheckOutModalOpen(false);
                setSelectedSession(null);
                setAttendanceStatus("present");
                setTrainerNotes("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmCheckOut}>
              <FileText className="mr-2 h-4 w-4" />
              Complete Check-Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
