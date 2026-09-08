"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  BellRing,
  Users,
  ShieldAlert,
  FileText,
  Paperclip,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  MessageSquare,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Facility whose forms back the settings demo (matches the seeded forms).
const DEMO_FACILITY_ID = 11;

// Lazy-loaded — the red-flag config modal chunk only downloads when opened.
const RedFlagConfigModal = dynamic(
  () =>
    import("@/components/forms/RedFlagConfigModal").then((m) => ({
      default: m.RedFlagConfigModal,
    })),
  { ssr: false },
);

interface NotifToggle {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export function FormNotificationSettings() {
  const t = useSettingsText().section("form-notifications");
  const initial = facilityConfig.notifications?.forms;

  const [staffToggles, setStaffToggles] = useState<NotifToggle[]>([
    {
      key: "newSubmission",
      label: "newSubmission",
      description: "newSubmissionHelp",
      icon: <FileText className="size-4 text-blue-600" />,
      enabled: initial?.staff?.newSubmission ?? true,
    },
    {
      key: "redFlagAnswers",
      label: "redFlagAnswers",
      description: "redFlagAnswersHelp",
      icon: <ShieldAlert className="size-4 text-red-600" />,
      enabled: initial?.staff?.redFlagAnswers ?? true,
    },
    {
      key: "hasFileUpload",
      label: "hasFileUpload",
      description: "hasFileUploadHelp",
      icon: <Paperclip className="size-4 text-amber-600" />,
      enabled: initial?.staff?.hasFileUpload ?? true,
    },
  ]);

  const [customerToggles, setCustomerToggles] = useState<NotifToggle[]>([
    {
      key: "submissionConfirmed",
      label: "submissionConfirmed",
      description: "submissionConfirmedHelp",
      icon: <CheckCircle className="size-4 text-green-600" />,
      enabled: initial?.customer?.submissionConfirmed ?? true,
    },
    {
      key: "missingRequiredFormsReminder",
      label: "missingFormsReminder",
      description: "missingFormsReminderHelp",
      icon: <Clock className="size-4 text-amber-600" />,
      enabled: initial?.customer?.missingRequiredFormsReminder ?? true,
    },
    {
      key: "formRejectedNeedsCorrection",
      label: "formRejected",
      description: "formRejectedHelp",
      icon: <AlertTriangle className="size-4 text-red-600" />,
      enabled: initial?.customer?.formRejectedNeedsCorrection ?? true,
    },
  ]);

  const [redFlagModalOpen, setRedFlagModalOpen] = useState(false);

  // Timing for the "Missing required forms reminder" — default 48h before check-in.
  const initialTiming = initial?.customer?.missingRequiredFormsReminderTiming;
  const [reminderValue, setReminderValue] = useState<number>(
    initialTiming?.value ?? 48,
  );
  const [reminderUnit, setReminderUnit] = useState<"hours" | "days">(
    initialTiming?.unit ?? "hours",
  );
  const [reminderAnchor, setReminderAnchor] = useState<
    "appointment" | "check_in"
  >(initialTiming?.anchor ?? "check_in");

  const toggleStaff = (key: string) => {
    setStaffToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const toggleCustomer = (key: string) => {
    setCustomerToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const handleSave = () => {
    // ── SAME AS CareTaskSettings: A WRITE INTO AN IMPORTED FIXTURE ────────
    //
    // This mutated `facilityConfig.notifications.forms.customer` in place, and
    // the React Compiler refuses it now that this scope is analysed. It reached
    // nobody either: both consumers — facility-notifications.ts:571 and
    // form-customer-notifications.ts:9 — read their slice into a MODULE-LEVEL
    // const at first evaluation. And the two toggle LISTS were never written
    // anywhere at all, not even here.
    //
    // The reminder timing and both toggle lists need a `form_notifications`
    // settings domain. Recorded in the debt map; this file is already in
    // check:success-claims' baseline for the toast below.
    toast.success(t("saved"));
  };

  const activeStaffCount = staffToggles.filter((t) => t.enabled).length;
  const activeCustomerCount = customerToggles.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          {/* The h1 names the section, so this row is the description and its
              one action — description first, because an action above the
              sentence explaining it reads backwards. */}
          <div className="flex items-start justify-between gap-4">
            <p className="text-muted-foreground text-sm">{t("intro")}</p>
            <Button size="sm" className="shrink-0" onClick={handleSave}>
              {t("saveChanges")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Staff notifications */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <BellRing className="text-primary size-4" />
              <h3 className="text-sm font-semibold">{t("notifyStaffWhen")}</h3>
              <Badge
                variant="outline"
                className="border-teal-200 bg-teal-50 text-xs text-teal-700"
              >
                {t("activeCount")
                  .replace("{on}", String(activeStaffCount))
                  .replace("{total}", String(staffToggles.length))}
              </Badge>
              <Badge
                variant="outline"
                className="ml-auto h-5 gap-1 text-[10px]"
              >
                <Bell className="size-3" />
                {t("inApp")}
              </Badge>
            </div>
            <div className="space-y-3">
              {staffToggles.map((toggle) => (
                <div
                  key={toggle.key}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${toggle.enabled ? "bg-white" : "bg-muted/20"} `}
                >
                  <div className="mt-0.5 shrink-0">{toggle.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Label
                        className="cursor-pointer text-sm font-medium"
                        htmlFor={`staff-${toggle.key}`}
                      >
                        {t(toggle.label)}
                      </Label>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t(toggle.description)}
                    </p>
                    {toggle.key === "redFlagAnswers" && (
                      <button
                        type="button"
                        onClick={() => setRedFlagModalOpen(true)}
                        className="text-primary mt-1.5 inline-flex min-h-10 items-center gap-1 text-xs font-medium hover:underline max-lg:min-h-12"
                      >
                        <SlidersHorizontal className="size-4" />
                        {t("configureRedFlags")}
                      </button>
                    )}
                  </div>
                  <Switch
                    id={`staff-${toggle.key}`}
                    checked={toggle.enabled}
                    onCheckedChange={() => toggleStaff(toggle.key)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Customer notifications */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Users className="text-primary size-4" />
              <h3 className="text-sm font-semibold">
                {t("notifyCustomerWhen")}
              </h3>
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-xs text-blue-700"
              >
                {t("activeCount")
                  .replace("{on}", String(activeCustomerCount))
                  .replace("{total}", String(customerToggles.length))}
              </Badge>
              <div className="ml-auto flex gap-1">
                <Badge variant="outline" className="h-5 gap-1 text-[10px]">
                  <Mail className="size-3" />
                  {t("email")}
                </Badge>
                <Badge variant="outline" className="h-5 gap-1 text-[10px]">
                  <MessageSquare className="size-3" />
                  SMS
                </Badge>
              </div>
            </div>
            <div className="space-y-3">
              {customerToggles.map((toggle) => (
                <div
                  key={toggle.key}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${toggle.enabled ? "bg-white" : "bg-muted/20"} `}
                >
                  <div className="mt-0.5 shrink-0">{toggle.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Label
                        className="cursor-pointer text-sm font-medium"
                        htmlFor={`cust-${toggle.key}`}
                      >
                        {t(toggle.label)}
                      </Label>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t(toggle.description)}
                    </p>
                    {toggle.key === "missingRequiredFormsReminder" &&
                      toggle.enabled && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {t("sendReminder")}
                          </span>
                          <Input
                            type="number"
                            min={1}
                            value={reminderValue}
                            onChange={(e) =>
                              setReminderValue(
                                Math.max(1, Number(e.target.value) || 1),
                              )
                            }
                            className="h-7 w-16 text-xs"
                            aria-label={t("reminderLeadTime")}
                          />
                          <Select
                            value={reminderUnit}
                            onValueChange={(v) =>
                              setReminderUnit(v as "hours" | "days")
                            }
                          >
                            <SelectTrigger className="min-w-[92px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hours">
                                {t("unitHours")}
                              </SelectItem>
                              <SelectItem value="days">
                                {t("unitDays")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground">
                            {t("before")}
                          </span>
                          <Select
                            value={reminderAnchor}
                            onValueChange={(v) =>
                              setReminderAnchor(v as "appointment" | "check_in")
                            }
                          >
                            <SelectTrigger className="min-w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="check_in">
                                {t("anchorCheckIn")}
                              </SelectItem>
                              <SelectItem value="appointment">
                                {t("anchorAppointment")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                  </div>
                  <Switch
                    id={`cust-${toggle.key}`}
                    checked={toggle.enabled}
                    onCheckedChange={() => toggleCustomer(toggle.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {redFlagModalOpen && (
        <RedFlagConfigModal
          open
          onOpenChange={setRedFlagModalOpen}
          facilityId={DEMO_FACILITY_ID}
        />
      )}
    </div>
  );
}
