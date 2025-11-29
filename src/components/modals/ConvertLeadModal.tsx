"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Lead, expectedTierLabels } from "@/data/crm/leads";
import { onboardingSteps } from "@/data/crm/onboarding";

interface ConvertLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onConvert?: (lead: Lead, options: ConversionOptions) => void;
}

interface ConversionOptions {
  sendWelcomeEmail: boolean;
  createFacilityAccount: boolean;
  startOnboarding: boolean;
  selectedPlan: string;
  billingCycle: "monthly" | "annually";
  assignedAccountManager: string;
  goLiveDate: string;
}

export function ConvertLeadModal({
  open,
  onOpenChange,
  lead,
  onConvert,
}: ConvertLeadModalProps) {
  const defaultGoLiveDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split("T")[0];
  }, []);

  const [step, setStep] = useState<"confirm" | "options" | "success">(
    "confirm",
  );
  const [isConverting, setIsConverting] = useState(false);
  const [options, setOptions] = useState<ConversionOptions>({
    sendWelcomeEmail: true,
    createFacilityAccount: true,
    startOnboarding: true,
    selectedPlan: lead?.expectedTier || "beginner",
    billingCycle: "annually",
    assignedAccountManager: "",
    goLiveDate: defaultGoLiveDate,
  });

  if (!lead) return null;

  const handleConvert = async () => {
    setIsConverting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConverting(false);
    setStep("success");
    onConvert?.(lead, options);
  };

  const handleClose = () => {
    setStep("confirm");
    onOpenChange(false);
  };

  const tierPricing: Record<string, { monthly: number; annual: number }> = {
    beginner: { monthly: 29, annual: 299 },
    pro: { monthly: 79, annual: 849 },
    enterprise: { monthly: 199, annual: 2149 },
    custom: { monthly: 149, annual: 1599 },
  };

  const selectedPrice =
    options.billingCycle === "monthly"
      ? tierPricing[options.selectedPlan]?.monthly || 0
      : tierPricing[options.selectedPlan]?.annual || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "success" ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Lead Converted Successfully
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-primary" />
                Convert Lead to Customer
              </>
            )}
          </DialogTitle>
          {step !== "success" && (
            <DialogDescription>
              Convert this lead to an active customer and start the onboarding
              process.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-6">
            {/* Lead Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{lead.facilityName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      {expectedTierLabels[lead.expectedTier]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ${lead.estimatedAnnualValue.toLocaleString()}/year
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.contactPerson}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{lead.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">
                    {lead.address || "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            {/* What will happen */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">What happens next:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Lead status will be updated to &quot;Closed Won&quot;
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />A new
                  facility account will be created
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Lead data will be transferred to the facility profile
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Onboarding checklist will be initiated
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("options")}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "options" && (
          <div className="space-y-6">
            {/* Subscription Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Subscription Details
              </h4>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan">Subscription Plan</Label>
                  <Select
                    value={options.selectedPlan}
                    onValueChange={(value) =>
                      setOptions((prev) => ({ ...prev, selectedPlan: value }))
                    }
                  >
                    <SelectTrigger id="plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">
                        Beginner - $29/mo
                      </SelectItem>
                      <SelectItem value="pro">Pro - $79/mo</SelectItem>
                      <SelectItem value="enterprise">
                        Enterprise - $199/mo
                      </SelectItem>
                      <SelectItem value="custom">Custom - $149/mo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing">Billing Cycle</Label>
                  <Select
                    value={options.billingCycle}
                    onValueChange={(value: "monthly" | "annually") =>
                      setOptions((prev) => ({ ...prev, billingCycle: value }))
                    }
                  >
                    <SelectTrigger id="billing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annually">
                        Annually (Save 15%)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goLive">Target Go-Live Date</Label>
                  <Input
                    id="goLive"
                    type="date"
                    value={options.goLiveDate}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        goLiveDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-green-800">
                      ${selectedPrice.toLocaleString()}
                      <span className="font-normal text-green-600">
                        /{options.billingCycle === "monthly" ? "mo" : "yr"}
                      </span>
                    </div>
                    <div className="text-xs text-green-600">
                      {options.billingCycle === "annually" && "Billed annually"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Conversion Options
              </h4>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="createAccount"
                    checked={options.createFacilityAccount}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({
                        ...prev,
                        createFacilityAccount: checked as boolean,
                      }))
                    }
                  />
                  <div>
                    <Label
                      htmlFor="createAccount"
                      className="font-normal cursor-pointer"
                    >
                      Create facility account automatically
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Set up the facility with pre-filled information from the
                      lead
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="sendEmail"
                    checked={options.sendWelcomeEmail}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({
                        ...prev,
                        sendWelcomeEmail: checked as boolean,
                      }))
                    }
                  />
                  <div>
                    <Label
                      htmlFor="sendEmail"
                      className="font-normal cursor-pointer"
                    >
                      Send welcome email
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically send onboarding instructions to the customer
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="startOnboarding"
                    checked={options.startOnboarding}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({
                        ...prev,
                        startOnboarding: checked as boolean,
                      }))
                    }
                  />
                  <div>
                    <Label
                      htmlFor="startOnboarding"
                      className="font-normal cursor-pointer"
                    >
                      Start onboarding checklist
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Create an onboarding checklist to track setup progress
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Onboarding Preview */}
            {options.startOnboarding && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  Onboarding Checklist Preview
                </h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {onboardingSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <span>{step.title}</span>
                      {step.required && (
                        <span className="text-red-500 text-xs">*</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("confirm")}>
                Back
              </Button>
              <Button onClick={handleConvert} disabled={isConverting}>
                {isConverting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Converting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Convert to Customer
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {lead.facilityName} is now a customer!
              </h3>
              <p className="text-muted-foreground">
                The lead has been successfully converted to an active customer.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Actions completed:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Lead status updated to &quot;Closed Won&quot;
                </li>
                {options.createFacilityAccount && (
                  <li className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Facility account created
                  </li>
                )}
                {options.sendWelcomeEmail && (
                  <li className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Welcome email sent to {lead.email}
                  </li>
                )}
                {options.startOnboarding && (
                  <li className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Onboarding checklist created
                  </li>
                )}
              </ul>
            </div>

            <div className="flex justify-center gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleClose}>View Facility</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
