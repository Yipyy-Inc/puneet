"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Settings,
  Plus,
  CheckCircle2,
  Mail,
  MessageSquare,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Megaphone,
  ShoppingCart,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { automationRules } from "@/data/communications-hub";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AutomationRuleModal } from "@/components/communications/AutomationRuleModal";
import { RebookRemindersCard } from "@/components/communications/RebookRemindersCard";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationScopeBadge } from "@/components/hq/LocationScopePicker";
import { useLocationContext } from "@/hooks/use-location-context";

export default function AutomationsPage() {
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [selectedAutomationRule, setSelectedAutomationRule] = useState<
    (typeof automationRules)[0] | null
  >(null);
  const { locations } = useLocationContext();
  const [filterCategory, setFilterCategory] = useState<
    | "all"
    | "booking"
    | "reminder"
    | "rebook"
    | "payment"
    | "campaign"
    | "forms"
    | "recovery"
  >("all");

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Categorize automations
  const formTriggers = [
    "form_link_sent",
    "form_started",
    "form_submitted",
    "form_incomplete_by_deadline",
    "form_red_flag_answer",
  ];
  const categorizedAutomations = {
    booking: automationRules.filter(
      (r) =>
        r.trigger === "booking_created" ||
        r.trigger === "booking_request_submitted" ||
        r.trigger === "booking_request_approved" ||
        r.trigger === "booking_request_declined" ||
        r.trigger === "check_in" ||
        r.trigger === "check_out",
    ),
    reminder: automationRules.filter(
      (r) =>
        r.trigger === "24h_before" ||
        r.trigger === "appointment_reminder" ||
        r.trigger === "vaccination_expiry",
    ),
    payment: automationRules.filter((r) => r.trigger === "payment_received"),
    forms: automationRules.filter((r) => formTriggers.includes(r.trigger)),
    recovery: automationRules.filter((r) => r.trigger === "booking_abandoned"),
    rebook: [] as typeof automationRules, // Rebook Reminders has its own card
    campaign: [] as typeof automationRules, // Placeholder for campaigns
  };

  // Get filtered automations
  const filteredAutomations =
    filterCategory === "all"
      ? automationRules
      : categorizedAutomations[filterCategory];

  // Get automation category icon
  const getCategoryIcon = (trigger: string) => {
    if (
      trigger === "booking_created" ||
      trigger === "booking_request_submitted" ||
      trigger === "booking_request_approved" ||
      trigger === "booking_request_declined" ||
      trigger === "check_in" ||
      trigger === "check_out"
    ) {
      return <Calendar className="size-4" />;
    }
    if (
      trigger === "24h_before" ||
      trigger === "appointment_reminder" ||
      trigger === "vaccination_expiry"
    ) {
      return <Clock className="size-4" />;
    }
    if (trigger === "payment_received") {
      return <DollarSign className="size-4" />;
    }
    if (formTriggers.includes(trigger)) {
      return <FileText className="size-4" />;
    }
    if (trigger === "booking_abandoned") {
      return <ShoppingCart className="size-4" />;
    }
    return <Zap className="size-4" />;
  };

  // Map trigger → soft tone classes for category badges in the All Rules list
  const getCategoryBadgeClass = (trigger: string) => {
    if (
      trigger === "booking_created" ||
      trigger === "booking_request_submitted" ||
      trigger === "booking_request_approved" ||
      trigger === "booking_request_declined" ||
      trigger === "check_in" ||
      trigger === "check_out"
    ) {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }
    if (
      trigger === "24h_before" ||
      trigger === "appointment_reminder" ||
      trigger === "vaccination_expiry"
    ) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    if (trigger === "payment_received") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (formTriggers.includes(trigger)) {
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    }
    if (trigger === "booking_abandoned") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }
    return "";
  };

  // Get automation category name
  const getCategoryName = (trigger: string) => {
    if (
      trigger === "booking_created" ||
      trigger === "booking_request_submitted" ||
      trigger === "booking_request_approved" ||
      trigger === "booking_request_declined" ||
      trigger === "check_in" ||
      trigger === "check_out"
    ) {
      return "Booking";
    }
    if (
      trigger === "24h_before" ||
      trigger === "appointment_reminder" ||
      trigger === "vaccination_expiry"
    ) {
      return "Reminder";
    }
    if (trigger === "payment_received") {
      return "Payment";
    }
    if (formTriggers.includes(trigger)) {
      return "Forms";
    }
    if (trigger === "booking_abandoned") {
      return "Recovery";
    }
    return "Other";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automations</h1>
          <p className="text-muted-foreground mt-1">
            System rules and automated messages configuration (Managers & Admins
            only)
          </p>
        </div>
        <Button onClick={() => setShowAutomationModal(true)}>
          <Plus className="mr-2 size-4" />
          Create Automation Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Active Automations"
          value={automationRules.filter((r) => r.enabled).length}
          hint={`of ${automationRules.length} total`}
          icon={Zap}
          tone="indigo"
        />
        <KpiTile
          label="Total Sent"
          value={automationRules.reduce((sum, r) => sum + r.stats.totalSent, 0)}
          hint="All time"
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Email Rules"
          value={
            automationRules.filter(
              (r) => r.messageType === "email" || r.messageType === "both",
            ).length
          }
          hint="Active rules"
          icon={Mail}
          tone="violet"
        />
        <KpiTile
          label="SMS Rules"
          value={
            automationRules.filter(
              (r) => r.messageType === "sms" || r.messageType === "both",
            ).length
          }
          hint="Active rules"
          icon={MessageSquare}
          tone="amber"
        />
      </div>

      {/* Automation Categories */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-gradient-to-r from-sky-50/60 via-white to-orange-50/40 rounded-xl border px-2 py-1">
          <TabsTrigger
            value="all"
            onClick={() => setFilterCategory("all")}
            className="data-[state=active]:!border-sky-500 data-[state=active]:!text-sky-700 data-[state=active]:bg-sky-50/70"
          >
            All Rules
          </TabsTrigger>
          <TabsTrigger
            value="booking"
            onClick={() => setFilterCategory("booking")}
            className="data-[state=active]:!border-blue-500 data-[state=active]:!text-blue-700 data-[state=active]:bg-blue-50/70"
          >
            <Calendar className="mr-2 size-4" />
            Booking & Check-ins
          </TabsTrigger>
          <TabsTrigger
            value="reminder"
            onClick={() => setFilterCategory("reminder")}
            className="data-[state=active]:!border-amber-500 data-[state=active]:!text-amber-700 data-[state=active]:bg-amber-50/70"
          >
            <Clock className="mr-2 size-4" />
            Reminders
          </TabsTrigger>
          <TabsTrigger
            value="rebook"
            onClick={() => setFilterCategory("rebook")}
            className="data-[state=active]:!border-violet-500 data-[state=active]:!text-violet-700 data-[state=active]:bg-violet-50/70"
          >
            <RefreshCw className="mr-2 size-4" />
            Rebook Reminders
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            onClick={() => setFilterCategory("payment")}
            className="data-[state=active]:!border-emerald-500 data-[state=active]:!text-emerald-700 data-[state=active]:bg-emerald-50/70"
          >
            <DollarSign className="mr-2 size-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger
            value="forms"
            onClick={() => setFilterCategory("forms")}
            className="data-[state=active]:!border-indigo-500 data-[state=active]:!text-indigo-700 data-[state=active]:bg-indigo-50/70"
          >
            <FileText className="mr-2 size-4" />
            Forms
          </TabsTrigger>
          <TabsTrigger
            value="recovery"
            onClick={() => setFilterCategory("recovery")}
            className="data-[state=active]:!border-rose-500 data-[state=active]:!text-rose-700 data-[state=active]:bg-rose-50/70"
          >
            <ShoppingCart className="mr-2 size-4" />
            Recovery
          </TabsTrigger>
          <TabsTrigger
            value="campaign"
            onClick={() => setFilterCategory("campaign")}
            className="data-[state=active]:!border-orange-500 data-[state=active]:!text-orange-700 data-[state=active]:bg-orange-50/70"
          >
            <Megaphone className="mr-2 size-4" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        {/* All Rules Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card className="border-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-orange-50/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <Zap className="size-4" />
                </span>
                All Automation Rules
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Complete list of all automated message rules
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAutomations.map((rule) => (
                  <div
                    key={rule.id}
                    className="hover:bg-sky-50/40 hover:border-sky-200 rounded-lg border bg-white p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          {getCategoryIcon(rule.trigger)}
                          <span className="font-semibold">{rule.name}</span>
                          <Badge
                            variant={rule.enabled ? "default" : "secondary"}
                          >
                            {rule.enabled ? (
                              <>
                                <CheckCircle2 className="mr-1 inline size-3" />
                                Active
                              </>
                            ) : (
                              "Inactive"
                            )}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`capitalize ${getCategoryBadgeClass(rule.trigger)}`}
                          >
                            {getCategoryName(rule.trigger)}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {rule.messageType === "both" ? (
                              <>
                                <Mail className="mr-1 inline size-3" />
                                <MessageSquare className="mr-1 inline size-3" />
                                Both
                              </>
                            ) : rule.messageType === "email" ? (
                              <>
                                <Mail className="mr-1 inline size-3" />
                                Email
                              </>
                            ) : (
                              <>
                                <MessageSquare className="mr-1 inline size-3" />
                                SMS
                              </>
                            )}
                          </Badge>
                          <LocationScopeBadge
                            locationIds={rule.conditions?.locationIds}
                            locations={locations}
                          />
                        </div>
                        <p className="text-muted-foreground mb-2 text-sm">
                          Trigger:{" "}
                          <span className="font-medium">
                            {rule.trigger.replace(/_/g, " ")}
                          </span>
                        </p>
                        <div className="text-muted-foreground flex items-center gap-4 text-xs">
                          <span>
                            Total sent:{" "}
                            <span className="font-medium">
                              {rule.stats.totalSent}
                            </span>
                          </span>
                          <span>•</span>
                          <span>
                            Last triggered:{" "}
                            <span className="font-medium">
                              {rule.stats.lastTriggered
                                ? formatTimestamp(rule.stats.lastTriggered)
                                : "Never"}
                            </span>
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAutomationRule(rule);
                          setShowAutomationModal(true);
                        }}
                      >
                        <Settings className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking & Check-ins Tab */}
        <TabsContent value="booking" className="space-y-4">
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50/40 via-white to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Calendar className="size-4" />
                </span>
                Booking & Check-in Automations
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Automated messages for booking confirmations, check-ins, and
                check-outs
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizedAutomations.booking.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <Calendar className="mx-auto mb-4 size-12 opacity-50" />
                    <p>No booking automations configured</p>
                  </div>
                ) : (
                  categorizedAutomations.booking.map((rule) => (
                    <div
                      key={rule.id}
                      className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="font-semibold">{rule.name}</span>
                            <Badge
                              variant={rule.enabled ? "default" : "secondary"}
                            >
                              {rule.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            Trigger: {rule.trigger.replace(/_/g, " ")}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Sent {rule.stats.totalSent} times
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAutomationRule(rule);
                            setShowAutomationModal(true);
                          }}
                        >
                          <Settings className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminder" className="space-y-4">
          <Card className="border-amber-100 bg-gradient-to-br from-amber-50/40 via-white to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Clock className="size-4" />
                </span>
                Reminder Automations
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Automated reminders for appointments, evaluations, and important
                dates
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizedAutomations.reminder.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <Clock className="mx-auto mb-4 size-12 opacity-50" />
                    <p>No reminder automations configured</p>
                  </div>
                ) : (
                  categorizedAutomations.reminder.map((rule) => (
                    <div
                      key={rule.id}
                      className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="font-semibold">{rule.name}</span>
                            <Badge
                              variant={rule.enabled ? "default" : "secondary"}
                            >
                              {rule.enabled ? "Active" : "Inactive"}
                            </Badge>
                            {rule.schedule && (
                              <Badge variant="outline">
                                {rule.schedule.hoursBefore
                                  ? `${rule.schedule.hoursBefore}h before`
                                  : rule.schedule.daysBeforeExpiry
                                    ? `${rule.schedule.daysBeforeExpiry} days before`
                                    : ""}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm">
                            Trigger: {rule.trigger.replace(/_/g, " ")}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Sent {rule.stats.totalSent} times
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAutomationRule(rule);
                            setShowAutomationModal(true);
                          }}
                        >
                          <Settings className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rebook Reminders Tab */}
        <TabsContent value="rebook" className="space-y-4">
          <RebookRemindersCard />
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <DollarSign className="size-4" />
                </span>
                Payment Automations
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Automated payment receipts and reminders
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizedAutomations.payment.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <DollarSign className="mx-auto mb-4 size-12 opacity-50" />
                    <p>No payment automations configured</p>
                  </div>
                ) : (
                  categorizedAutomations.payment.map((rule) => (
                    <div
                      key={rule.id}
                      className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="font-semibold">{rule.name}</span>
                            <Badge
                              variant={rule.enabled ? "default" : "secondary"}
                            >
                              {rule.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            Trigger: {rule.trigger.replace(/_/g, " ")}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Sent {rule.stats.totalSent} times
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAutomationRule(rule);
                            setShowAutomationModal(true);
                          }}
                        >
                          <Settings className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forms Tab (7.2) */}
        <TabsContent value="forms" className="space-y-4">
          <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FileText className="size-4" />
                </span>
                Form Automations
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Automated messages triggered by form lifecycle events — link
                sent, started, submitted, deadline missed, or red-flag answers
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizedAutomations.forms.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <FileText className="mx-auto mb-4 size-12 opacity-50" />
                    <p>No form automations configured</p>
                  </div>
                ) : (
                  categorizedAutomations.forms.map((rule) => (
                    <div
                      key={rule.id}
                      className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <FileText className="size-4" />
                            <span className="font-semibold">{rule.name}</span>
                            <Badge
                              variant={rule.enabled ? "default" : "secondary"}
                            >
                              {rule.enabled ? (
                                <>
                                  <CheckCircle2 className="mr-1 inline size-3" />
                                  Active
                                </>
                              ) : (
                                "Inactive"
                              )}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              Forms
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {rule.messageType === "both" ? (
                                <>
                                  <Mail className="mr-1 inline size-3" />
                                  <MessageSquare className="mr-1 inline size-3" />
                                  Both
                                </>
                              ) : rule.messageType === "email" ? (
                                <>
                                  <Mail className="mr-1 inline size-3" />
                                  Email
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="mr-1 inline size-3" />
                                  SMS
                                </>
                              )}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-2 text-sm">
                            Trigger:{" "}
                            <span className="font-medium">
                              {rule.trigger.replace(/_/g, " ")}
                            </span>
                          </p>
                          <div className="text-muted-foreground flex items-center gap-4 text-xs">
                            <span>
                              Total sent:{" "}
                              <span className="font-medium">
                                {rule.stats.totalSent}
                              </span>
                            </span>
                            <span>•</span>
                            <span>
                              Last triggered:{" "}
                              <span className="font-medium">
                                {rule.stats.lastTriggered
                                  ? formatTimestamp(rule.stats.lastTriggered)
                                  : "Never"}
                              </span>
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAutomationRule(rule);
                            setShowAutomationModal(true);
                          }}
                        >
                          <Settings className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery" className="space-y-4">
          <Card className="border-rose-100 bg-gradient-to-br from-rose-50/40 via-white to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                  <ShoppingCart className="size-4" />
                </span>
                Abandonment Recovery
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Automated outreach for clients who started but didn&apos;t
                complete a booking. Configure per-step templates in{" "}
                <a
                  href="/facility/dashboard/online-booking"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Booking Requests → Unfinished → Recovery Settings
                </a>
                .
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizedAutomations.recovery.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <ShoppingCart className="mx-auto mb-4 size-12 opacity-50" />
                    <p className="font-medium">No recovery automations yet</p>
                    <p className="mt-1 text-sm">
                      Go to{" "}
                      <a
                        href="/facility/dashboard/online-booking"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Booking Requests → Unfinished tab → Recovery Settings
                      </a>{" "}
                      to set up per-step email and SMS recovery rules.
                    </p>
                  </div>
                ) : (
                  categorizedAutomations.recovery.map((rule) => (
                    <div
                      key={rule.id}
                      className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <ShoppingCart className="size-4 text-amber-500" />
                            <span className="font-semibold">{rule.name}</span>
                            <Badge
                              variant={rule.enabled ? "default" : "secondary"}
                            >
                              {rule.enabled ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {rule.messageType === "both"
                                ? "Email + SMS"
                                : rule.messageType}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            Trigger: Booking abandoned
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Sent {rule.stats.totalSent} times
                            {rule.stats.lastTriggered && (
                              <>
                                {" "}
                                · Last triggered{" "}
                                {formatTimestamp(rule.stats.lastTriggered)}
                              </>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAutomationRule(rule);
                            setShowAutomationModal(true);
                          }}
                        >
                          <Settings className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaign" className="space-y-4">
          <Card className="border-orange-100 bg-gradient-to-br from-orange-50/40 via-white to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Megaphone className="size-4" />
                </span>
                Campaign Automations
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Marketing campaigns and bulk messaging automations
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-12 text-center">
                <Megaphone className="mx-auto mb-4 h-16 w-16 opacity-50" />
                <p className="text-lg font-medium">Campaigns coming soon</p>
                <p className="mt-2 text-sm">
                  Marketing campaign automation will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <Dialog open={showAutomationModal} onOpenChange={setShowAutomationModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <AutomationRuleModal
            rule={selectedAutomationRule ?? undefined}
            onClose={() => {
              setShowAutomationModal(false);
              setSelectedAutomationRule(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
