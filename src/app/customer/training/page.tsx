"use client";

import { useState, useMemo, useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Info,
  Download,
  Calendar as CalendarIcon,
} from "lucide-react";
import { type TrainingSeries, getDayName, calculateSessionDates } from "@/lib/training-series";
import { defaultTrainingCourseTypes } from "@/lib/training-config";
import { validatePrerequisites } from "@/lib/training-prerequisites";
import { checkCourseProgression } from "@/lib/training-progression";
import { type TrainingCertificate } from "@/lib/training-enrollment";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

// Mock series data - In production, this would come from API
const mockSeries: TrainingSeries[] = [
  {
    id: "series-001",
    courseTypeId: "basic-obedience",
    courseTypeName: "Basic Obedience / Beginner Manners",
    seriesName: "Basic Obedience - Saturday Morning February",
    startDate: "2026-02-01",
    dayOfWeek: 6, // Saturday
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
    status: "open",
    sessions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function CustomerTrainingPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);
  const [series] = useState<TrainingSeries[]>(mockSeries);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<TrainingSeries | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [paymentOption, setPaymentOption] = useState<"deposit" | "full">("deposit");
  const [agreedToCommitment, setAgreedToCommitment] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [certificates] = useState<TrainingCertificate[]>([]); // Mock - would come from API
  const [isCourseDetailsModalOpen, setIsCourseDetailsModalOpen] = useState(false);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<TrainingSeries | null>(null);
  // Mock enrollments - in production, this would come from API
  const [enrollments] = useState<Array<{ seriesId: string; petId: number; petName: string }>>([
    // Example: { seriesId: "series-001", petId: 1, petName: "Buddy" }
  ]);

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check course progression for all pets (only show unlocked courses)
  const progressionByPet = useMemo(() => {
    if (!customer) return {};
    const progression: Record<number, ReturnType<typeof checkCourseProgression>> = {};
    
    customer.pets.forEach((pet) => {
      if (pet.type === "Dog") {
        progression[pet.id] = checkCourseProgression(
          pet.id,
          defaultTrainingCourseTypes,
          certificates
        );
      }
    });
    
    return progression;
  }, [customer, certificates]);

  // Filter series based on search, status, and progression (only show unlocked courses)
  const availableSeries = useMemo(() => {
    return series.filter((s) => {
      if (s.status !== "open") return false;
      
      // Check if course is unlocked for at least one pet
      const courseType = defaultTrainingCourseTypes.find((ct) => ct.id === s.courseTypeId);
      if (!courseType) return false;
      
      // If no prerequisites, always show
      if (courseType.prerequisites.length === 0) {
        // Show it
      } else {
        // Check if unlocked for at least one pet
        const isUnlocked = Object.values(progressionByPet).some((progression) => {
          const courseProg = progression.find((p) => p.courseTypeId === s.courseTypeId);
          return courseProg?.isUnlocked ?? false;
        });
        
        if (!isUnlocked) return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.seriesName.toLowerCase().includes(query) ||
          s.courseTypeName.toLowerCase().includes(query) ||
          s.instructorName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [series, searchQuery, progressionByPet]);

  // Calculate spots left for each series
  const getSpotsLeft = (seriesItem: TrainingSeries): number => {
    // In production, this would count actual enrollments
    const enrolledCount = 5; // Mock data
    return Math.max(0, seriesItem.maxCapacity - enrolledCount);
  };

  // Format date range
  const formatDateRange = (seriesItem: TrainingSeries): string => {
    if (!isMounted) return "";
    const sessionDates = calculateSessionDates(
      seriesItem.startDate,
      seriesItem.dayOfWeek,
      seriesItem.numberOfWeeks
    );
    if (sessionDates.length === 0) return "";
    const start = new Date(sessionDates[0]);
    const end = new Date(sessionDates[sessionDates.length - 1]);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const handleEnrollClick = (seriesItem: TrainingSeries) => {
    setSelectedSeries(seriesItem);
    setSelectedPetId(null);
    setPaymentOption("deposit");
    setAgreedToCommitment(false);
    setIsEnrollmentModalOpen(true);
  };

  const handleCourseDetailsClick = (seriesItem: TrainingSeries) => {
    setSelectedCourseDetails(seriesItem);
    setIsCourseDetailsModalOpen(true);
  };

  const handleWaitlistClick = (seriesItem: TrainingSeries) => {
    setSelectedSeries(seriesItem);
    setWaitlistPosition(2); // Mock position
    setIsWaitlistModalOpen(true);
  };

  const handleEnroll = async () => {
    if (!selectedSeries || !selectedPetId || !customer) {
      toast.error("Please select a pet");
      return;
    }

    if (!agreedToCommitment) {
      toast.error("You must agree to the series commitment");
      return;
    }

    const pet = customer.pets.find((p) => p.id === selectedPetId);
    if (!pet) {
      toast.error("Pet not found");
      return;
    }

    const courseType = defaultTrainingCourseTypes.find(
      (ct) => ct.id === selectedSeries.courseTypeId
    );
    if (!courseType) {
      toast.error("Course type not found");
      return;
    }

    // Validate prerequisites
    const validation = validatePrerequisites(pet, courseType);
    if (!validation.eligible) {
      const errorMessages = validation.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join("\n");
      toast.error(`Enrollment not eligible:\n${errorMessages}`);
      return;
    }

    setIsEnrolling(true);
    try {
      // TODO: API call to enroll
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Generate session dates for confirmation and calendar
      const sessionDates = calculateSessionDates(
        selectedSeries.startDate,
        selectedSeries.dayOfWeek,
        selectedSeries.numberOfWeeks
      );

      toast.success(
        `Successfully enrolled ${pet.name} in ${selectedSeries.seriesName}! Confirmation email sent with all session dates.`,
        {
          duration: 5000,
          action: {
            label: "Add All Sessions to Calendar",
            onClick: () => {
              // Generate .ics file for all sessions
              const icsContent = generateICSForSessions(
                selectedSeries,
                sessionDates,
                pet.name,
                selectedFacility?.name || "Facility"
              );
              downloadICSFile(icsContent, `${selectedSeries.seriesName.replace(/\s+/g, "-")}-sessions.ics`);
              toast.success("Calendar file downloaded");
            },
          },
        }
      );
      
      setIsEnrollmentModalOpen(false);
      setSelectedSeries(null);
      setSelectedPetId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to enroll");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!selectedSeries || !selectedPetId || !customer) {
      toast.error("Please select a pet");
      return;
    }

    const pet = customer.pets.find((p) => p.id === selectedPetId);
    if (!pet) {
      toast.error("Pet not found");
      return;
    }

    try {
      // TODO: API call to join waitlist
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        `${pet.name} added to waitlist. Position: #${waitlistPosition}. You'll be notified when a spot opens.`
      );
      setIsWaitlistModalOpen(false);
      setSelectedSeries(null);
      setSelectedPetId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to join waitlist");
    }
  };

  const selectedPet = useMemo(() => {
    if (!selectedPetId || !customer) return null;
    return customer.pets.find((p) => p.id === selectedPetId);
  }, [selectedPetId, customer]);

  const selectedCourseType = useMemo(() => {
    if (!selectedSeries && !selectedCourseDetails) return null;
    const series = selectedSeries || selectedCourseDetails;
    if (!series) return null;
    return defaultTrainingCourseTypes.find(
      (ct) => ct.id === series.courseTypeId
    );
  }, [selectedSeries, selectedCourseDetails]);

  const prerequisiteValidation = useMemo(() => {
    if (!selectedPet || !selectedCourseType) return null;
    return validatePrerequisites(selectedPet, selectedCourseType);
  }, [selectedPet, selectedCourseType]);

  // Generate ICS file for training sessions
  const generateICSForSessions = (
    series: TrainingSeries,
    sessionDates: string[],
    petName: string,
    facilityName: string
  ): string => {
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const events = sessionDates.map((date, index) => {
      const startDateTime = new Date(`${date}T${series.startTime}`);
      const endDateTime = new Date(`${date}T${series.endTime}`);
      
      return [
        "BEGIN:VEVENT",
        `UID:training-${series.id}-session-${index + 1}@yipyy.com`,
        `DTSTART:${formatICSDate(startDateTime)}`,
        `DTEND:${formatICSDate(endDateTime)}`,
        `SUMMARY:${series.courseTypeName} - Session ${index + 1} - ${petName}`,
        `DESCRIPTION:Training Session ${index + 1} of ${series.numberOfWeeks}\\nPet: ${petName}\\nCourse: ${series.courseTypeName}\\nInstructor: ${series.instructorName}\\nLocation: ${series.location}`,
        `LOCATION:${series.location}`,
        "END:VEVENT",
      ].join("\r\n");
    });

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Yipyy//Training Sessions//EN",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");
  };

  const downloadICSFile = (icsContent: string, filename: string) => {
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Training Classes</h2>
        <p className="text-muted-foreground">
          Browse and enroll in training series for your pets
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by course name, instructor, or series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Series Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableSeries.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No training series available at this time.
          </div>
        ) : (
          availableSeries.map((seriesItem) => {
            const spotsLeft = getSpotsLeft(seriesItem);
            const isFull = spotsLeft === 0;
            const dateRange = formatDateRange(seriesItem);

            return (
              <Card key={seriesItem.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {seriesItem.courseTypeName}
                      </CardTitle>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDays className="h-4 w-4" />
                          {getDayName(seriesItem.dayOfWeek)} {seriesItem.startTime}
                        </div>
                        {isMounted && dateRange && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            {dateRange} | {seriesItem.numberOfWeeks} weeks
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4" />
                          Instructor: {seriesItem.instructorName}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          {seriesItem.location}
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={isFull ? "destructive" : "default"}
                      className="flex items-center gap-1"
                    >
                      <Users className="h-3 w-3" />
                      {spotsLeft} of {seriesItem.maxCapacity} spots left
                    </Badge>
                  </div>
                  <Separator />
                  {/* Show enrolled pet if any */}
                  {enrollments.some((e) => e.seriesId === seriesItem.id) && (
                    <div className="p-2 bg-primary/10 rounded-lg text-sm">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Enrolled: {enrollments
                          .filter((e) => e.seriesId === seriesItem.id)
                          .map((e) => e.petName)
                          .join(", ")}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCourseDetailsClick(seriesItem)}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Course Details
                    </Button>
                    {isFull ? (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleWaitlistClick(seriesItem)}
                      >
                        Join Waitlist
                      </Button>
                    ) : (
                      <Button
                        className="flex-1"
                        onClick={() => handleEnrollClick(seriesItem)}
                      >
                        Enroll
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Enrollment Modal */}
      <Dialog open={isEnrollmentModalOpen} onOpenChange={setIsEnrollmentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll in Training Series</DialogTitle>
            <DialogDescription>
              {selectedSeries?.seriesName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Pet Selection */}
            <div className="space-y-2">
              <Label>Select Pet <span className="text-destructive">*</span></Label>
              <Select
                value={selectedPetId?.toString() || ""}
                onValueChange={(value) => setSelectedPetId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose which pet to enroll..." />
                </SelectTrigger>
                <SelectContent>
                  {customer?.pets
                    .filter((p) => p.type === "Dog") // Only dogs for training
                    .map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name} - {pet.breed}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prerequisites Check */}
            {selectedPet && selectedCourseType && prerequisiteValidation && (
              <div className="space-y-2">
                <Label>Prerequisites Check</Label>
                <div className="p-4 border rounded-lg space-y-2">
                  {prerequisiteValidation.eligible ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">All prerequisites met!</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Prerequisites not met</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-7">
                        {prerequisiteValidation.issues.map((issue, index) => (
                          <li key={index}>{issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Series Commitment */}
            {selectedSeries && (
              <div className="space-y-2">
                <Label>Series Commitment</Label>
                <div className="p-4 border rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">
                    By enrolling, you commit to attending all {selectedSeries.numberOfWeeks} sessions:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    {isMounted &&
                      calculateSessionDates(
                        selectedSeries.startDate,
                        selectedSeries.dayOfWeek,
                        selectedSeries.numberOfWeeks
                      ).map((date, index) => (
                        <li key={date}>
                          Session {index + 1}:{" "}
                          {new Date(date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          at {selectedSeries.startTime}
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="commitment"
                    checked={agreedToCommitment}
                    onCheckedChange={(checked) =>
                      setAgreedToCommitment(checked === true)
                    }
                  />
                  <Label
                    htmlFor="commitment"
                    className="text-sm font-normal cursor-pointer"
                  >
                    I agree to the series commitment (all {selectedSeries.numberOfWeeks} weeks)
                  </Label>
                </div>
              </div>
            )}

            {/* Payment Options */}
            {selectedSeries && (
              <div className="space-y-2">
                <Label>Payment Option <span className="text-destructive">*</span></Label>
                <RadioGroup
                  value={paymentOption}
                  onValueChange={(value) =>
                    setPaymentOption(value as "deposit" | "full")
                  }
                >
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="deposit" id="deposit" />
                    <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">Deposit</div>
                        <div className="text-sm text-muted-foreground">
                          ${selectedSeries.enrollmentRules.depositRequired} now, remainder due before first session
                        </div>
                      </div>
                    </Label>
                    <div className="font-semibold">
                      ${selectedSeries.enrollmentRules.depositRequired}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">Full Payment</div>
                        <div className="text-sm text-muted-foreground">
                          Pay entire series amount upfront
                        </div>
                      </div>
                    </Label>
                    <div className="font-semibold">
                      ${selectedSeries.enrollmentRules.fullPaymentAmount}
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEnrollmentModalOpen(false);
                setSelectedSeries(null);
                setSelectedPetId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={
                !selectedPetId ||
                !agreedToCommitment ||
                !prerequisiteValidation?.eligible ||
                isEnrolling
              }
            >
              {isEnrolling ? "Enrolling..." : "Enroll & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Details Modal */}
      <Dialog open={isCourseDetailsModalOpen} onOpenChange={setIsCourseDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Course Details</DialogTitle>
            <DialogDescription>
              {selectedCourseDetails?.courseTypeName}
            </DialogDescription>
          </DialogHeader>

          {selectedCourseDetails && (
            <div className="space-y-6 py-4">
              {/* Description */}
              <div className="space-y-2">
                <h3 className="font-semibold">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCourseType?.description || "No description available."}
                </p>
              </div>

              <Separator />

              {/* What to Bring */}
              {selectedCourseType?.whatToBring && selectedCourseType.whatToBring.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold">What to Bring</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                      {selectedCourseType.whatToBring.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                </>
              )}

              {/* Prerequisites */}
              <div className="space-y-2">
                <h3 className="font-semibold">Prerequisites</h3>
                <div className="space-y-2">
                  {selectedCourseType?.requiredVaccines && selectedCourseType.requiredVaccines.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Required Vaccinations:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                        {selectedCourseType.requiredVaccines.map((vaccine, index) => (
                          <li key={index}>{vaccine}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedCourseType?.prerequisites && selectedCourseType.prerequisites.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Required Courses:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                        {selectedCourseType.prerequisites.map((prereqId, index) => {
                          const prereqCourse = defaultTrainingCourseTypes.find((ct) => ct.id === prereqId);
                          return <li key={index}>{prereqCourse?.name || prereqId}</li>;
                        })}
                      </ul>
                    </div>
                  )}
                  {(!selectedCourseType?.requiredVaccines || selectedCourseType.requiredVaccines.length === 0) &&
                    (!selectedCourseType?.prerequisites || selectedCourseType.prerequisites.length === 0) && (
                      <p className="text-sm text-muted-foreground">No prerequisites required.</p>
                    )}
                </div>
              </div>

              <Separator />

              {/* Cancellation Policy */}
              {selectedCourseType?.cancellationPolicy && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Cancellation Policy</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCourseType.cancellationPolicy}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Refund Policy */}
              {selectedCourseType?.refundPolicy && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Refund Policy</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCourseType.refundPolicy}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCourseDetailsModalOpen(false);
                setSelectedCourseDetails(null);
              }}
            >
              Close
            </Button>
            {selectedCourseDetails && getSpotsLeft(selectedCourseDetails) > 0 && (
              <Button onClick={() => {
                setIsCourseDetailsModalOpen(false);
                handleEnrollClick(selectedCourseDetails);
              }}>
                Enroll Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waitlist Modal */}
      <Dialog open={isWaitlistModalOpen} onOpenChange={setIsWaitlistModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Waitlist</DialogTitle>
            <DialogDescription>
              This series is full. Join the waitlist to be notified when a spot opens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Pet <span className="text-destructive">*</span></Label>
              <Select
                value={selectedPetId?.toString() || ""}
                onValueChange={(value) => setSelectedPetId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose which pet..." />
                </SelectTrigger>
                <SelectContent>
                  {customer?.pets
                    .filter((p) => p.type === "Dog")
                    .map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name} - {pet.breed}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {waitlistPosition && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  If you join now, your position will be <strong>#{waitlistPosition}</strong>.
                  You'll receive an SMS notification when a spot opens, with a 24-hour window to claim it.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsWaitlistModalOpen(false);
                setSelectedSeries(null);
                setSelectedPetId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleJoinWaitlist} disabled={!selectedPetId}>
              Join Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
