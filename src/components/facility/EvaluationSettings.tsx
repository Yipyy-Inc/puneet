"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
  ClipboardCheck,
  Clock,
  Users,
  Calendar,
  Shield,
  Send,
  FileText,
  Lock,
  Unlock,
  Eye,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useFacilityRole } from "@/hooks/use-facility-role";
import {
  evaluationConfig,
  facilityBookingFlowConfig,
  evaluationReportCardConfig,
} from "@/data/settings";

const SERVICES = [
  { id: "daycare", label: "Daycare" },
  { id: "boarding", label: "Boarding" },
  { id: "grooming", label: "Grooming" },
  { id: "training", label: "Training" },
];

export function EvaluationSettings() {
  const { role } = useFacilityRole();

  // Evaluation service config
  const [internalName, setInternalName] = useState(
    evaluationConfig.internalName,
  );
  const [customerName, setCustomerName] = useState(
    evaluationConfig.customerName,
  );
  const [description, setDescription] = useState(evaluationConfig.description);
  const [serviceActive, setServiceActive] = useState(true);
  const [price, setPrice] = useState(evaluationConfig.price);
  const [taxable, setTaxable] = useState(
    evaluationConfig.taxSettings?.taxable ?? false,
  );
  const [duration, setDuration] = useState(evaluationConfig.customHours);
  const [colorCode, setColorCode] = useState(evaluationConfig.colorCode);
  const [validityMode, setValidityMode] = useState(
    evaluationConfig.validityMode,
  );
  const [expirationDays, setExpirationDays] = useState(
    evaluationConfig.expirationDays,
  );
  const [staffAssignment, setStaffAssignment] = useState(
    evaluationConfig.staffAssignment,
  );
  const [minLeadTime, setMinLeadTime] = useState(
    evaluationConfig.minLeadTimeHours,
  );
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(
    evaluationConfig.maxAdvanceDays,
  );
  const [dailyLimitsEnabled, setDailyLimitsEnabled] = useState(
    evaluationConfig.dailyPetLimits?.enabled ?? false,
  );
  const [dailyLimits, setDailyLimits] = useState<Record<string, number>>(
    evaluationConfig.dailyPetLimits?.perDay ?? {
      mon: 4,
      tue: 4,
      wed: 4,
      thu: 4,
      fri: 3,
      sat: 2,
      sun: 0,
    },
  );
  const [checkoutAlert, setCheckoutAlert] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [conditionalPassEnabled, setConditionalPassEnabled] = useState(true);
  const [autoReEvalDays, setAutoReEvalDays] = useState(14);

  // Booking flow config
  const [evalRequired, setEvalRequired] = useState(
    facilityBookingFlowConfig.evaluationRequired,
  );
  const [hideServices, setHideServices] = useState(
    facilityBookingFlowConfig.hideServicesUntilEvaluationCompleted,
  );
  const [servicesRequiring, setServicesRequiring] = useState<string[]>(
    facilityBookingFlowConfig.servicesRequiringEvaluation,
  );
  const [lockedMessage, setLockedMessage] = useState(
    facilityBookingFlowConfig.evaluationLockedMessage ?? "",
  );

  // Report card config
  const [reportEnabled, setReportEnabled] = useState(
    evaluationReportCardConfig.enabled,
  );
  const [passMessage, setPassMessage] = useState(
    evaluationReportCardConfig.passMessage,
  );
  const [failMessage, setFailMessage] = useState(
    evaluationReportCardConfig.failMessage,
  );
  const [showEvaluator, setShowEvaluator] = useState(
    evaluationReportCardConfig.showEvaluatorName,
  );
  const [showTemperament, setShowTemperament] = useState(
    evaluationReportCardConfig.showTemperament,
  );
  const [showPlayStyle, setShowPlayStyle] = useState(
    evaluationReportCardConfig.showPlayStyle,
  );
  const [showApprovedServices, setShowApprovedServices] = useState(
    evaluationReportCardConfig.showApprovedServices,
  );
  const [notifyEmail, setNotifyEmail] = useState(
    evaluationReportCardConfig.notifyViaEmail,
  );
  const [notifySMS, setNotifySMS] = useState(
    evaluationReportCardConfig.notifyViaSMS,
  );

  const toggleService = (id: string) => {
    setServicesRequiring((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    // Update in-memory configs
    Object.assign(evaluationConfig, {
      internalName,
      customerName,
      description,
      price,
      customHours: duration,
      colorCode,
      validityMode,
      expirationDays,
      staffAssignment,
      minLeadTimeHours: minLeadTime,
      maxAdvanceDays,
    });
    Object.assign(facilityBookingFlowConfig, {
      evaluationRequired: evalRequired,
      hideServicesUntilEvaluationCompleted: hideServices,
      servicesRequiringEvaluation: servicesRequiring,
      evaluationLockedMessage: lockedMessage,
    });
    Object.assign(evaluationReportCardConfig, {
      enabled: reportEnabled,
      passMessage,
      failMessage,
      showEvaluatorName: showEvaluator,
      showTemperament,
      showPlayStyle,
      showApprovedServices,
      notifyViaEmail: notifyEmail,
      notifyViaSMS: notifySMS,
    });
    toast.success("Evaluation settings saved");
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Evaluation settings are only accessible to facility owners and
            managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Evaluation System</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure pet evaluations — require assessments before pets can access
          specific services. Customize scheduling, pricing, staff assignment,
          and the result report card sent to customers.
        </p>
      </div>

      {/* ── Master Toggle ── */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
              <ClipboardCheck className="text-primary size-5" />
            </div>
            <div>
              <p className="font-semibold">Enable Evaluation Requirement</p>
              <p className="text-muted-foreground text-sm">
                Require pets to pass an evaluation before booking certain
                services
              </p>
            </div>
          </div>
          <Switch checked={evalRequired} onCheckedChange={setEvalRequired} />
        </CardContent>
      </Card>

      {evalRequired && (
        <>
          {/* ── Service Configuration ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lock className="size-4" />
                Services Requiring Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-xs">
                Select which services require a pet evaluation before booking.
                Unselected services can be booked without evaluation.
              </p>
              <div className="space-y-2">
                {SERVICES.map((svc) => {
                  const isRequired = servicesRequiring.includes(svc.id);
                  return (
                    <div
                      key={svc.id}
                      className="bg-background flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        {isRequired ? (
                          <Lock className="size-4 text-amber-600" />
                        ) : (
                          <Unlock className="text-muted-foreground/40 size-4" />
                        )}
                        <span className="text-sm font-medium">{svc.label}</span>
                        {isRequired && (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                          >
                            Evaluation required
                          </Badge>
                        )}
                      </div>
                      <Switch
                        checked={isRequired}
                        onCheckedChange={() => toggleService(svc.id)}
                      />
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Block booking without evaluation
                  </p>
                  <p className="text-muted-foreground text-xs">
                    When on, customers must complete evaluation before booking.
                    When off, they can book but staff gets a reminder.
                  </p>
                </div>
                <Switch
                  checked={hideServices}
                  onCheckedChange={setHideServices}
                />
              </div>

              <div>
                <Label className="text-xs">
                  Custom message shown to customers
                </Label>
                <Textarea
                  value={lockedMessage}
                  onChange={(e) => setLockedMessage(e.target.value)}
                  placeholder="This service requires a pet evaluation first..."
                  className="mt-1 min-h-[60px] text-sm"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Evaluation Service Details ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4" />
                Evaluation Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Internal Name (staff sees)</Label>
                  <Input
                    value={internalName}
                    onChange={(e) => setInternalName(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Customer Name (online booking)
                  </Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    Description (shown to customers)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-[10px]"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="size-3" />
                    Preview
                  </Button>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 min-h-[60px] text-sm"
                  rows={2}
                />
              </div>

              {/* Status toggle */}
              <div className="bg-background flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Service Status</p>
                  <p className="text-muted-foreground text-xs">
                    {serviceActive
                      ? "Active — available for booking"
                      : "Inactive — hidden from booking"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={serviceActive ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {serviceActive ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={serviceActive}
                    onCheckedChange={setServiceActive}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">Price ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="mt-1 h-9 text-sm"
                  />
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    Set to 0 for free evaluations
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Tax</Label>
                  <div className="mt-1 flex h-9 items-center gap-2">
                    <Switch checked={taxable} onCheckedChange={setTaxable} />
                    <span className="text-muted-foreground text-xs">
                      {taxable ? "Taxable" : "Tax exempt"}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Duration (hours)</Label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={duration}
                    onChange={(e) =>
                      setDuration(parseFloat(e.target.value) || 1)
                    }
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Calendar Color</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      className="size-9 cursor-pointer rounded border-0"
                    />
                    <span className="font-mono text-xs">{colorCode}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Validity & Expiration ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="size-4" />
                Validity & Expiration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${validityMode === "always_valid" ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:border-muted-foreground/30"}`}
                  onClick={() => setValidityMode("always_valid")}
                >
                  <input
                    type="radio"
                    checked={validityMode === "always_valid"}
                    onChange={() => setValidityMode("always_valid")}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Always valid</p>
                    <p className="text-muted-foreground text-xs">
                      Once a pet passes evaluation, it never expires
                    </p>
                  </div>
                </div>
                <div
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${validityMode === "expires_after_inactivity" ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:border-muted-foreground/30"}`}
                  onClick={() => setValidityMode("expires_after_inactivity")}
                >
                  <input
                    type="radio"
                    checked={validityMode === "expires_after_inactivity"}
                    onChange={() => setValidityMode("expires_after_inactivity")}
                    className="accent-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Expire after inactivity
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Clear the &quot;Pass&quot; if the pet hasn&apos;t had
                      services for a specified period
                    </p>
                  </div>
                  {validityMode === "expires_after_inactivity" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={Math.round((expirationDays ?? 90) / 30)}
                        onChange={(e) =>
                          setExpirationDays(
                            (parseInt(e.target.value, 10) || 3) * 30,
                          )
                        }
                        className="h-8 w-16 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">
                        months
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Staff Assignment ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4" />
                Staff Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={staffAssignment}
                onValueChange={(v) =>
                  setStaffAssignment(v as "manual" | "auto")
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    Manually assign evaluator
                  </SelectItem>
                  <SelectItem value="auto">
                    Auto-assign available staff
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {staffAssignment === "manual"
                  ? "Staff with evaluation skills will be selectable when booking. Configure who can evaluate in Staff settings."
                  : "System automatically assigns the first available qualified staff member."}
              </p>
            </CardContent>
          </Card>

          {/* ── Eligible Lodging Types ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4" />
                Eligible Lodging Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Select which lodging/room types are eligible to include
                evaluation services. Leave all checked for no restrictions.
              </p>
              <div className="space-y-2">
                {[
                  { id: "standard", label: "Standard Kennel" },
                  { id: "premium", label: "Premium Suite" },
                  { id: "deluxe", label: "Deluxe Suite" },
                  { id: "luxury", label: "Luxury Villa" },
                  { id: "shared", label: "Shared Play Room" },
                ].map((lodging) => (
                  <div
                    key={lodging.id}
                    className="bg-background flex items-center gap-3 rounded-lg border px-4 py-2.5"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="accent-primary size-4 rounded"
                    />
                    <span className="text-sm">{lodging.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Scheduling ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="size-4" />
                Online Booking Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Minimum lead time</Label>
                  <Select
                    value={String(minLeadTime)}
                    onValueChange={(v) => setMinLeadTime(parseInt(v, 10))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No minimum</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Maximum advance booking</Label>
                  <Select
                    value={String(maxAdvanceDays)}
                    onValueChange={(v) => setMaxAdvanceDays(parseInt(v, 10))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Daily pet capacity */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Daily pet limits</p>
                    <p className="text-muted-foreground text-xs">
                      Maximum evaluations per day. Set per weekday.
                    </p>
                  </div>
                  <Switch
                    checked={dailyLimitsEnabled}
                    onCheckedChange={setDailyLimitsEnabled}
                  />
                </div>
                {dailyLimitsEnabled && (
                  <div className="grid grid-cols-7 gap-2">
                    {(
                      [
                        { key: "mon", label: "Mon" },
                        { key: "tue", label: "Tue" },
                        { key: "wed", label: "Wed" },
                        { key: "thu", label: "Thu" },
                        { key: "fri", label: "Fri" },
                        { key: "sat", label: "Sat" },
                        { key: "sun", label: "Sun" },
                      ] as const
                    ).map((day) => (
                      <div key={day.key} className="text-center">
                        <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                          {day.label}
                        </p>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={dailyLimits[day.key] ?? 0}
                          onChange={(e) =>
                            setDailyLimits((prev) => ({
                              ...prev,
                              [day.key]: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="h-8 text-center text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Checkout alert */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Checkout alert for unrecorded results
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Alert staff at checkout if evaluation results haven&apos;t
                    been recorded
                  </p>
                </div>
                <Switch
                  checked={checkoutAlert}
                  onCheckedChange={setCheckoutAlert}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Report Card ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Send className="size-4" />
                  Result Report Card
                </CardTitle>
                <Switch
                  checked={reportEnabled}
                  onCheckedChange={setReportEnabled}
                />
              </div>
            </CardHeader>
            {reportEnabled && (
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-xs">
                  After evaluation, a report card is sent to the customer with
                  results and approved services. Customize what&apos;s included.
                </p>

                <div>
                  <Label className="text-xs">Pass message</Label>
                  <Textarea
                    value={passMessage}
                    onChange={(e) => setPassMessage(e.target.value)}
                    className="mt-1 min-h-[50px] text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fail message</Label>
                  <Textarea
                    value={failMessage}
                    onChange={(e) => setFailMessage(e.target.value)}
                    className="mt-1 min-h-[50px] text-sm"
                    rows={2}
                  />
                </div>

                <Separator />

                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Include in report card
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      key: "evaluator",
                      label: "Evaluator name",
                      value: showEvaluator,
                      set: setShowEvaluator,
                    },
                    {
                      key: "temperament",
                      label: "Temperament ratings",
                      value: showTemperament,
                      set: setShowTemperament,
                    },
                    {
                      key: "playStyle",
                      label: "Play style & group",
                      value: showPlayStyle,
                      set: setShowPlayStyle,
                    },
                    {
                      key: "services",
                      label: "Approved services list",
                      value: showApprovedServices,
                      set: setShowApprovedServices,
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span className="text-sm">{item.label}</span>
                      <Switch checked={item.value} onCheckedChange={item.set} />
                    </div>
                  ))}
                </div>

                <Separator />

                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Send via
                </p>
                <div className="flex gap-3">
                  <div className="flex flex-1 items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">Email</span>
                    <Switch
                      checked={notifyEmail}
                      onCheckedChange={setNotifyEmail}
                    />
                  </div>
                  <div className="flex flex-1 items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">SMS</span>
                    <Switch
                      checked={notifySMS}
                      onCheckedChange={setNotifySMS}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {evalRequired && (
        <>
          {/* ── Conditional Pass & Re-evaluation ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="size-4" />
                Advanced Result Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Allow conditional pass</p>
                  <p className="text-muted-foreground text-xs">
                    Staff can pass with conditions (e.g., &quot;approved for
                    small dog group only&quot;)
                  </p>
                </div>
                <Switch
                  checked={conditionalPassEnabled}
                  onCheckedChange={setConditionalPassEnabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Auto-suggest re-evaluation on fail
                  </p>
                  <p className="text-muted-foreground text-xs">
                    When a pet fails, prompt to schedule a re-evaluation
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    Suggest after
                  </span>
                  <Input
                    type="number"
                    min={7}
                    max={90}
                    value={autoReEvalDays}
                    onChange={(e) =>
                      setAutoReEvalDays(parseInt(e.target.value, 10) || 14)
                    }
                    className="h-8 w-16 text-sm"
                  />
                  <span className="text-muted-foreground text-xs">days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Evaluation Analytics ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="size-4" />
                Evaluation Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="bg-background rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-muted-foreground text-xs">This month</p>
                </div>
                <div className="bg-background rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">83%</p>
                  <p className="text-muted-foreground text-xs">Pass rate</p>
                </div>
                <div className="bg-background rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">4</p>
                  <p className="text-muted-foreground text-xs">
                    Failed this month
                  </p>
                </div>
                <div className="bg-background rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">1.2h</p>
                  <p className="text-muted-foreground text-xs">Avg duration</p>
                </div>
              </div>
              <div className="bg-muted/20 mt-3 rounded-lg border p-3">
                <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                  Top fail reasons
                </p>
                <div className="space-y-1.5">
                  {[
                    {
                      reason: "Dog-reactive behavior",
                      count: 2,
                      pct: 50,
                    },
                    {
                      reason: "Excessive anxiety",
                      count: 1,
                      pct: 25,
                    },
                    {
                      reason: "Resource guarding",
                      count: 1,
                      pct: 25,
                    },
                  ].map((item) => (
                    <div
                      key={item.reason}
                      className="flex items-center justify-between text-xs"
                    >
                      <span>{item.reason}</span>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full bg-red-400"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-6 text-right font-mono text-[10px]">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Evaluation Settings
        </Button>
      </div>

      {/* Customer Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5" />
              Customer Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-xs">
              This is how the evaluation appears to customers in online booking:
            </p>
            <div className="bg-muted/10 rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: colorCode }}
                />
                <h3 className="text-lg font-semibold">{customerName}</h3>
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {description}
              </p>
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">
                  {duration} hour{duration !== 1 ? "s" : ""}
                </span>
              </div>
              {price > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-[tabular-nums] font-semibold">
                    ${price.toFixed(2)}
                  </span>
                </div>
              )}
              {price === 0 && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                  >
                    Free
                  </Badge>
                </div>
              )}
            </div>
            {lockedMessage && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-xs font-medium text-blue-800">
                  Message shown when services are locked:
                </p>
                <p className="mt-1 text-sm text-blue-700 italic">
                  &quot;{lockedMessage}&quot;
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
