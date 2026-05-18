"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { Button } from "@/components/ui/button";
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
import { CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MakeupSessionsTab } from "./_components/makeup-sessions-tab";
import { CustomerHomeworkTab } from "./_components/customer-homework-tab";
import { CustomerReportCardsTab } from "./_components/customer-report-cards-tab";
import { CustomerTrainingPackagesTab } from "./_components/customer-training-packages-tab";
import { CustomerMyPetsTab } from "./_components/customer-my-pets-tab";
import {
  CustomerTrainingCatalog,
  matchSeriesForCourse,
} from "./_components/customer-training-catalog";
import { CustomerTrainingSeriesCard } from "./_components/customer-training-series-card";
import { TrainingWaiversSection } from "./_components/training-waivers-section";
import { EnrollmentConfirmationDialog } from "./_components/enrollment-confirmation-dialog";
import { DropInDialog } from "./_components/drop-in-dialog";
import { allRequiredWaiversSigned } from "@/data/training-waivers";
import { trainingQueries } from "@/lib/api/training";
import type {
  SeriesPaymentStatus,
  TrainingEnrollment,
} from "@/lib/training-enrollment";
import type { TrainingPackage } from "@/types/training";
import {
  type TrainingSeries,
  calculateSessionDates,
} from "@/lib/training-series";
import {
  defaultTrainingCourseTypes,
  type TrainingCourseType,
} from "@/lib/training-config";
import { validatePrerequisites } from "@/lib/training-prerequisites";
import { checkCourseProgression } from "@/lib/training-progression";
import { type TrainingCertificate } from "@/lib/training-enrollment";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;
/** Facility-wide drop-in toggle. Eventually owned by Settings → Training;
 *  hardcoded for now so the demo can showcase the single-session flow. */
const FACILITY_ALLOWS_DROPINS = true;

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
      // Drop-ins enabled so the demo can showcase the single-session flow.
      allowDropIns: true,
    },
    status: "upcoming",
    sessions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const VALID_CUSTOMER_TRAINING_TABS = new Set([
  "pets",
  "classes",
  "homework",
  "report-cards",
  "packages",
  "makeup",
]);

export default function CustomerTrainingPage() {
  const { selectedFacility } = useCustomerFacility();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const defaultTab = (() => {
    const raw = searchParams.get("tab");
    return raw && VALID_CUSTOMER_TRAINING_TABS.has(raw) ? raw : "pets";
  })();
  const [isMounted, setIsMounted] = useState(false);
  const [series] = useState<TrainingSeries[]>(mockSeries);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<TrainingSeries | null>(
    null,
  );
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [paymentOption, setPaymentOption] = useState<"deposit" | "full">(
    "deposit",
  );
  const [agreedToCommitment, setAgreedToCommitment] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [certificates] = useState<TrainingCertificate[]>([]); // Mock - would come from API
  const [isCourseDetailsModalOpen, setIsCourseDetailsModalOpen] =
    useState(false);
  const [selectedCourseDetails, setSelectedCourseDetails] =
    useState<TrainingSeries | null>(null);
  // Two-step catalog → series flow. `null` shows the Course Catalog;
  // setting a `TrainingPackage` switches to the filtered series view.
  const [selectedCourse, setSelectedCourse] = useState<TrainingPackage | null>(
    null,
  );
  // Required + optional waivers the owner has signed off on.
  const [agreedWaivers, setAgreedWaivers] = useState<Set<string>>(new Set());
  // Post-submit confirmation modal — opens after the enrollment dialog closes
  // so the owner gets schedule + location + what-to-bring all in one view.
  const [confirmation, setConfirmation] = useState<{
    series: TrainingSeries;
    petName: string;
    courseType: TrainingCourseType | null;
    paymentLabel: string;
  } | null>(null);
  // Drop-in dialog state — opened from the series card's "Book Drop-In
  // Session" button when the series has `allowDropIns`.
  const [dropInSeries, setDropInSeries] = useState<TrainingSeries | null>(null);
  // Mock enrollments - in production, this would come from API
  const [enrollments] = useState<
    Array<{ seriesId: string; petId: number; petName: string }>
  >([
    // Example: { seriesId: "series-001", petId: 1, petName: "Buddy" }
  ]);

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check course progression for all pets (only show unlocked courses)
  const progressionByPet = useMemo(() => {
    if (!customer) return {};
    const progression: Record<
      number,
      ReturnType<typeof checkCourseProgression>
    > = {};

    customer.pets.forEach((pet) => {
      if (pet.type === "Dog") {
        progression[pet.id] = checkCourseProgression(
          pet.id,
          defaultTrainingCourseTypes,
          certificates,
        );
      }
    });

    return progression;
  }, [customer, certificates]);

  // Filter series based on search, status, and progression (only show unlocked courses)
  const availableSeries = useMemo(() => {
    // When the user has drilled into a specific course from the catalog,
    // narrow the visible series to the ones that match that course by name
    // (the customer-side series don't carry a packageId yet).
    const matchedForCourse = selectedCourse
      ? matchSeriesForCourse(selectedCourse, series).map((s) => s.id)
      : null;
    const matchedSet = matchedForCourse ? new Set(matchedForCourse) : null;

    return series.filter((s) => {
      if (s.status !== "upcoming") return false;
      if (matchedSet && !matchedSet.has(s.id)) return false;

      // Check if course is unlocked for at least one pet
      const courseType = defaultTrainingCourseTypes.find(
        (ct) => ct.id === s.courseTypeId,
      );
      if (!courseType) return false;

      // If no prerequisites, always show
      if (courseType.prerequisites.length === 0) {
        // Show it
      } else {
        // Check if unlocked for at least one pet
        const isUnlocked = Object.values(progressionByPet).some(
          (progression) => {
            const courseProg = progression.find(
              (p) => p.courseTypeId === s.courseTypeId,
            );
            return courseProg?.isUnlocked ?? false;
          },
        );

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
  }, [series, searchQuery, progressionByPet, selectedCourse]);

  // Calculate spots left for each series
  const getSpotsLeft = (seriesItem: TrainingSeries): number => {
    // In production, this would count actual enrollments
    const enrolledCount = 5; // Mock data
    return Math.max(0, seriesItem.maxCapacity - enrolledCount);
  };

  const handleEnrollClick = (seriesItem: TrainingSeries) => {
    setSelectedSeries(seriesItem);
    setSelectedPetId(null);
    setPaymentOption("deposit");
    setAgreedToCommitment(false);
    setAgreedWaivers(new Set());
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

    if (!allRequiredWaiversSigned(agreedWaivers)) {
      toast.error("Please sign every required waiver to continue");
      return;
    }

    const pet = customer.pets.find((p) => p.id === selectedPetId);
    if (!pet) {
      toast.error("Pet not found");
      return;
    }

    const courseType = defaultTrainingCourseTypes.find(
      (ct) => ct.id === selectedSeries.courseTypeId,
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

      // Fan a new TrainingEnrollment into the facility-side cache so the
      // trainer's Series Students list sees the new student immediately.
      const paymentStatus: SeriesPaymentStatus =
        paymentOption === "full" ? "paid" : "deposit";
      const nowISO = new Date().toISOString();
      const newEnrollment: TrainingEnrollment = {
        id: `series-enroll-${selectedSeries.id}-${pet.id}-${Date.now()}`,
        seriesId: selectedSeries.id,
        seriesName: selectedSeries.seriesName,
        courseTypeId: selectedSeries.courseTypeId,
        courseTypeName: selectedSeries.courseTypeName,
        petId: pet.id,
        petName: pet.name,
        petBreed: pet.breed ?? "",
        ownerId: customer.id,
        ownerName: customer.name,
        ownerPhone: customer.phone ?? "",
        ownerEmail: customer.email ?? "",
        enrollmentDate: nowISO,
        status: "enrolled",
        sessionsAttended: 0,
        totalSessions: selectedSeries.numberOfWeeks,
        currentSessionNumber: 1,
        progress: 0,
        paymentStatus,
        notes: "",
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      queryClient.setQueryData<TrainingEnrollment[]>(
        trainingQueries.allSeriesEnrollments().queryKey,
        (prev = []) => [...prev, newEnrollment],
      );
      queryClient.setQueryData<TrainingEnrollment[]>(
        trainingQueries.seriesEnrollments(selectedSeries.id).queryKey,
        (prev = []) => [...prev, newEnrollment],
      );

      setIsEnrollmentModalOpen(false);
      setConfirmation({
        series: selectedSeries,
        petName: pet.name,
        courseType,
        paymentLabel:
          paymentOption === "full"
            ? "Paid in full"
            : `Deposit · $${selectedSeries.enrollmentRules.depositRequired} paid`,
      });
      setSelectedSeries(null);
      setSelectedPetId(null);
      setAgreedToCommitment(false);
      setAgreedWaivers(new Set());
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to enroll");
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
        `${pet.name} added to waitlist. Position: #${waitlistPosition}. You'll be notified when a spot opens.`,
      );
      setIsWaitlistModalOpen(false);
      setSelectedSeries(null);
      setSelectedPetId(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join waitlist",
      );
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
      (ct) => ct.id === series.courseTypeId,
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
    _facilityName: string,
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
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
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
        <h2 className="text-3xl font-bold tracking-tight">Training</h2>
        <p className="text-muted-foreground">
          Browse classes, enroll your pets, and manage makeup sessions
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="pets">My Pets</TabsTrigger>
          <TabsTrigger value="classes">Training Classes</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="report-cards">Report Cards</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="makeup">Makeup Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="pets" className="space-y-4 pt-2">
          <CustomerMyPetsTab customerId={MOCK_CUSTOMER_ID} />
        </TabsContent>

        <TabsContent value="classes" className="space-y-6 pt-2">
      {selectedCourse === null ? (
        /* Step 1 — Course Catalog */
        <CustomerTrainingCatalog
          series={series}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectCourse={(course) => {
            setSelectedCourse(course);
            // Reset the search when drilling in so the second step starts
            // fresh; the catalog query and the series query are different
            // mental models.
            setSearchQuery("");
          }}
        />
      ) : (
        <>
        {/* Step 2 — Available Classes header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 mb-1 h-7 gap-1 text-[12px]"
              onClick={() => {
                setSelectedCourse(null);
                setSearchQuery("");
              }}
            >
              ← Back to all courses
            </Button>
            <h3 className="text-xl font-semibold tracking-tight">
              {selectedCourse.name}
            </h3>
            <p className="text-muted-foreground text-sm">
              Available classes for this course
            </p>
          </div>
        </div>

      {/* Search (scoped to the selected course's series) */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by instructor or series name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Series Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableSeries.length === 0 ? (
          <div className="text-muted-foreground col-span-full rounded-xl border border-dashed py-12 text-center text-sm">
            No upcoming classes for {selectedCourse.name} right now — check
            back soon or join the waitlist on a related course.
          </div>
        ) : (
          availableSeries.map((seriesItem) => {
            const spotsLeft = getSpotsLeft(seriesItem);
            const enrolledPetNames = enrollments
              .filter((e) => e.seriesId === seriesItem.id)
              .map((e) => e.petName);
            const dropInsEnabled =
              FACILITY_ALLOWS_DROPINS &&
              seriesItem.enrollmentRules.allowDropIns;
            return (
              <CustomerTrainingSeriesCard
                key={seriesItem.id}
                series={seriesItem}
                enrolledPetNames={enrolledPetNames}
                spotsLeft={spotsLeft}
                isMounted={isMounted}
                dropInsEnabled={dropInsEnabled}
                onEnroll={() => handleEnrollClick(seriesItem)}
                onWaitlist={() => handleWaitlistClick(seriesItem)}
                onDetails={() => handleCourseDetailsClick(seriesItem)}
                onBookDropIn={() => setDropInSeries(seriesItem)}
              />
            );
          })
        )}
      </div>
        </>
      )}

      {/* Enrollment Modal */}
      <Dialog
        open={isEnrollmentModalOpen}
        onOpenChange={setIsEnrollmentModalOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll in Training Series</DialogTitle>
            <DialogDescription>{selectedSeries?.seriesName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Pet Selection */}
            <div className="space-y-2">
              <Label>
                Select Pet <span className="text-destructive">*</span>
              </Label>
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
                <div className="space-y-2 rounded-lg border p-4">
                  {prerequisiteValidation.eligible ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="size-5" />
                      <span className="font-medium">
                        All prerequisites met!
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-destructive flex items-center gap-2">
                        <XCircle className="size-5" />
                        <span className="font-medium">
                          Prerequisites not met
                        </span>
                      </div>
                      <ul className="text-muted-foreground ml-7 list-inside list-disc space-y-1 text-sm">
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
                <div className="space-y-2 rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">
                    By enrolling, you commit to attending all{" "}
                    {selectedSeries.numberOfWeeks} sessions:
                  </p>
                  <ul className="ml-4 list-inside list-disc space-y-1 text-sm">
                    {isMounted &&
                      calculateSessionDates(
                        selectedSeries.startDate,
                        selectedSeries.dayOfWeek,
                        selectedSeries.numberOfWeeks,
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
                    className="cursor-pointer text-sm font-normal"
                  >
                    I agree to the series commitment (all{" "}
                    {selectedSeries.numberOfWeeks} weeks)
                  </Label>
                </div>
              </div>
            )}

            {/* Waivers — required acknowledgements */}
            {selectedSeries && (
              <TrainingWaiversSection
                agreed={agreedWaivers}
                onChange={setAgreedWaivers}
              />
            )}

            {/* Payment Options */}
            {selectedSeries && (
              <div className="space-y-2">
                <Label>
                  Payment Option <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={paymentOption}
                  onValueChange={(value) =>
                    setPaymentOption(value as "deposit" | "full")
                  }
                >
                  <div className="flex items-center space-x-2 rounded-lg border p-4">
                    <RadioGroupItem value="deposit" id="deposit" />
                    <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">Deposit</div>
                        <div className="text-muted-foreground text-sm">
                          ${selectedSeries.enrollmentRules.depositRequired} now,
                          remainder due before first session
                        </div>
                      </div>
                    </Label>
                    <div className="font-semibold">
                      ${selectedSeries.enrollmentRules.depositRequired}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-4">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">Full Payment</div>
                        <div className="text-muted-foreground text-sm">
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
                !allRequiredWaiversSigned(agreedWaivers) ||
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
      <Dialog
        open={isCourseDetailsModalOpen}
        onOpenChange={setIsCourseDetailsModalOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
                <p className="text-muted-foreground text-sm">
                  {selectedCourseType?.description ||
                    "No description available."}
                </p>
              </div>

              <Separator />

              {/* What to Bring */}
              {selectedCourseType?.whatToBring &&
                selectedCourseType.whatToBring.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-semibold">What to Bring</h3>
                      <ul className="text-muted-foreground ml-2 list-inside list-disc space-y-1 text-sm">
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
                  {selectedCourseType?.requiredVaccines &&
                    selectedCourseType.requiredVaccines.length > 0 && (
                      <div>
                        <p className="mb-1 text-sm font-medium">
                          Required Vaccinations:
                        </p>
                        <ul className="text-muted-foreground ml-2 list-inside list-disc space-y-1 text-sm">
                          {selectedCourseType.requiredVaccines.map(
                            (vaccine, index) => (
                              <li key={index}>{vaccine}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  {selectedCourseType?.prerequisites &&
                    selectedCourseType.prerequisites.length > 0 && (
                      <div>
                        <p className="mb-1 text-sm font-medium">
                          Required Courses:
                        </p>
                        <ul className="text-muted-foreground ml-2 list-inside list-disc space-y-1 text-sm">
                          {selectedCourseType.prerequisites.map(
                            (prereqId, index) => {
                              const prereqCourse =
                                defaultTrainingCourseTypes.find(
                                  (ct) => ct.id === prereqId,
                                );
                              return (
                                <li key={index}>
                                  {prereqCourse?.name || prereqId}
                                </li>
                              );
                            },
                          )}
                        </ul>
                      </div>
                    )}
                  {(!selectedCourseType?.requiredVaccines ||
                    selectedCourseType.requiredVaccines.length === 0) &&
                    (!selectedCourseType?.prerequisites ||
                      selectedCourseType.prerequisites.length === 0) && (
                      <p className="text-muted-foreground text-sm">
                        No prerequisites required.
                      </p>
                    )}
                </div>
              </div>

              <Separator />

              {/* Cancellation Policy */}
              {selectedCourseType?.cancellationPolicy && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Cancellation Policy</h3>
                    <p className="text-muted-foreground text-sm">
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
                  <p className="text-muted-foreground text-sm">
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
            {selectedCourseDetails &&
              getSpotsLeft(selectedCourseDetails) > 0 && (
                <Button
                  onClick={() => {
                    setIsCourseDetailsModalOpen(false);
                    handleEnrollClick(selectedCourseDetails);
                  }}
                >
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
              This series is full. Join the waitlist to be notified when a spot
              opens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Select Pet <span className="text-destructive">*</span>
              </Label>
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
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm">
                  If you join now, your position will be{" "}
                  <strong>#{waitlistPosition}</strong>. You&apos;ll receive an
                  SMS notification when a spot opens, with a 24-hour window to
                  claim it.
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

      {/* Drop-In Dialog — single-session purchase */}
      <DropInDialog
        open={!!dropInSeries}
        onOpenChange={(o) => {
          if (!o) setDropInSeries(null);
        }}
        series={dropInSeries}
        pets={customer?.pets ?? []}
      />

      {/* Enrollment Confirmation — full schedule + what to bring */}
      <EnrollmentConfirmationDialog
        open={!!confirmation}
        onOpenChange={(o) => {
          if (!o) setConfirmation(null);
        }}
        series={confirmation?.series ?? null}
        petName={confirmation?.petName ?? null}
        courseType={confirmation?.courseType ?? null}
        paymentLabel={confirmation?.paymentLabel ?? ""}
        onAddToCalendar={() => {
          if (!confirmation) return;
          const sessionDates = calculateSessionDates(
            confirmation.series.startDate,
            confirmation.series.dayOfWeek,
            confirmation.series.numberOfWeeks,
          );
          const icsContent = generateICSForSessions(
            confirmation.series,
            sessionDates,
            confirmation.petName,
            selectedFacility?.name || "Facility",
          );
          downloadICSFile(
            icsContent,
            `${confirmation.series.seriesName.replace(/\s+/g, "-")}-sessions.ics`,
          );
          toast.success("Calendar file downloaded");
        }}
      />
        </TabsContent>

        <TabsContent value="homework" className="space-y-4 pt-2">
          <CustomerHomeworkTab customerId={MOCK_CUSTOMER_ID} />
        </TabsContent>

        <TabsContent value="report-cards" className="space-y-4 pt-2">
          <CustomerReportCardsTab customerId={MOCK_CUSTOMER_ID} />
        </TabsContent>

        <TabsContent value="packages" className="space-y-4 pt-2">
          <CustomerTrainingPackagesTab customerId={MOCK_CUSTOMER_ID} />
        </TabsContent>

        <TabsContent value="makeup" className="pt-2">
          <MakeupSessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
