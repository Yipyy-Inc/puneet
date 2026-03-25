"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Heart, MessageSquare, Mail, Bell } from "lucide-react";
import type { PlaydateAlertLog } from "@/data/marketing";
import {
  playdateAlertConfig,
  playdateAlertTemplate,
  playdateAlertLogs,
  ALL_SERVICE_OPTIONS,
  getAlertStatusVariant,
  formatAlertChannel,
} from "@/data/marketing";

const TRIGGER_SERVICES = ALL_SERVICE_OPTIONS.map((s) => ({ id: s.value, label: s.label }));

const TEMPLATE_VARIABLES = [
  "{client_name}",
  "{pet_name}",
  "{friend_pet_name}",
  "{friend_owner_name}",
  "{service_type}",
  "{booking_date}",
  "{facility_name}",
  "{book_link}",
  "{cta_text}",
];

const LOG_COLUMNS: ColumnDef<PlaydateAlertLog>[] = [
  {
    accessorKey: "sentAt",
    header: "Date",
    cell: ({ row }) => new Date(row.original.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  },
  {
    accessorKey: "triggerPetName",
    header: "Trigger Pet",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.triggerPetName}</span>
    ),
  },
  {
    accessorKey: "recipientPetName",
    header: "Friend Pet",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.recipientPetName}</span>
    ),
  },
  {
    accessorKey: "recipientCustomerName",
    header: "Recipient",
  },
  {
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => {
      return (
        <Badge variant="outline" className="capitalize">
          {formatAlertChannel(row.original.channel)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant={getAlertStatusVariant(row.original.status)}>
            {row.original.status}
          </Badge>
          {row.original.reasonSuppressed && (
            <span className="text-xs text-muted-foreground" title={row.original.reasonSuppressed}>
              ({row.original.reasonSuppressed})
            </span>
          )}
        </div>
      );
    },
  },
];

export function PlaydateAlertsTab() {
  const [config, setConfig] = useState({ ...playdateAlertConfig });
  const [smsTemplate, setSmsTemplate] = useState(playdateAlertTemplate.sms);
  const [emailSubject, setEmailSubject] = useState(playdateAlertTemplate.email.subject);
  const [emailBody, setEmailBody] = useState(playdateAlertTemplate.email.body);

  const toggleService = (serviceId: string) => {
    setConfig((prev) => ({
      ...prev,
      triggerServices: prev.triggerServices.includes(serviceId)
        ? prev.triggerServices.filter((s: string) => s !== serviceId)
        : [...prev.triggerServices, serviceId],
    }));
  };

  const handleSave = () => {
    console.log("Saving playdate alert config:", config);
    console.log("SMS template:", smsTemplate);
    console.log("Email template:", { subject: emailSubject, body: emailBody });
  };

  const insertVariable = (variable: string, target: "sms" | "email_subject" | "email_body") => {
    if (target === "sms") setSmsTemplate((prev) => prev + " " + variable);
    else if (target === "email_subject") setEmailSubject((prev) => prev + " " + variable);
    else setEmailBody((prev) => prev + " " + variable);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" aria-hidden="true" />
            Playdate Alert Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="playdate-enabled" className="text-sm font-medium">Enable Playdate Alerts</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically notify pet friends&apos; owners when a booking is created
              </p>
            </div>
            <Switch
              id="playdate-enabled"
              checked={config.enabled}
              onCheckedChange={(checked: boolean) => setConfig((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>

          {config.enabled && (
            <>
              {/* Service triggers */}
              <div className="space-y-2">
                <Label className="text-sm">Trigger Services</Label>
                <p className="text-xs text-muted-foreground">Which bookings should trigger playdate alerts?</p>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {TRIGGER_SERVICES.map((svc) => (
                    <div key={svc.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`svc-${svc.id}`}
                        checked={config.triggerServices.includes(svc.id)}
                        onCheckedChange={() => toggleService(svc.id)}
                      />
                      <Label htmlFor={`svc-${svc.id}`} className="text-sm font-normal cursor-pointer">
                        {svc.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trigger moment */}
              <div className="space-y-2">
                <Label className="text-sm">Trigger Moment</Label>
                <div className="flex gap-4 flex-wrap">
                  <Button
                    variant={config.triggerMoment === "on_request" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfig((prev) => ({ ...prev, triggerMoment: "on_request" as const }))}
                    aria-pressed={config.triggerMoment === "on_request"}
                  >
                    When request is submitted
                  </Button>
                  <Button
                    variant={config.triggerMoment === "on_confirmation" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfig((prev) => ({ ...prev, triggerMoment: "on_confirmation" as const }))}
                    aria-pressed={config.triggerMoment === "on_confirmation"}
                  >
                    When booking is confirmed
                  </Button>
                </div>
              </div>

              {/* Channel toggles */}
              <div className="space-y-2">
                <Label className="text-sm">Notification Channels</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Label htmlFor="ch-sms" className="text-sm font-normal">SMS</Label>
                    </div>
                    <Switch
                      id="ch-sms"
                      checked={config.channels.sms}
                      onCheckedChange={(checked: boolean) =>
                        setConfig((prev) => ({ ...prev, channels: { ...prev.channels, sms: checked } }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Label htmlFor="ch-email" className="text-sm font-normal">Email</Label>
                    </div>
                    <Switch
                      id="ch-email"
                      checked={config.channels.email}
                      onCheckedChange={(checked: boolean) =>
                        setConfig((prev) => ({ ...prev, channels: { ...prev.channels, email: checked } }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Label htmlFor="ch-inapp" className="text-sm font-normal">In-App</Label>
                    </div>
                    <Switch
                      id="ch-inapp"
                      checked={config.channels.inApp}
                      onCheckedChange={(checked: boolean) =>
                        setConfig((prev) => ({ ...prev, channels: { ...prev.channels, inApp: checked } }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div className="space-y-2">
                <Label className="text-sm">Timing</Label>
                <div className="flex gap-4 items-end flex-wrap">
                  <div className="flex gap-2">
                    <Button
                      variant={config.timing === "immediate" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig((prev) => ({ ...prev, timing: "immediate" as const }))}
                      aria-pressed={config.timing === "immediate"}
                    >
                      Immediately
                    </Button>
                    <Button
                      variant={config.timing === "scheduled" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConfig((prev) => ({ ...prev, timing: "scheduled" as const }))}
                      aria-pressed={config.timing === "scheduled"}
                    >
                      Scheduled before
                    </Button>
                  </div>
                  {config.timing === "scheduled" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.beforeHours || ""}
                        onChange={(e) => setConfig((prev) => ({ ...prev, beforeHours: Number(e.target.value) || undefined }))}
                        className="w-20 h-8"
                        min={1}
                        aria-label="Hours before booking"
                      />
                      <span className="text-sm text-muted-foreground">hours before booking</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quiet Hours + Rate Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start" className="text-sm">Quiet Hours Start</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={config.quietHoursStart || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, quietHoursStart: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end" className="text-sm">Quiet Hours End</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={config.quietHoursEnd || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, quietHoursEnd: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate-limit" className="text-sm">Max Alerts / Owner / Day</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    value={config.rateLimitPerDay}
                    onChange={(e) => setConfig((prev) => ({ ...prev, rateLimitPerDay: Number(e.target.value) || 1 }))}
                    className="h-8"
                    min={1}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Templates */}
      {config.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alert Message Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="sms">
              <TabsList>
                <TabsTrigger value="sms">SMS</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="sms" className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sms-template" className="text-sm">SMS Message</Label>
                    <span className="text-xs text-muted-foreground">
                      {smsTemplate.length} chars (template length, variables will expand)
                    </span>
                  </div>
                  <Textarea
                    id="sms-template"
                    value={smsTemplate}
                    onChange={(e) => setSmsTemplate(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Insert variable:</Label>
                  <div className="flex flex-wrap gap-1 mt-1" role="group" aria-label="SMS template variables">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <Button
                        key={v}
                        variant="outline"
                        size="sm"
                        className="h-auto py-0.5 px-2 text-xs font-normal"
                        onClick={() => insertVariable(v, "sms")}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email-subject" className="text-sm">Subject</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-body" className="text-sm">Body</Label>
                  <Textarea
                    id="email-body"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={6}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Insert variable:</Label>
                  <div className="flex flex-wrap gap-1 mt-1" role="group" aria-label="Email template variables">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <Button
                        key={v}
                        variant="outline"
                        size="sm"
                        className="h-auto py-0.5 px-2 text-xs font-normal"
                        onClick={() => insertVariable(v, "email_body")}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      {config.enabled && (
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" /> Save Configuration
          </Button>
        </div>
      )}

      {/* Section 3: Alert Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Log</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={LOG_COLUMNS}
            data={playdateAlertLogs}
            searchColumn="recipientCustomerName"
            searchPlaceholder="Search by recipient..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
