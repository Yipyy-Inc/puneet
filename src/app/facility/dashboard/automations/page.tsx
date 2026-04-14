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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { automationRules } from "@/data/communications-hub";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AutomationRuleModal } from "@/components/communications/AutomationRuleModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AutomationsPage() {
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [selectedAutomationRule, setSelectedAutomationRule] = useState<
    (typeof automationRules)[0] | null
  >(null);
  const [filterCategory, setFilterCategory] = useState<
    | "all"
    | "booking"
    | "reminder"
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Automations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {automationRules.filter((r) => r.enabled).length}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              of {automationRules.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {automationRules.reduce((sum, r) => sum + r.stats.totalSent, 0)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Email Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                automationRules.filter(
                  (r) => r.messageType === "email" || r.messageType === "both",
                ).length
              }
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Active rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">SMS Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                automationRules.filter(
                  (r) => r.messageType === "sms" || r.messageType === "both",
                ).length
              }
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Active rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Categories */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setFilterCategory("all")}>
            All Rules
          </TabsTrigger>
          <TabsTrigger
            value="booking"
            onClick={() => setFilterCategory("booking")}
          >
            <Calendar className="mr-2 size-4" />
            Booking & Check-ins
          </TabsTrigger>
          <TabsTrigger
            value="reminder"
            onClick={() => setFilterCategory("reminder")}
          >
            <Clock className="mr-2 size-4" />
            Reminders
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            onClick={() => setFilterCategory("payment")}
          >
            <DollarSign className="mr-2 size-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="forms" onClick={() => setFilterCategory("forms")}>
            <FileText className="mr-2 size-4" />
            Forms
          </TabsTrigger>
          <TabsTrigger
            value="recovery"
            onClick={() => setFilterCategory("recovery")}
          >
            <ShoppingCart className="mr-2 size-4" />
            Recovery
          </TabsTrigger>
          <TabsTrigger
            value="campaign"
            onClick={() => setFilterCategory("campaign")}
          >
            <Megaphone className="mr-2 size-4" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        {/* All Rules Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Automation Rules</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Complete list of all automated message rules
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAutomations.map((rule) => (
                  <div
                    key={rule.id}
                    className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
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
                          <Badge variant="outline" className="capitalize">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
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

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="size-5" />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="size-5" />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="size-5" />
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
