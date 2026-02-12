"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  GraduationCap,
  LogIn,
  Search,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { type TrainingEnrollment, type SessionAttendance } from "@/lib/training-enrollment";
import { type TrainingSeries, calculateSessionDates, getDayName } from "@/lib/training-series";
import { clients } from "@/data/clients";

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
  {
    id: "enroll-002",
    seriesId: "series-002",
    seriesName: "Intermediate / Level 2 Obedience - Wednesday Evening",
    courseTypeId: "intermediate-obedience",
    courseTypeName: "Intermediate / Level 2 Obedience",
    petId: 3,
    petName: "Luna",
    petBreed: "Poodle",
    ownerId: 16,
    ownerName: "Sarah Johnson",
    ownerPhone: "(514) 555-0102",
    ownerEmail: "sarah.johnson@email.com",
    handlerName: "Sarah",
    enrollmentDate: "2026-01-10",
    status: "enrolled",
    sessionsAttended: 1,
    totalSessions: 4,
    currentSessionNumber: 2,
    progress: 25,
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

interface TodayArrival {
  enrollment: TrainingEnrollment;
  series: TrainingSeries;
  sessionDate: string;
  sessionNumber: number;
  checkedIn: boolean;
  checkInTime: string | null;
}

export default function TrainingCheckInPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollments] = useState<TrainingEnrollment[]>(mockEnrollments);
  const [series] = useState<TrainingSeries[]>(mockSeries);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedArrival, setSelectedArrival] = useState<TodayArrival | null>(null);
  const [handlerName, setHandlerName] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get today's arrivals
  const todayArrivals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const arrivals: TodayArrival[] = [];

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
          arrivals.push({
            enrollment,
            series: seriesItem,
            sessionDate,
            sessionNumber: enrollment.currentSessionNumber,
            checkedIn: false, // In production, check against attendance records
            checkInTime: null,
          });
        }
      }
    });

    return arrivals;
  }, [enrollments, series]);

  // Filter by search
  const filteredArrivals = useMemo(() => {
    if (!searchQuery) return todayArrivals;
    const query = searchQuery.toLowerCase();
    return todayArrivals.filter(
      (arrival) =>
        arrival.enrollment.petName.toLowerCase().includes(query) ||
        arrival.enrollment.ownerName.toLowerCase().includes(query) ||
        arrival.series.seriesName.toLowerCase().includes(query)
    );
  }, [todayArrivals, searchQuery]);

  const handleCheckIn = (arrival: TodayArrival) => {
    setSelectedArrival(arrival);
    setHandlerName(arrival.enrollment.handlerName || arrival.enrollment.ownerName);
    setIsCheckInModalOpen(true);
  };

  const confirmCheckIn = async () => {
    if (!selectedArrival) return;

    try {
      // TODO: API call to check in
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Print tag (simulated)
      const tagInfo = `TRAINING - ${selectedArrival.series.location} - Week ${selectedArrival.sessionNumber}`;
      console.log("Printing tag:", tagInfo);

      // Send SMS (simulated)
      const smsMessage = `${selectedArrival.enrollment.petName} checked in. Class starts ${selectedArrival.series.startTime}.`;
      console.log("Sending SMS to", selectedArrival.enrollment.ownerPhone, ":", smsMessage);

      // Mark attendance (simulated)
      // In production, this would create a SessionAttendance record

      toast.success(
        `${selectedArrival.enrollment.petName} checked in successfully! Tag printed and SMS sent.`
      );

      setIsCheckInModalOpen(false);
      setSelectedArrival(null);
      setHandlerName("");
    } catch (error: any) {
      toast.error(error.message || "Failed to check in");
    }
  };

  const formatTime = (time: string) => {
    return time || "N/A";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Training Check-In</h2>
        <p className="text-muted-foreground">
          Check in pets for today's training sessions
        </p>
      </div>

      {/* Filter Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm">
          Training - Arrivals Today
        </Badge>
        <span className="text-sm text-muted-foreground">
          {filteredArrivals.length} {filteredArrivals.length === 1 ? "arrival" : "arrivals"}
        </span>
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

      {/* Arrivals List */}
      {filteredArrivals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isMounted && new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            <p className="mt-2">No training arrivals scheduled for today.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredArrivals.map((arrival) => {
            const pet = clients
              .flatMap((c) => c.pets)
              .find((p) => p.id === arrival.enrollment.petId);

            return (
              <Card key={arrival.enrollment.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold">
                            {arrival.enrollment.petName} ({arrival.enrollment.petBreed})
                          </h3>
                          <Badge variant="outline">
                            {arrival.series.courseTypeName}
                          </Badge>
                          <Badge variant="secondary">
                            Week {arrival.sessionNumber}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            Handler: {arrival.enrollment.handlerName || arrival.enrollment.ownerName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getDayName(arrival.series.dayOfWeek)} {arrival.series.startTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {isMounted &&
                              new Date(arrival.sessionDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                          </div>
                          <div className="flex items-center gap-1">
                            <GraduationCap className="h-4 w-4" />
                            {arrival.series.location}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {arrival.checkedIn ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Checked In</span>
                        </div>
                      ) : (
                        <Button onClick={() => handleCheckIn(arrival)}>
                          <LogIn className="mr-2 h-4 w-4" />
                          Check In
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Check-In Modal */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In Pet</DialogTitle>
            <DialogDescription>
              Confirm check-in for today's training session
            </DialogDescription>
          </DialogHeader>

          {selectedArrival && (
            <div className="space-y-4 py-4">
              <div className="p-4 border rounded-lg space-y-2">
                <div className="font-medium">{selectedArrival.enrollment.petName}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedArrival.series.courseTypeName} - Week {selectedArrival.sessionNumber}
                </div>
                <div className="text-sm text-muted-foreground">
                  Class starts at {selectedArrival.series.startTime} in {selectedArrival.series.location}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="handler">Handler Name</Label>
                <Input
                  id="handler"
                  value={handlerName}
                  onChange={(e) => setHandlerName(e.target.value)}
                  placeholder="Person dropping off the pet"
                />
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Actions that will occur:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Print tag: TRAINING - {selectedArrival.series.location} - Week {selectedArrival.sessionNumber}</li>
                  <li>Send SMS to {selectedArrival.enrollment.ownerPhone}</li>
                  <li>Mark attendance for Week {selectedArrival.sessionNumber}</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCheckInModalOpen(false);
                setSelectedArrival(null);
                setHandlerName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmCheckIn}>
              <Printer className="mr-2 h-4 w-4" />
              Check In & Print Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
