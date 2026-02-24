"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneForwarded,
  Voicemail,
  Clock,
  Play,
  AlertCircle,
  Settings,
  Plus,
  Zap,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { callLogs, routingRules } from "@/data/communications-hub";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CallDetailsModal } from "@/components/communications/CallDetailsModal";
import { RoutingRuleModal } from "@/components/communications/RoutingRuleModal";

export default function CallingPage() {
  const [showCallDetailsModal, setShowCallDetailsModal] = useState(false);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<(typeof callLogs)[0] | null>(
    null,
  );
  const [phoneNumber, setPhoneNumber] = useState("");

  // Call Log Columns
  const callColumns: ColumnDef<(typeof callLogs)[0]>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge
          variant={row.original.type === "inbound" ? "default" : "outline"}
        >
          {row.original.type === "inbound" ? "↓ Inbound" : "↑ Outbound"}
        </Badge>
      ),
    },
    {
      accessorKey: "from",
      header: "From",
      cell: ({ row }) => (
        <div>
          <div>{row.original.clientName || "Unknown"}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.from}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const minutes = Math.floor(row.original.duration / 60);
        const seconds = row.original.duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const variants = {
          completed: "default" as const,
          missed: "destructive" as const,
          voicemail: "secondary" as const,
          failed: "destructive" as const,
        };
        return (
          <Badge variant={variants[row.original.status]}>
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "aiHandled",
      header: "Handled By",
      cell: ({ row }) => (
        <Badge variant={row.original.aiHandled ? "default" : "outline"}>
          {row.original.aiHandled ? (
            <>
              <Zap className="h-3 w-3 mr-1 inline" />
              AI
            </>
          ) : (
            "Staff"
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => new Date(row.original.timestamp).toLocaleString(),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.recordingUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                alert(`Playing call recording from ${row.original.from}...`);
              }}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCall(row.original);
              setShowCallDetailsModal(true);
            }}
          >
            <AlertCircle className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Routing Rule Columns
  const routingColumns: ColumnDef<(typeof routingRules)[0]>[] = [
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge variant="outline">#{row.original.priority}</Badge>
      ),
    },
    {
      accessorKey: "name",
      header: "Rule Name",
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.original.action.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? "default" : "secondary"}>
          {row.original.enabled ? "Active" : "Inactive"}
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
            setShowRoutingModal(true);
            alert(`Edit routing rule "${row.original.name}"`);
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Get voicemails from call logs
  const voicemails = callLogs.filter((c) => c.status === "voicemail");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calling</h1>
          <p className="text-muted-foreground mt-1">
            Voice calls, dialer, and call routing
          </p>
        </div>
      </div>

      {/* Calling Tabs */}
      <Tabs defaultValue="dialer" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dialer">
            <Phone className="h-4 w-4 mr-2" />
            Dialer
          </TabsTrigger>
          <TabsTrigger value="calls">
            <Phone className="h-4 w-4 mr-2" />
            Call Log
          </TabsTrigger>
          <TabsTrigger value="voicemail">
            <Voicemail className="h-4 w-4 mr-2" />
            Voicemail
            {voicemails.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {voicemails.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="routing">
            <PhoneForwarded className="h-4 w-4 mr-2" />
            Routing
          </TabsTrigger>
        </TabsList>

        {/* Dialer Tab */}
        <TabsContent value="dialer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dialer</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Make calls using Twilio integration
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    "*",
                    "0",
                    "#",
                  ].map((num) => (
                    <Button
                      key={num}
                      variant="outline"
                      className="h-12 text-lg font-semibold"
                      onClick={() => setPhoneNumber((prev) => prev + num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPhoneNumber("")}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() => {
                      // TODO: Integrate with Twilio API
                      alert(
                        `Dialing ${phoneNumber}... (Twilio integration pending)`,
                      );
                    }}
                    className="flex-1"
                    disabled={!phoneNumber.trim()}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Dial
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Log Tab */}
        <TabsContent value="calls" className="space-y-4">
          {/* Call Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{callLogs.length}</div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  AI Handled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {callLogs.filter((c) => c.aiHandled).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(
                    (callLogs.filter((c) => c.aiHandled).length /
                      callLogs.length) *
                    100
                  ).toFixed(0)}
                  % of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Voicemails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {callLogs.filter((c) => c.status === "voicemail").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Unread</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(
                    callLogs.reduce((sum, c) => sum + c.duration, 0) /
                      callLogs.length /
                      60,
                  )}
                  m
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per call</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All inbound and outbound calls with AI handling
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={callColumns}
                data={callLogs}
                searchColumn="clientName"
                searchPlaceholder="Search calls..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voicemail Tab */}
        <TabsContent value="voicemail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voicemail</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All voicemail messages from missed calls
              </p>
            </CardHeader>
            <CardContent>
              {voicemails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No voicemails
                </div>
              ) : (
                <DataTable
                  columns={callColumns}
                  data={voicemails}
                  searchColumn="clientName"
                  searchPlaceholder="Search voicemails..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routing Tab */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Call Routing Rules</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure how incoming calls are handled
                  </p>
                </div>
                <Button onClick={() => setShowRoutingModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={routingColumns}
                data={routingRules}
                searchColumn="name"
                searchPlaceholder="Search routing rules..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog
        open={showCallDetailsModal}
        onOpenChange={setShowCallDetailsModal}
      >
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedCall && (
            <CallDetailsModal
              call={selectedCall}
              onClose={() => {
                setShowCallDetailsModal(false);
                setSelectedCall(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRoutingModal} onOpenChange={setShowRoutingModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <RoutingRuleModal onClose={() => setShowRoutingModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
