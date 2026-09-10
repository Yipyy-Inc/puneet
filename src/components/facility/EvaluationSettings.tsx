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
import { useSettings } from "@/hooks/use-settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { formatMoney } from "@/lib/i18n/format";

// Keys, not labels: a module constant is frozen at whichever locale
// evaluated the module first.
const SERVICES = [
  { id: "daycare", labelKey: "svcDaycare" },
  { id: "boarding", labelKey: "svcBoarding" },
  { id: "grooming", labelKey: "svcGrooming" },
  { id: "training", labelKey: "svcTraining" },
];

export function EvaluationSettings() {
  const { locale, section } = useSettingsText();
  const t = section("evaluations");

  // Intl picks the plural form, not `n === 1`: French counts 0 as singular.
  const rules = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  const plural = (n: number, one: string, other: string) =>
    t(rules.select(n) === "one" ? one : other).replace("{n}", String(n));
  const { role } = useFacilityRole();
  // ── THIS SCREEN USED TO MUTATE ITS IMPORTS ──────────────────────────────
  //
  // `handleSave` did `Object.assign(evaluationConfig, {...})` on the module
  // object imported from `src/data/settings.ts`. Not a store, not localStorage
  // — it edited the shared singleton in place. So a facility's evaluation
  // price and its "which services need an evaluation" rules changed for
  // everything else rendered in that browser session, and vanished on reload.
  // Nothing was ever persisted, and the toast said "saved".
  const {
    evaluation: evaluationConfig,
    bookingFlow: facilityBookingFlowConfig,
    evaluationReportCard: evaluationReportCardConfig,
    updateEvaluation,
    updateBookingFlow,
    updateEvaluationReportCard,
  } = useSettings();

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

  const handleSave = async () => {
    // Three domains, three rows, saved together because this one button owns
    // all three. Awaited and sequential so a refusal on the first stops the
    // rest — a partial save here would leave the evaluation priced one way and
    // gated another.
    try {
      await updateEvaluation({
        ...evaluationConfig,
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
      await updateBookingFlow({
        ...facilityBookingFlowConfig,
        evaluationRequired: evalRequired,
        hideServicesUntilEvaluationCompleted: hideServices,
        servicesRequiringEvaluation: servicesRequiring,
        evaluationLockedMessage: lockedMessage,
      });
      await updateEvaluationReportCard({
        ...evaluationReportCardConfig,
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
      toast.success(t("savedToast"));
    } catch (error) {
      // Previously unreachable: assigning to an object cannot fail. Now that
      // these are three writes RLS can refuse, silence would leave the toast
      // claiming a save that did not happen.
      toast.error(error instanceof Error ? error.message : t("saveFailed"));
    }
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">{t("restricted")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-slate-800">
            <ClipboardCheck className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              {t("title")}
            </h2>
            <p className="text-sm text-slate-500">{t("intro")}</p>
          </div>
        </div>
      </div>

      {/* ── Master Toggle ── */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100">
              <ClipboardCheck className="size-5 text-slate-700" />
            </div>
            <div>
              <p className="font-semibold">{t("enableRequirement")}</p>
              <p className="text-muted-foreground text-sm">
                {t("enableRequirementHelp")}
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
                {t("servicesRequiring")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-xs">
                {t("servicesRequiringHelp")}
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
                        <span className="text-sm font-medium">
                          {t(svc.labelKey)}
                        </span>
                        {isRequired && (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                          >
                            {t("evaluationRequired")}
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
                  <p className="text-sm font-medium">{t("blockBooking")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("blockBookingHelp")}
                  </p>
                </div>
                <Switch
                  checked={hideServices}
                  onCheckedChange={setHideServices}
                />
              </div>

              <div>
                <Label className="text-xs">{t("customMessage")}</Label>
                <Textarea
                  value={lockedMessage}
                  onChange={(e) => setLockedMessage(e.target.value)}
                  placeholder={t("customMessagePlaceholder")}
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
                {t("serviceDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">{t("internalName")}</Label>
                  <Input
                    value={internalName}
                    onChange={(e) => setInternalName(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("customerName")}</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("descriptionShown")}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-[10px]"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="size-3" />
                    {t("preview")}
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
                  <p className="text-sm font-medium">{t("serviceStatus")}</p>
                  <p className="text-muted-foreground text-xs">
                    {serviceActive
                      ? t("statusActiveLong")
                      : t("statusInactiveLong")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={serviceActive ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {t(serviceActive ? "statusActive" : "statusInactive")}
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
                    {t("freeHint")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">{t("tax")}</Label>
                  <div className="mt-1 flex h-9 items-center gap-2">
                    <Switch checked={taxable} onCheckedChange={setTaxable} />
                    <span className="text-muted-foreground text-xs">
                      {t(taxable ? "taxable" : "taxExempt")}
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
                  <Label className="text-xs">{t("calendarColour")}</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      className="size-9 cursor-pointer rounded-sm border-0"
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
                {t("validityAndExpiration")}
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
                    <p className="text-sm font-medium">{t("alwaysValid")}</p>
                    <p className="text-muted-foreground text-xs">
                      {t("alwaysValidHelp")}
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
                      {t("expireAfterInactivity")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("expireHelp")}
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
                        {t("months")}
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
                {t("staffAssignment")}
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
                  <SelectItem value="manual">{t("manualAssign")}</SelectItem>
                  <SelectItem value="auto">{t("autoAssign")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {staffAssignment === "manual"
                  ? t("manualAssignHelp")
                  : t("autoAssignHelp")}
              </p>
            </CardContent>
          </Card>

          {/* ── Eligible Lodging Types ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4" />
                {t("eligibleLodging")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-xs">
                {t("eligibleLodgingHelp")}
              </p>
              <div className="space-y-2">
                {[
                  { id: "standard", label: t("lodgingStandardKennel") },
                  { id: "premium", label: t("lodgingPremiumSuite") },
                  { id: "deluxe", label: t("lodgingDeluxeSuite") },
                  { id: "luxury", label: t("lodgingLuxuryVilla") },
                  { id: "shared", label: t("lodgingSharedPlayRoom") },
                ].map((lodging) => (
                  <div
                    key={lodging.id}
                    className="bg-background flex items-center gap-3 rounded-lg border px-4 py-2.5"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="accent-primary size-4 rounded-sm"
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
                {t("onlineAvailability")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">{t("minimumLeadTime")}</Label>
                  <Select
                    value={String(minLeadTime)}
                    onValueChange={(v) => setMinLeadTime(parseInt(v, 10))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t("noMinimum")}</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("maximumAdvance")}</Label>
                  <Select
                    value={String(maxAdvanceDays)}
                    onValueChange={(v) => setMaxAdvanceDays(parseInt(v, 10))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[7, 14, 30, 60, 90].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {t("daysCount").replace("{n}", String(d))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Daily pet capacity */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("dailyLimits")}</p>
                    <p className="text-muted-foreground text-xs">
                      {t("dailyLimitsHelp")}
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
                        { key: "mon", label: t("dayMon") },
                        { key: "tue", label: t("dayTue") },
                        { key: "wed", label: t("dayWed") },
                        { key: "thu", label: t("dayThu") },
                        { key: "fri", label: t("dayFri") },
                        { key: "sat", label: t("daySat") },
                        { key: "sun", label: t("daySun") },
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
                  <p className="text-sm font-medium">{t("checkoutAlert")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("checkoutAlertHelp")}
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
                  {t("resultReportCard")}
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
                  {t("resultReportCardHelp")}
                </p>

                <div>
                  <Label className="text-xs">{t("passMessage")}</Label>
                  <Textarea
                    value={passMessage}
                    onChange={(e) => setPassMessage(e.target.value)}
                    className="mt-1 min-h-[50px] text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("failMessage")}</Label>
                  <Textarea
                    value={failMessage}
                    onChange={(e) => setFailMessage(e.target.value)}
                    className="mt-1 min-h-[50px] text-sm"
                    rows={2}
                  />
                </div>

                <Separator />

                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {t("includeInReportCard")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      key: "evaluator",
                      label: t("includeEvaluatorName"),
                      value: showEvaluator,
                      set: setShowEvaluator,
                    },
                    {
                      key: "temperament",
                      label: t("includeTemperament"),
                      value: showTemperament,
                      set: setShowTemperament,
                    },
                    {
                      key: "playStyle",
                      label: t("includePlayStyle"),
                      value: showPlayStyle,
                      set: setShowPlayStyle,
                    },
                    {
                      key: "services",
                      label: t("includeApprovedServices"),
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
                  {t("sendVia")}
                </p>
                <div className="flex gap-3">
                  <div className="flex flex-1 items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">{t("channelEmail")}</span>
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
                {t("advancedResults")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("conditionalPass")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("conditionalPassHelp")}
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
                    {t("autoSuggestReeval")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("autoSuggestReevalHelp")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {t("suggestAfter")}
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
                  <span className="text-muted-foreground text-xs">
                    {t("days")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Evaluation Analytics ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="size-4" />
                {t("analytics")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="bg-background rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-muted-foreground text-xs">
                    {t("thisMonth")}
                  </p>
                </div>
                <div className="bg-background rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">83%</p>
                  <p className="text-muted-foreground text-xs">
                    {t("passRate")}
                  </p>
                </div>
                <div className="bg-background rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">4</p>
                  <p className="text-muted-foreground text-xs">
                    {t("failedThisMonth")}
                  </p>
                </div>
                <div className="bg-background rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">1.2h</p>
                  <p className="text-muted-foreground text-xs">
                    {t("avgDuration")}
                  </p>
                </div>
              </div>
              <div className="bg-muted/20 mt-3 rounded-lg border p-3">
                <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                  {t("topFailReasons")}
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
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} className="gap-1.5 px-6">
          {t("save")}
        </Button>
      </div>

      {/* Customer Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5" />
              {t("customerPreview")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-xs">{t("previewIntro")}</p>
            <div className="bg-muted/10 rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: colorCode }}
                />
                <h3 className="text-lg font-semibold">{customerName}</h3>
              </div>
              <p className="text-muted-foreground mt-2 text-sm/relaxed">
                {description}
              </p>
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("duration")}</span>
                <span className="font-medium">
                  {plural(duration ?? 0, "hourCountOne", "hourCountOther")}
                </span>
              </div>
              {price > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("price")}</span>
                  <span className="font-[tabular-nums] font-semibold">
                    {formatMoney(price, locale)}
                  </span>
                </div>
              )}
              {price === 0 && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("price")}</span>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                  >
                    {t("free")}
                  </Badge>
                </div>
              )}
            </div>
            {lockedMessage && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-xs font-medium text-blue-800">
                  {t("lockedMessagePreview")}
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
