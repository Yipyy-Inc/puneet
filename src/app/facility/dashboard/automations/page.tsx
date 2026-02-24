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
    "all" | "booking" | "reminder" | "payment" | "campaign"
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
  const categorizedAutomations = {
    booking: automationRules.filter(
      (r) => r.trigger === "booking_created" || r.trigger === "check_in" || r.trigger === "check_out"
    ),
    reminder: automationRules.filter(
      (r) => r.trigger === "24h_before" || r.trigger === "appointment_reminder" || r.trigger === "vaccination_expiry"
    ),
    payment: automationRules.filter((r) => r.trigger === "payment_received"),
    campaign: [] as typeof automationRules, // Placeholder for campaigns
  };

  // Get filtered automations
  const filteredAutomations =
    filterCategory === "all"
      ? automationRules
      : categorizedAutomations[filterCategory];

  // Get automation category icon
  const getCategoryIcon = (trigger: string) => {
    if (trigger === "booking_created" || trigger === "check_in" || trigger === "check_out") {
      return <Calendar className="h-4 w-4" />;
    }
    if (trigger === "24h_before" || trigger === "appointment_reminder" || trigger === "vaccination_expiry") {
      return <Clock className="h-4 w-4" />;
    }
    if (trigger === "payment_received") {
      return <DollarSign className="h-4 w-4" />;
    }
    return <Zap className="h-4 w-4" />;
  };

  // Get automation category name
  const getCategoryName = (trigger: string) => {
    if (trigger === "booking_created" || trigger === "check_in" || trigger === "check_out") {
      return "Booking";
    }
    if (trigger === "24h_before" || trigger === "appointment_reminder" || trigger === "vaccination_expiry") {
      return "Reminder";
    }
    if (trigger === "payment_received") {
      return "Payment";
    }
    return "Other";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automations</h1>
          <p className="text-muted-foreground mt-1">
            System rules and automated messages configuration (Managers & Admins only)
          </p>
        </div>
        <Button onClick={() => setShowAutomationModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Automation Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-xs text-muted-foreground mt-1">
              of {automationRules.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {automationRules.reduce(
                (sum, r) => sum + r.stats.totalSent,
                0,
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Email Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                automationRules.filter(
                  (r) => r.messageType === "email" || r.messageType === "both"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              SMS Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                automationRules.filter(
                  (r) => r.messageType === "sms" || r.messageType === "both"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active rules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Categories */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setFilterCategory("all")}>
            All Rules
          </TabsTrigger>
          <TabsTrigger value="booking" onClick={() => setFilterCategory("booking")}>
            <Calendar className="h-4 w-4 mr-2" />
            Booking & Check-ins
          </TabsTrigger>
          <TabsTrigger value="reminder" onClick={() => setFilterCategory("reminder")}>
            <Clock className="h-4 w-4 mr-2" />
            Reminders
          </TabsTrigger>
          <TabsTrigger value="payment" onClick={() => setFilterCategory("payment")}>
            <DollarSign className="h-4 w-4 mr-2" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="campaign" onClick={() => setFilterCategory("campaign")}>
            <Megaphone className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        {/* All Rules Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Automation Rules</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete list of all automated message rules
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAutomations.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(rule.trigger)}
                          <span className="font-semibold">{rule.name}</span>
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
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
                                <Mail className="h-3 w-3 mr-1 inline" />
                                <MessageSquare className="h-3 w-3 mr-1 inline" />
                                Both
                              </>
                            ) : rule.messageType === "email" ? (
                              <>
                                <Mail className="h-3 w-3 mr-1 inline" />
                                Email
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-3 w-3 mr-1 inline" />
                                SMS
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Trigger: <span className="font-medium">{rule.trigger.replace(/_/g, " ")}</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Total sent: <span className="font-medium">{rule.stats.totalSent}</span>
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
                        <Settings className="h-4 w-4" />
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
                <Calendar className="h-5 w-5" />
                Booking & Check-in Automations
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Automated messages for booking confirmations, check-ins, and check-outs
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizedAutomations.booking.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No booking automations configured</p>
                  </div>
                ) : (
                  categorizedAutomations.booking.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{rule.name}</span>
                            <Badge variant={rule.enabled ? "default" : "secondary"}>
                              {rule.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Trigger: {rule.trigger.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
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
                          <Settings className="h-4 w-4" />
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
                <Clock className="h-5 w-5" />
                Reminder Automations
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Automated reminders for appointments, evaluations, and important dates
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizedAutomations.reminder.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reminder automations configured</p>
                  </div>
                ) : (
                  categorizedAutomations.reminder.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{rule.name}</span>
                            <Badge variant={rule.enabled ? "default" : "secondary"}>
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
                          <p className="text-sm text-muted-foreground">
                            Trigger: {rule.trigger.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
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
                          <Settings className="h-4 w-4" />
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
                <DollarSign className="h-5 w-5" />
                Payment Automations
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Automated payment receipts and reminders
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizedAutomations.payment.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment automations configured</p>
                  </div>
                ) : (
                  categorizedAutomations.payment.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{rule.name}</span>
                            <Badge variant={rule.enabled ? "default" : "secondary"}>
                              {rule.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Trigger: {rule.trigger.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
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
                          <Settings className="h-4 w-4" />
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
                <Megaphone className="h-5 w-5" />
                Campaign Automations
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Marketing campaigns and bulk messaging automations
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Campaigns coming soon</p>
                <p className="text-sm mt-2">
                  Marketing campaign automation will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <Dialog open={showAutomationModal} onOpenChange={setShowAutomationModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
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
