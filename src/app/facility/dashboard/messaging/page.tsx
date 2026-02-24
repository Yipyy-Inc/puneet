"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MessageSquare,
  Bell,
  Settings,
  Plus,
  Zap,
  Users,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  messages,
  automationRules,
  petUpdates,
  internalMessages,
} from "@/data/communications-hub";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ComposeMessageModal } from "@/components/communications/ComposeMessageModal";
import { AutomationRuleModal } from "@/components/communications/AutomationRuleModal";
import { PetUpdateModal } from "@/components/communications/PetUpdateModal";
import { AppointmentRemindersTab } from "@/components/additional-features/AppointmentRemindersTab";

export default function MessagingPage() {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [showPetUpdateModal, setShowPetUpdateModal] = useState(false);
  const [selectedAutomationRule, setSelectedAutomationRule] = useState<
    (typeof automationRules)[0] | null
  >(null);

  // Message Columns
  const messageColumns: ColumnDef<(typeof messages)[0]>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.type === "email" && (
            <Mail className="h-3 w-3 mr-1 inline" />
          )}
          {row.original.type === "sms" && (
            <MessageSquare className="h-3 w-3 mr-1 inline" />
          )}
          {row.original.type === "in-app" && (
            <Bell className="h-3 w-3 mr-1 inline" />
          )}
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "direction",
      header: "Direction",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.direction === "inbound" ? "default" : "secondary"
          }
        >
          {row.original.direction === "inbound" ? "↓ In" : "↑ Out"}
        </Badge>
      ),
    },
    {
      accessorKey: "from",
      header: "From",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">{row.original.from}</div>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject/Message",
      cell: ({ row }) => (
        <div>
          {row.original.subject && (
            <div className="font-medium">{row.original.subject}</div>
          )}
          <div className="text-sm text-muted-foreground truncate max-w-[300px]">
            {row.original.body}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        const date = new Date(row.original.timestamp);
        return (
          <div className="text-sm">
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "read"
              ? "outline"
              : row.original.status === "delivered"
                ? "default"
                : row.original.status === "sent"
                  ? "secondary"
                  : "destructive"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
  ];

  // Automation Columns
  const automationColumns: ColumnDef<(typeof automationRules)[0]>[] = [
    {
      accessorKey: "name",
      header: "Automation Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground capitalize">
            Trigger: {row.original.trigger.replace(/_/g, " ")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "messageType",
      header: "Message Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.messageType}
        </Badge>
      ),
    },
    {
      accessorKey: "stats.totalSent",
      header: "Total Sent",
      cell: ({ row }) => (
        <div className="font-semibold">{row.original.stats.totalSent}</div>
      ),
    },
    {
      accessorKey: "stats.lastTriggered",
      header: "Last Triggered",
      cell: ({ row }) =>
        row.original.stats.lastTriggered
          ? new Date(row.original.stats.lastTriggered).toLocaleString()
          : "Never",
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? "default" : "secondary"}>
          {row.original.enabled ? (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1 inline" />
              Active
            </>
          ) : (
            "Inactive"
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedAutomationRule(row.original);
            setShowAutomationModal(true);
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Pet Update Columns
  const petUpdateColumns: ColumnDef<(typeof petUpdates)[0]>[] = [
    {
      accessorKey: "updateType",
      header: "Type",
      cell: ({ row }) => {
        const icons = {
          eating: "🍽️",
          potty: "🚽",
          playtime: "🎾",
          naptime: "😴",
          medication: "💊",
          grooming: "✂️",
          custom: "📝",
        };
        return (
          <div className="flex items-center gap-2">
            <span className="text-xl">{icons[row.original.updateType]}</span>
            <span className="capitalize">{row.original.updateType}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "petName",
      header: "Pet",
    },
    {
      accessorKey: "message",
      header: "Update",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate">{row.original.message}</div>
      ),
    },
    {
      accessorKey: "staffName",
      header: "Staff",
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => new Date(row.original.timestamp).toLocaleString(),
    },
    {
      accessorKey: "notificationSent",
      header: "Notified",
      cell: ({ row }) => (
        <Badge
          variant={row.original.notificationSent ? "default" : "secondary"}
        >
          {row.original.notificationSent ? "Sent" : "Pending"}
        </Badge>
      ),
    },
  ];

  // Filter messages by type
  const emailMessages = messages.filter((m) => m.type === "email");
  const smsMessages = messages.filter((m) => m.type === "sms");
  const inAppMessages = messages.filter((m) => m.type === "in-app");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messaging</h1>
          <p className="text-muted-foreground mt-1">
            Email, SMS, automations, and internal communications
          </p>
        </div>
      </div>

      {/* Messaging Tabs */}
      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">
            <Mail className="h-4 w-4 mr-2" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="automations">
            <Zap className="h-4 w-4 mr-2" />
            Automations
          </TabsTrigger>
          <TabsTrigger value="pet-updates">
            <Bell className="h-4 w-4 mr-2" />
            Pet Updates
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Clock className="h-4 w-4 mr-2" />
            Appointment Reminders
          </TabsTrigger>
          <TabsTrigger value="internal">
            <Users className="h-4 w-4 mr-2" />
            Internal
          </TabsTrigger>
        </TabsList>

        {/* Unified Inbox Tab */}
        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Unified Inbox</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    All messages from email, SMS, and in-app in one place
                  </p>
                </div>
                <Button onClick={() => setShowComposeModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Compose Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={messageColumns}
                data={messages}
                searchColumn="body"
                searchPlaceholder="Search messages..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    All email communications
                  </p>
                </div>
                <Button onClick={() => setShowComposeModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Compose Email
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={messageColumns}
                data={emailMessages}
                searchColumn="body"
                searchPlaceholder="Search emails..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>SMS</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    All SMS text messages
                  </p>
                </div>
                <Button onClick={() => setShowComposeModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Send SMS
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={messageColumns}
                data={smsMessages}
                searchColumn="body"
                searchPlaceholder="Search SMS..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          {/* Automation Stats */}
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
                  Email Automations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    automationRules.filter((r) => r.messageType === "email")
                      .length
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
                  SMS Automations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    automationRules.filter((r) => r.messageType === "sms")
                      .length
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active rules
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Automation Rules</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automated messages triggered by events
                  </p>
                </div>
                <Button onClick={() => setShowAutomationModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={automationColumns}
                data={automationRules}
                searchColumn="name"
                searchPlaceholder="Search automations..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pet Updates Tab */}
        <TabsContent value="pet-updates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Real-Time Pet Updates</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quick updates sent to pet owners
                  </p>
                </div>
                <Button onClick={() => setShowPetUpdateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Send Update
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={petUpdateColumns}
                data={petUpdates}
                searchColumn="petName"
                searchPlaceholder="Search by pet name..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointment Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <AppointmentRemindersTab />
        </TabsContent>

        {/* Internal Communications Tab */}
        <TabsContent value="internal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Internal Team Communications</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Team messages with @mentions
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {internalMessages.map((msg) => (
                  <div key={msg.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{msg.from}</span>
                          <Badge variant="outline" className="capitalize">
                            {msg.channel}
                          </Badge>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {msg.mentions.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {msg.mentions.map((mention, idx) => (
                          <Badge key={idx} variant="secondary">
                            @{mention}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <ComposeMessageModal onClose={() => setShowComposeModal(false)} />
        </DialogContent>
      </Dialog>

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

      <Dialog open={showPetUpdateModal} onOpenChange={setShowPetUpdateModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <PetUpdateModal onClose={() => setShowPetUpdateModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
