"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { checkinQueries } from "@/lib/api/checkin-requirements";
import {
  getCheckinConfig,
  isSectionEnabledForService,
} from "@/data/checkin-requirements";
import { getFormTemplateForService } from "@/data/yipyygo-config";
import { useCustomerYipyyGo } from "@/lib/api/customer-yipyy-go";
import {
  getYipyyGoForm,
  getLastStayFormForPet,
  saveYipyyGoForm,
  generateVerificationCode,
  verifyCode,
  checkFormDeadline,
  type YipyyGoFormData,
} from "@/data/yipyygo-forms";
import { notifyFacilityStaffYipyyGoSubmitted } from "@/data/facility-notifications";
import { getOrCreateCheckInToken } from "@/lib/qr-checkin";
import { logCustomerSubmission } from "@/lib/checkin-audit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Lock,
  AlertCircle,
  Loader2,
  Clock,
  RotateCcw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ContactInfoSection } from "@/components/yipyygo/form-sections/ContactInfoSection";
import { PetDetailsSection } from "@/components/yipyygo/form-sections/PetDetailsSection";
import { BookingDetailsSection } from "@/components/yipyygo/form-sections/BookingDetailsSection";
import { BelongingsSection } from "@/components/yipyygo/form-sections/BelongingsSection";
import { FeedingSection } from "@/components/yipyygo/form-sections/FeedingSection";
import { MedicationSection } from "@/components/yipyygo/form-sections/MedicationSection";
import { AddOnsSection } from "@/components/yipyygo/form-sections/AddOnsSection";
import { ReviewSection } from "@/components/yipyygo/form-sections/ReviewSection";
import { TipPromptDialog } from "@/components/yipyygo/TipPromptDialog";
import { Separator } from "@/components/ui/separator";
import type { TipSelection } from "@/types/yipyygo";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong, formatTimeOfDay } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { rich } from "@/lib/i18n/rich";

type AuthState = "checking" | "authenticated" | "login" | "verification";

// A booking's start is a calendar day. A bare YYYY-MM-DD handed to `new Date`
// parses as UTC midnight — the day before, anywhere in Canada — so it is read
// at local midnight; a full timestamp is left to `new Date`.
function localDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function YipyyGoFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, fill, locale } = useCustomerText("yipyygo");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { id } = use(params);
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Get booking and customer data
  const booking = useMemo(() => {
    return bookings.find((b) => String(b.id) === id);
  }, [id]);

  // The BOOKING's client, which is who the form is about. Distinct from the
  // signed-in caller above: RLS only shows a customer their own bookings, so in
  // practice they are the same person, and naming them apart keeps the form
  // correct if a staff member ever opens it.
  const bookingClient = useMemo(() => {
    if (!booking) return null;
    return clients.find((c) => c.id === booking.clientId);
  }, [booking]);

  const pet = useMemo(() => {
    if (!customer || !booking) return null;
    const petId = Array.isArray(booking.petId)
      ? booking.petId[0]
      : booking.petId;
    return customer.pets?.find((p) => p.id === petId);
  }, [customer, booking]);

  // The facility setup this form is built from, read through this customer's
  // own client row. It used to be `getYipyyGoConfig(booking.facilityId)` — a
  // fixture array in the bundle — so the questions, the deadline, the tip
  // prompt and the medication fee all came from a seed file rather than from
  // the business the customer is actually visiting.
  //
  // Null while it loads, deliberately: every branch below already treats null
  // as "we do not know yet", and the alternative is rendering the OFF fallback
  // as though the facility had chosen it.
  const { config: loadedYipyyGo, isPending: yipyyGoPending } =
    useCustomerYipyyGo();
  const yipyyGoConfig = yipyyGoPending ? null : loadedYipyyGo;

  // Per-service check-in requirements (Settings → Check-in Requirements).
  // initialData gives a synchronous value so section visibility is stable.
  const { data: checkinConfig } = useQuery({
    ...checkinQueries.config(),
    initialData: getCheckinConfig,
  });

  // Get or create form data
  const [formData, setFormData] = useState<YipyyGoFormData | null>(null);

  // Check deadline
  // For development/testing: always allow editing (bypass deadline check)
  const DEV_MODE = process.env.NODE_ENV === "development";

  const deadlineInfo = useMemo(() => {
    if (!booking || !yipyyGoConfig) return null;

    const checkInDate = new Date(booking.startDate);
    if (booking.checkInTime) {
      const [hours, minutes] = booking.checkInTime.split(":").map(Number);
      checkInDate.setHours(hours, minutes, 0, 0);
    }

    const deadline = new Date(checkInDate);
    deadline.setHours(deadline.getHours() - yipyyGoConfig.timing.deadline);

    // In development mode, always allow editing
    if (DEV_MODE) {
      return {
        isPastDeadline: false,
        canEdit: true,
        timeRemaining: "Unlimited (Dev Mode)",
      };
    }

    return checkFormDeadline(deadline.toISOString());
  }, [booking, yipyyGoConfig, DEV_MODE]);

  // Initialize form data
  useEffect(() => {
    if (!booking || !pet || !customer) return;

    // Check if user is logged in (mock - in production, check auth context)
    const isLoggedIn = true; // TODO: Get from auth context

    if (isLoggedIn) {
      setAuthState("authenticated");

      // Load existing form or create new one
      const existingForm = getYipyyGoForm(booking.id);
      if (existingForm) {
        setFormData(existingForm);
      } else {
        // Create new form with pre-filled data
        const checkInDate = new Date(booking.startDate);
        if (booking.checkInTime) {
          const [hours, minutes] = booking.checkInTime.split(":").map(Number);
          checkInDate.setHours(hours, minutes, 0, 0);
        }
        const deadline = new Date(checkInDate);
        deadline.setHours(
          deadline.getHours() - (yipyyGoConfig?.timing.deadline || 12),
        );

        const newForm: YipyyGoFormData = {
          bookingId: booking.id,
          clientId: booking.clientId,
          petId: Array.isArray(booking.petId)
            ? booking.petId[0]
            : booking.petId,
          petName: pet.name,
          facilityId: booking.facilityId,
          belongings: [],
          medications: [],
          noMedications: false,
          addOns: [],
          // In development mode, always allow editing
          isLocked: DEV_MODE ? false : deadlineInfo?.isPastDeadline || false,
          deadline: deadline.toISOString(),
          canEdit: DEV_MODE ? true : deadlineInfo?.canEdit || false,
        };
        setFormData(newForm);
      }
    } else {
      setAuthState("login");
    }
  }, [booking, pet, customer, yipyyGoConfig, deadlineInfo, DEV_MODE]);

  // Handle verification code request
  const handleRequestCode = async () => {
    if (!booking || !customer) return;

    generateVerificationCode(booking.id, customer.email, customer.phone);
    setCodeSent(true);
    toast.success(t("verificationCodeSentToYour"));
  };

  // Handle verification code submission
  const handleVerifyCode = () => {
    if (!booking || !verificationCode) return;

    const result = verifyCode(verificationCode, booking.id);
    if (result.valid) {
      setAuthState("authenticated");
      toast.success(t("verifiedSuccessfully"));

      // Initialize form data
      const existingForm = getYipyyGoForm(booking.id);
      if (existingForm) {
        setFormData(existingForm);
      } else {
        // Create new form (same as above)
        // ... (same initialization logic)
      }
    } else {
      toast.error(result.error || t("invalidCode"));
    }
  };

  // Review "Submit" → show tip popup first (if configured), else finalize directly
  const handleSubmit = async () => {
    if (!formData || !booking) return;
    if (yipyyGoConfig?.tipPopup?.enabled) {
      setShowTipDialog(true);
      return;
    }
    void finalizeSubmission(undefined);
  };

  const finalizeSubmission = async (tip: TipSelection | undefined) => {
    if (!formData || !booking) return;

    setIsSubmitting(true);
    try {
      let saved = saveYipyyGoForm({
        ...formData,
        tip: tip ?? formData.tip,
        submittedAt: new Date().toISOString(),
        submittedBy: customerId,
      });

      // Generate QR check-in token (booking_id + pet_id + token, no PII)
      const petId = Array.isArray(booking.petId)
        ? booking.petId[0]
        : booking.petId;
      if (!saved.qrCheckInToken) {
        const token = getOrCreateCheckInToken(
          booking.id,
          petId,
          booking.facilityId,
        );
        saved = saveYipyyGoForm({ ...saved, qrCheckInToken: token });
      }

      // Audit: customer submission (original)
      logCustomerSubmission({
        facilityId: booking.facilityId,
        bookingId: Number(booking.id),
        petId: Array.isArray(booking.petId) ? booking.petId[0] : booking.petId,
        userId: customerId ?? 0,
        userName: bookingClient?.name,
        metadata: { submittedAt: saved.submittedAt },
      });

      // Notify facility staff (in-app + optional email)
      const arrivalTime = booking?.checkInTime
        ? `${booking.startDate} ${booking.checkInTime}`
        : booking?.startDate;
      notifyFacilityStaffYipyyGoSubmitted({
        facilityId: booking.facilityId,
        bookingId: Number(booking.id),
        // french-ok: a fallback inside a staff notification payload, not copy
        petName: pet?.name ?? "Pet",
        clientName: customer?.name,
        arrivalTime,
        sendEmail: yipyyGoConfig?.notifyStaffEmailOnSubmit ?? false,
      });

      // Mock customer confirmation email (would go through a real email provider)
      if (yipyyGoConfig?.confirmationEmail?.enabled) {
        const dateStr = formatDateLong(localDay(booking.startDate), locale);
        const message = yipyyGoConfig.confirmationEmail.message
          .replace(/\{petName\}/g, pet?.name ?? t("yourPet"))
          .replace(/\{date\}/g, dateStr);
        console.info(
          "[YipyyGo confirmation email]",
          customer?.email,
          yipyyGoConfig.confirmationEmail.subject,
          message,
        );
      }

      setShowTipDialog(false);
      setIsSubmitted(true);
      toast.success(t("expressCheckInSubmittedConfirmation"));
    } catch (error) {
      toast.error(t("failedToSubmitFormPlease"));
      console.error("Error submitting Express Check-in form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update form data
  const updateFormData = (updates: Partial<YipyyGoFormData>) => {
    if (!formData) return;
    setFormData({ ...formData, ...updates });
  };

  // Last stay form for "Use same as last time" (plane check-in style, under 2–4 min)
  const lastStayForm = useMemo(() => {
    if (!booking || !pet) return null;
    const petId = Array.isArray(booking.petId)
      ? booking.petId[0]
      : booking.petId;
    return getLastStayFormForPet(
      booking.clientId,
      petId,
      booking.facilityId,
      booking.id,
    );
  }, [booking, pet]);

  const applyLastStayPreferences = () => {
    if (!formData || !lastStayForm) return;
    setFormData({
      ...formData,
      belongings: lastStayForm.belongings?.length
        ? lastStayForm.belongings.map((b) => ({
            ...b,
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }))
        : formData.belongings,
      belongingsPhotoUrl:
        lastStayForm.belongingsPhotoUrl ?? formData.belongingsPhotoUrl,
      feedingInstructions:
        lastStayForm.feedingInstructions ?? formData.feedingInstructions,
      medications: lastStayForm.medications?.length
        ? lastStayForm.medications.map((m) => ({
            ...m,
            id: `med-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }))
        : formData.medications,
      noMedications: lastStayForm.noMedications ?? formData.noMedications,
      behaviorNotes: lastStayForm.behaviorNotes ?? formData.behaviorNotes,
      addOns: lastStayForm.addOns?.length
        ? lastStayForm.addOns.map((a) => ({ ...a, selected: a.selected }))
        : formData.addOns,
    });
    toast.success(t("lastStayPreferencesAppliedReview"));
  };

  if (!booking || !customer || !pet) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{t("bookingNotFound")}</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/customer/bookings")}
          >
            <ArrowLeft className="mr-2 size-4" />
            {t("backToBookings")}
          </Button>
        </div>
      </div>
    );
  }

  // Authentication screens
  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (authState === "login") {
    return (
      <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("accessExpressCheckInForm")}</CardTitle>
            <CardDescription>{t("logInOrVerifyToAccess")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={() =>
                router.push(
                  `/customer/auth/login?redirect=/customer/bookings/${id}/yipyygo-form`,
                )
              }
            >
              {t("logInToPortal")}
            </Button>
            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background text-muted-foreground px-2 text-sm">
                  OR
                </span>
              </div>
            </div>
            {!codeSent ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRequestCode}
              >
                {t("sendVerificationCode")}
              </Button>
            ) : (
              <div className="space-y-2">
                <Label>{t("enterVerificationCode")}</Label>
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                />
                <Button
                  className="w-full"
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 6}
                >
                  {t("verifyCode")}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setCodeSent(false);
                    setVerificationCode("");
                  }}
                >
                  {t("requestNewCode")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authState === "verification") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("verifyAccess")}</CardTitle>
            <CardDescription>
              {t("enterTheVerificationCodeSent")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("verificationCode")}</Label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleVerifyCode}
              disabled={verificationCode.length !== 6}
            >
              {t("verify")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form locked after deadline (skip in development mode)
  if (!DEV_MODE && formData?.isLocked && !formData.submittedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" />
              {t("formLocked")}
            </CardTitle>
            <CardDescription>
              {t("theDeadlineForSubmittingThis")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                {t("contactFacilityDirectly")}
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => router.push(`/customer/bookings/${booking.id}`)}
            >
              {t("backToBooking")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen after submission
  if (isSubmitted) {
    const arrivalDate = formatDateLong(localDay(booking.startDate), locale);
    return (
      <div className="from-background via-primary/5 to-background flex min-h-screen items-center justify-center bg-linear-to-br p-4">
        <Card className="w-full max-w-lg border-green-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <PartyPopper className="size-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              {fill("youreAllSet", { name: customer.name.split(" ")[0] })}
            </CardTitle>
            <CardDescription className="text-base">
              {rich(
                t(booking.checkInTime ? "excitedToMeetAt" : "excitedToMeet"),
                {
                  pet: <strong className="text-foreground">{pet.name}</strong>,
                  date: (
                    <strong className="text-foreground">{arrivalDate}</strong>
                  ),
                  time: booking.checkInTime
                    ? formatTimeOfDay(booking.checkInTime, locale)
                    : "",
                },
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="size-4 text-green-600" />
              <AlertDescription>
                {rich(t("confirmationEmailSentTo"), {
                  email: <strong>{customer.email}</strong>,
                })}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() =>
                  router.push(`/customer/bookings/${booking.id}/check-in-qr`)
                }
              >
                {t("viewCheckInQr")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/customer/dashboard")}
              >
                {t("backToDashboard")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form
  if (!formData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  // Resolve the form template that applies to this booking's service so any
  // per-service override configured in global Yipyy settings takes effect.
  const effectiveFormTemplate = yipyyGoConfig
    ? getFormTemplateForService(yipyyGoConfig, booking.service)
    : null;
  const features = effectiveFormTemplate?.features;
  // A section is shown only if the facility hasn't disabled it for this service
  // in Check-in Requirements settings (per-service override or default).
  const sectionEnabled = (key: string) =>
    isSectionEnabledForService(checkinConfig, booking.service, key);
  const sections = [
    ...(features?.contactInfoSection !== false
      ? [
          {
            id: "contact",
            label: t("contactInfo"),
            component: ContactInfoSection,
          },
        ]
      : []),
    ...(features?.petDetailsSection !== false
      ? [
          {
            id: "pet-details",
            label: t("petDetails"),
            component: PetDetailsSection,
          },
        ]
      : []),
    ...(features?.bookingDetailsSection !== false
      ? [
          {
            id: "booking-details",
            label: t("booking"),
            component: BookingDetailsSection,
          },
        ]
      : []),
    ...(sectionEnabled("feeding")
      ? [{ id: "feeding", label: t("feeding"), component: FeedingSection }]
      : []),
    ...(sectionEnabled("medication")
      ? [
          {
            id: "medication",
            label: t("medications"),
            component: MedicationSection,
          },
        ]
      : []),
    ...(features?.addOnsSection
      ? [{ id: "addons", label: t("addOns"), component: AddOnsSection }]
      : []),
    ...(sectionEnabled("belongings")
      ? [
          {
            id: "belongings",
            label: t("belongings"),
            component: BelongingsSection,
          },
        ]
      : []),
    { id: "review", label: t("review"), component: ReviewSection },
  ];

  const CurrentSectionComponent = sections[currentSection]?.component;

  const totalSections = sections.length;
  const stepLabel =
    currentSection === totalSections - 1
      ? t("review")
      : fill("stepOf", { n: currentSection + 1, total: totalSections - 1 });

  return (
    <div className="bg-background min-h-screen p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header – plane check-in style: fast, clear */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/customer/bookings/${booking.id}`)}
            >
              <ArrowLeft className="mr-2 size-4" />
              {t("back")}
            </Button>
            {/* "Yipyy" here is the product, not the mascot — CLAUDE.md's
                asset rule: he is "Yipyy" only where a character is plainly
                meant, and never let one sentence mean both. */}
            <PageHeader
              className="mt-2"
              title={t("yipyyExpressCheckIn")}
              inline={
                <span className="bg-surface-inset text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  <Zap className="size-3" />
                  ~2 min
                </span>
              }
              description={`${pet.name} · ${booking.service} · ${stepLabel}`}
            />
          </div>
          {deadlineInfo && !deadlineInfo.isPastDeadline && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Clock className="size-4" />
              <span>{deadlineInfo.timeRemaining}</span>
            </div>
          )}
        </div>

        {/* Use same as last time – one tap to pre-fill */}
        {lastStayForm && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <RotateCcw className="text-primary size-5" />
                  </div>
                  <div>
                    <p className="font-medium">{t("useSameAsLastTime")}</p>
                    <p className="text-muted-foreground text-sm">
                      {t("copyFromLastStay")}
                    </p>
                  </div>
                </div>
                <Button onClick={applyLastStayPreferences} variant="default">
                  {t("apply")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">{t("pet")}</p>
                <p className="font-medium">{pet.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("service")}</p>
                <p className="font-medium">
                  {serviceTypeLabel(locale, booking.service)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("date")}</p>
                <p className="font-medium">
                  {formatDateLong(localDay(booking.startDate), locale)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("checkInTime")}</p>
                <p className="font-medium">
                  {booking.checkInTime
                    ? formatTimeOfDay(booking.checkInTime, locale)
                    : t("toBeDecided")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Stepper */}
        <div className="bg-card rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {fill("stepOf", { n: currentSection + 1, total: totalSections })}
            </p>
            <p className="text-primary text-xs font-medium">
              {sections[currentSection]?.label}
            </p>
          </div>
          {/* Bar */}
          <div className="flex items-center gap-1.5">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div
                  className={`h-2 w-full rounded-full transition-all ${
                    index < currentSection
                      ? "bg-primary"
                      : index === currentSection
                        ? "bg-primary/60"
                        : "bg-muted"
                  }`}
                />
                <span
                  className={`hidden text-[9px] font-medium sm:block ${
                    index <= currentSection
                      ? "text-primary"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {section.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Section */}
        {CurrentSectionComponent && (
          <CurrentSectionComponent
            formData={formData}
            updateFormData={updateFormData}
            booking={booking}
            pet={pet}
            customer={customer}
            config={yipyyGoConfig}
            onNext={() => {
              if (currentSection < sections.length - 1) {
                setCurrentSection(currentSection + 1);
              }
            }}
            onBack={() => {
              if (currentSection > 0) {
                setCurrentSection(currentSection - 1);
              }
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isLastSection={currentSection === sections.length - 1}
          />
        )}

        {/* Navigation */}
        {currentSection < sections.length - 1 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
              disabled={currentSection === 0}
            >
              {t("back")}
            </Button>
            <Button
              onClick={() =>
                setCurrentSection(
                  Math.min(sections.length - 1, currentSection + 1),
                )
              }
            >
              {fill("nextSection", {
                section: sections[currentSection + 1]?.label ?? "",
              })}
            </Button>
          </div>
        )}
      </div>
      {yipyyGoConfig?.tipPopup?.enabled && (
        <TipPromptDialog
          open={showTipDialog}
          onOpenChange={(open) => {
            if (!isSubmitting) setShowTipDialog(open);
          }}
          config={yipyyGoConfig.tipPopup}
          stayTotal={booking.totalCost ?? 0}
          onConfirm={(tip) => void finalizeSubmission(tip)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
