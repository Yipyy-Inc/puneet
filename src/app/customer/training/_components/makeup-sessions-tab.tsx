"use client";

import { useState, useMemo } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useHydrated } from "@/hooks/use-hydrated";
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
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  formatDateLong,
  formatMoney,
  formatTimeOfDay,
  formatWeekday,
} from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

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
    paymentStatus: "paid",
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
    status: "active",
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
  const { t, fill, locale } = useCustomerText("training");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

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

  const missedSessions = useMemo(() => {
    const missed: MissedSessionInfo[] = [];

    enrollments.forEach((enrollment) => {
      if (enrollment.ownerId !== customerId) return;

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
  }, [customerId, enrollments, series, attendances, makeupSessions]);

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
          fill("makeupRequested", {
            week: selectedMissedSession.attendance.sessionNumber,
          }),
        );
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : t("failedToScheduleMakeup"),
        );
      }
    } else {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        toast.success(
          fill("weekSkipped", {
            week: selectedMissedSession.attendance.sessionNumber,
            next: selectedMissedSession.enrollment.currentSessionNumber,
          }),
        );
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : t("failedToSkipSession"),
        );
      }
    }

    setIsMakeupModalOpen(false);
    setSelectedMissedSession(null);
  };

  const formatDate = (dateStr: string) => {
    if (!isMounted) return dateStr;
    // A bare YYYY-MM-DD is a calendar day: read it at LOCAL midnight. Handed
    // to `new Date` as-is it parses as UTC and shows the day before anywhere
    // west of Greenwich — which is all of Canada.
    const day = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? (() => {
          const [y, m, d] = dateStr.split("-").map(Number);
          return new Date(y, m - 1, d);
        })()
      : new Date(dateStr);
    return formatDateLong(day, locale);
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
        <AlertTitle>{t("whatIsAMakeupSession")}</AlertTitle>
        <AlertDescription>
          {rich(t("makeupExplainer"), {
            makeup: <strong>{t("makeupSession")}</strong>,
            days: String(expirationDays),
          })}
          {makeupConfig?.expirationRules?.expiresAfterDays &&
            ` ${fill("unusedMakeupCreditsExpire", {
              n: makeupConfig.expirationRules.expiresAfterDays,
            })}`}
        </AlertDescription>
      </Alert>

      {missedSessions.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-green-600" />
            <p className="text-lg font-medium">{t("noMissedSessions")}</p>
            <p className="mt-2 text-sm">{t("allYourTrainingSessionsHave")}</p>
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
                          {fill("absentWeek", {
                            week: missed.attendance.sessionNumber,
                          })}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {missed.series.courseTypeName}
                      </CardDescription>
                    </div>
                    {missed.existingMakeup && (
                      <Badge variant="outline">
                        {missed.existingMakeup.status === "pending" &&
                          t("makeupPending")}
                        {missed.existingMakeup.status === "scheduled" &&
                          t("makeupScheduled")}
                        {missed.existingMakeup.status === "completed" &&
                          t("makeupCompleted")}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 space-y-3 rounded-lg p-4">
                    <p className="text-sm font-medium">
                      {t("missedSessionDetails")}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="size-4" />
                        <div>
                          <p className="text-foreground font-medium">
                            {t("date")}
                          </p>
                          <p>{formatDate(missed.sessionDate)}</p>
                        </div>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Clock className="size-4" />
                        <div>
                          <p className="text-foreground font-medium">
                            {t("time")}
                          </p>
                          <p>
                            {formatWeekday(
                              missed.series.dayOfWeek,
                              locale,
                              "long",
                            )}{" "}
                            {formatTimeOfDay(missed.series.startTime, locale)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {missed.attendance.trainerNotes && (
                      <div className="mt-2 border-t pt-2">
                        <p className="text-foreground mb-1 text-sm font-medium">
                          {t("reasonNotes")}
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
                        {t("makeupSessionStatus")}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {missed.existingMakeup.status === "pending" &&
                          t("makeupRequestPending")}
                        {missed.existingMakeup.status === "scheduled" &&
                          fill("makeupScheduledFor", {
                            date: missed.existingMakeup.scheduledDate
                              ? formatDate(missed.existingMakeup.scheduledDate)
                              : t("toBeDecided"),
                            time: missed.existingMakeup.scheduledTime
                              ? formatTimeOfDay(
                                  missed.existingMakeup.scheduledTime,
                                  locale,
                                )
                              : t("toBeDecided"),
                          })}
                        {missed.existingMakeup.status === "completed" &&
                          t("makeupSessionCompleted")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-lg border p-4">
                      <p className="text-sm font-medium">
                        {t("whatWouldYouLikeTo")}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleScheduleMakeup(missed)}
                        >
                          <GraduationCap className="mr-2 size-4" />
                          {t("schedulePrivateMakeup")}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleSkipSession(missed)}
                        >
                          <XCircle className="mr-2 size-4" />
                          {fill("skipAndContinueWeek", {
                            week: missed.enrollment.currentSessionNumber,
                          })}
                        </Button>
                      </div>
                      <div className="space-y-2 border-t pt-2">
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <DollarSign className="size-4" />
                          {fill("makeupSessionPrice", {
                            price: formatMoney(makeupPrice, locale),
                          })}
                        </div>
                        {makeupConfig?.expirationRules?.enabled && (
                          <p className="text-muted-foreground text-xs">
                            {fill("mustBeScheduledWithin", {
                              n: expirationDays,
                            })}
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
                ? t("scheduleMakeupSession")
                : t("skipSession")}
            </DialogTitle>
            <DialogDescription>
              {fill("petWeek", {
                pet: selectedMissedSession?.enrollment.petName ?? "",
                week: selectedMissedSession?.attendance.sessionNumber ?? "",
              })}
            </DialogDescription>
          </DialogHeader>

          {selectedMissedSession && (
            <div className="space-y-4 py-4">
              {makeupAction === "schedule" ? (
                <>
                  <div className="bg-muted space-y-2 rounded-lg p-4">
                    <p className="text-sm font-medium">
                      {t("makeupSessionDetails")}
                    </p>
                    <div className="text-muted-foreground space-y-1 text-sm">
                      <p>{t("privateOneOnOneSession")}</p>
                      <p>
                        •{" "}
                        {fill("coversMaterialFromWeek", {
                          week: selectedMissedSession.attendance.sessionNumber,
                        })}
                      </p>
                      <p>
                        •{" "}
                        {fill("priceIs", {
                          price: formatMoney(
                            calculateMakeupPrice(
                              selectedMissedSession.series,
                              selectedMissedSession.attendance.sessionNumber,
                              facilityConfig,
                            ),
                            locale,
                          ),
                        })}
                      </p>
                      <p>{t("wellContactYouToSchedule")}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-blue-900">
                      <AlertCircle className="mr-1 inline size-4" />
                      {t("afterRequestingWeContact")}
                    </p>
                  </div>
                </>
              ) : (
                <div className="border-destructive/20 bg-destructive/10 rounded-lg border p-4">
                  <p className="text-destructive mb-2 text-sm font-medium">
                    <AlertCircle className="mr-1 inline size-4" />
                    {t("youWillForfeitThisSession")}
                  </p>
                  <p className="text-destructive/80 text-sm">
                    {fill("bySkippingForfeitLong", {
                      week: selectedMissedSession.attendance.sessionNumber,
                      next: selectedMissedSession.enrollment
                        .currentSessionNumber,
                    })}
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
              {t("cancel")}
            </Button>
            <Button onClick={confirmMakeupAction}>
              {makeupAction === "schedule"
                ? t("requestMakeupSession")
                : t("skipSession")}
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
            <DialogTitle>{t("confirmSkipSession")}</DialogTitle>
            <DialogDescription>
              {fill("aboutToForfeitWeek", {
                week: selectedMissedSession?.attendance.sessionNumber ?? "",
              })}
            </DialogDescription>
          </DialogHeader>

          {selectedMissedSession && (
            <div className="space-y-4 py-4">
              <div className="border-destructive/20 bg-destructive/10 rounded-lg border p-4">
                <p className="text-destructive mb-2 text-sm font-medium">
                  <AlertCircle className="mr-1 inline size-4" />
                  {t("warningYouWillForfeitThis")}
                </p>
                <p className="text-destructive/80 mb-3 text-sm">
                  {fill("bySkippingForfeit", {
                    week: selectedMissedSession.attendance.sessionNumber,
                    next: selectedMissedSession.enrollment.currentSessionNumber,
                  })}
                </p>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <p>{t("thisSessionWillBeMarked")}</p>
                  <p>{t("youCanStillScheduleA")}</p>
                  <p>{t("youWillContinueWithThe")}</p>
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-900">
                  <AlertCircle className="mr-1 inline size-4" />
                  {t("considerMakeupInstead")}
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
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedMissedSession) return;
                setIsSkipConfirmModalOpen(false);
                try {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  toast.success(
                    fill("weekSkipped", {
                      week: selectedMissedSession.attendance.sessionNumber,
                      next: selectedMissedSession.enrollment
                        .currentSessionNumber,
                    }),
                  );
                } catch (error: unknown) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : t("failedToSkipSession"),
                  );
                }
                setSelectedMissedSession(null);
              }}
            >
              {t("yesSkipAndContinue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
