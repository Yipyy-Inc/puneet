"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import {
  getYipyyGoForm,
  saveYipyyGoForm,
  generateVerificationCode,
  verifyCode,
  checkFormDeadline,
  type YipyyGoFormData,
} from "@/data/yipyygo-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { BelongingsSection } from "@/components/yipyygo/form-sections/BelongingsSection";
import { FeedingSection } from "@/components/yipyygo/form-sections/FeedingSection";
import { MedicationSection } from "@/components/yipyygo/form-sections/MedicationSection";
import { BehaviorSection } from "@/components/yipyygo/form-sections/BehaviorSection";
import { AddOnsSection } from "@/components/yipyygo/form-sections/AddOnsSection";
import { TipSection } from "@/components/yipyygo/form-sections/TipSection";
import { ReviewSection } from "@/components/yipyygo/form-sections/ReviewSection";
import { Separator } from "@/components/ui/separator";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

type AuthState = "checking" | "authenticated" | "login" | "verification";

export default function YipyyGoFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  // Get booking and customer data
  const booking = useMemo(() => {
    return bookings.find((b) => String(b.id) === id);
  }, [id]);

  const customer = useMemo(() => {
    if (!booking) return null;
    return clients.find((c) => c.id === booking.clientId);
  }, [booking]);

  const pet = useMemo(() => {
    if (!customer || !booking) return null;
    const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
    return customer.pets?.find((p) => p.id === petId);
  }, [customer, booking]);

  // Get YipyyGo config
  const yipyyGoConfig = useMemo(() => {
    if (!booking) return null;
    return getYipyyGoConfig(booking.facilityId);
  }, [booking]);

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
  }, [booking, yipyyGoConfig]);

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
        deadline.setHours(deadline.getHours() - (yipyyGoConfig?.timing.deadline || 12));

        const newForm: YipyyGoFormData = {
          bookingId: booking.id,
          clientId: booking.clientId,
          petId: Array.isArray(booking.petId) ? booking.petId[0] : booking.petId,
          petName: pet.name,
          facilityId: booking.facilityId,
          belongings: [],
          medications: [],
          noMedications: false,
          addOns: [],
          // In development mode, always allow editing
          isLocked: DEV_MODE ? false : (deadlineInfo?.isPastDeadline || false),
          deadline: deadline.toISOString(),
          canEdit: DEV_MODE ? true : (deadlineInfo?.canEdit || false),
        };
        setFormData(newForm);
      }
    } else {
      setAuthState("login");
    }
  }, [booking, pet, customer, yipyyGoConfig, deadlineInfo]);

  // Handle verification code request
  const handleRequestCode = async () => {
    if (!booking || !customer) return;
    
    const code = generateVerificationCode(booking.id, customer.email, customer.phone);
    setCodeSent(true);
    toast.success("Verification code sent to your email/SMS");
  };

  // Handle verification code submission
  const handleVerifyCode = () => {
    if (!booking || !verificationCode) return;
    
    const result = verifyCode(verificationCode, booking.id);
    if (result.valid) {
      setAuthState("authenticated");
      toast.success("Verified successfully!");
      
      // Initialize form data
      const existingForm = getYipyyGoForm(booking.id);
      if (existingForm) {
        setFormData(existingForm);
      } else {
        // Create new form (same as above)
        // ... (same initialization logic)
      }
    } else {
      toast.error(result.error || "Invalid code");
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData) return;
    
    setIsSubmitting(true);
    try {
      const saved = saveYipyyGoForm({
        ...formData,
        submittedAt: new Date().toISOString(),
        submittedBy: MOCK_CUSTOMER_ID,
      });
      
      toast.success("YipyyGo form submitted successfully! You're check-in ready!");
      router.push(`/customer/bookings/${booking?.id}`);
    } catch (error) {
      toast.error("Failed to submit form. Please try again.");
      console.error("Error submitting YipyyGo form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update form data
  const updateFormData = (updates: Partial<YipyyGoFormData>) => {
    if (!formData) return;
    setFormData({ ...formData, ...updates });
  };

  if (!booking || !customer || !pet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Booking not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/customer/bookings")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  // Authentication screens
  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (authState === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access YipyyGo Form</CardTitle>
            <CardDescription>
              Please log in or verify with a code to access the pre-check-in form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={() => router.push(`/customer/auth/login?redirect=/customer/bookings/${id}/yipyygo-form`)}
            >
              Log In to Portal
            </Button>
            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-2 text-sm text-muted-foreground">OR</span>
              </div>
            </div>
            {!codeSent ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRequestCode}
              >
                Send Verification Code
              </Button>
            ) : (
              <div className="space-y-2">
                <Label>Enter Verification Code</Label>
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
                  Verify Code
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setCodeSent(false);
                    setVerificationCode("");
                  }}
                >
                  Request New Code
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify Access</CardTitle>
            <CardDescription>
              Enter the verification code sent to your email/SMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
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
              Verify
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form locked after deadline (skip in development mode)
  if (!DEV_MODE && formData?.isLocked && !formData.submittedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Form Locked
            </CardTitle>
            <CardDescription>
              The deadline for submitting this form has passed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please contact the facility directly to provide this information.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => router.push(`/customer/bookings/${booking.id}`)}
            >
              Back to Booking
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form
  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const sections = [
    { id: "belongings", label: "Belongings", component: BelongingsSection },
    { id: "feeding", label: "Feeding Instructions", component: FeedingSection },
    { id: "medication", label: "Medications", component: MedicationSection },
    { id: "behavior", label: "Behavior & Special Notes", component: BehaviorSection },
    ...(yipyyGoConfig?.formTemplate.features.addOnsSection
      ? [{ id: "addons", label: "Add-ons", component: AddOnsSection }]
      : []),
    ...(yipyyGoConfig?.formTemplate.features.tipSection
      ? [{ id: "tip", label: "Tip", component: TipSection }]
      : []),
    { id: "review", label: "Review & Submit", component: ReviewSection },
  ];

  const CurrentSectionComponent = sections[currentSection]?.component;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/customer/bookings/${booking.id}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Booking
            </Button>
            <h1 className="text-3xl font-bold mt-2">YipyyGo Pre-Check-In Form</h1>
            <p className="text-muted-foreground mt-1">
              Complete this form to fast-track your check-in for {pet.name}'s {booking.service}
            </p>
          </div>
          {deadlineInfo && !deadlineInfo.isPastDeadline && (
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Time remaining: {deadlineInfo.timeRemaining}</span>
              </div>
            </div>
          )}
        </div>

        {/* Booking Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Pet</p>
                <p className="font-medium">{pet.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Service</p>
                <p className="font-medium capitalize">{booking.service}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(booking.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Check-in Time</p>
                <p className="font-medium">{booking.checkInTime || "TBD"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`flex-1 h-2 rounded ${
                index < currentSection
                  ? "bg-primary"
                  : index === currentSection
                    ? "bg-primary/50"
                    : "bg-muted"
              }`}
            />
          ))}
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
              Back
            </Button>
            <Button
              onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
            >
              Next: {sections[currentSection + 1]?.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
