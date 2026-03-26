"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneForwarded,
  Voicemail,
  Play,
  AlertCircle,
  Settings,
  Plus,
  Zap,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Download,
  BarChart3,
  Radio,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Filter calls based on search
  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return callLogs;
    const query = searchQuery.toLowerCase();
    return callLogs.filter(
      (call) =>
        call.clientName?.toLowerCase().includes(query) ||
        call.from.toLowerCase().includes(query) ||
        call.to.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  // Get voicemails from call logs
  const voicemails = useMemo(
    () => callLogs.filter((c) => c.status === "voicemail"),
    [],
  );

  // Get missed calls
  const missedCalls = useMemo(
    () => callLogs.filter((c) => c.status === "missed"),
    [],
  );

  // Get calls with recordings
  const callsWithRecordings = useMemo(
    () => callLogs.filter((c) => c.recordingUrl),
    [],
  );

  // Call Log Columns
  const callColumns: ColumnDef<(typeof callLogs)[0]>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.type === "inbound" ? (
            <PhoneIncoming className="size-4 text-green-600" />
          ) : (
            <PhoneOutgoing className="size-4 text-blue-600" />
          )}
          <Badge
            variant={row.original.type === "inbound" ? "default" : "outline"}
          >
            {row.original.type === "inbound" ? "Inbound" : "Outbound"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "from",
      header: "Contact",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.clientName || "Unknown Caller"}
          </div>
          <div className="text-muted-foreground text-sm">
            {row.original.from}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        if (row.original.duration === 0)
          return <span className="text-muted-foreground">—</span>;
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
            {row.original.status === "missed" && (
              <PhoneOff className="mr-1 inline h-3 w-3" />
            )}
            {row.original.status === "voicemail" && (
              <Voicemail className="mr-1 inline h-3 w-3" />
            )}
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
              <Zap className="mr-1 inline h-3 w-3" />
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
      cell: ({ row }) => {
        const date = new Date(row.original.timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        return (
          <div className="text-sm">
            {isToday ? (
              <>
                <div className="font-medium">Today</div>
                <div className="text-muted-foreground">
                  {date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </>
            ) : (
              date.toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            )}
          </div>
        );
      },
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
                setSelectedCall(row.original);
                // In a real app, this would play the recording
                alert(`Playing call recording from ${row.original.from}...`);
              }}
              title="Play Recording"
            >
              <Play className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCall(row.original);
              setShowCallDetailsModal(true);
            }}
            title="View Details"
          >
            <AlertCircle className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Recording Columns (simplified)
  const recordingColumns: ColumnDef<(typeof callLogs)[0]>[] = [
    {
      accessorKey: "clientName",
      header: "Contact",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.clientName || "Unknown Caller"}
          </div>
          <div className="text-muted-foreground text-sm">
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
      accessorKey: "timestamp",
      header: "Recorded",
      cell: ({ row }) => new Date(row.original.timestamp).toLocaleString(),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCall(row.original);
              alert(`Playing recording...`);
            }}
          >
            <Play className="mr-2 size-4" />
            Play
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              alert(`Downloading recording...`);
            }}
          >
            <Download className="size-4" />
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
          <Settings className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calling</h1>
          <p className="text-muted-foreground mt-1">
            Phone system dashboard for front desk and managers
          </p>
        </div>
      </div>

      {/* Live Status & Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Live Call Status */}
        <Card className="border-2 border-green-500/20 bg-green-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Radio className="size-4 animate-pulse text-green-600" />
              <CardTitle className="text-sm font-medium">
                System Status
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-muted-foreground mt-1 text-xs">
              All systems operational
            </p>
          </CardContent>
        </Card>

        {/* Missed Calls */}
        <Card
          className={
            missedCalls.length > 0
              ? "border-2 border-red-500/20 bg-red-50/50"
              : ""
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <PhoneOff className="size-4" />
              Missed Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${missedCalls.length > 0 ? `text-red-600` : ""} `}
            >
              {missedCalls.length}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Require attention
            </p>
          </CardContent>
        </Card>

        {/* New Voicemails */}
        <Card
          className={
            voicemails.length > 0
              ? "border-2 border-orange-500/20 bg-orange-50/50"
              : ""
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Voicemail className="size-4" />
              New Voicemails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${voicemails.length > 0 ? `text-orange-600` : ""} `}
            >
              {voicemails.length}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Unread messages
            </p>
          </CardContent>
        </Card>

        {/* Total Calls Today */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <PhoneCall className="size-4" />
              Calls Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                callLogs.filter((c) => {
                  const callDate = new Date(c.timestamp);
                  const today = new Date();
                  return callDate.toDateString() === today.toDateString();
                }).length
              }
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Inbound & outbound
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calling Tabs */}
      <Tabs defaultValue="dialer" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dialer">
            <Phone className="mr-2 size-4" />
            Dialer
          </TabsTrigger>
          <TabsTrigger value="calls">
            <PhoneCall className="mr-2 size-4" />
            Call Log
            {missedCalls.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {missedCalls.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="voicemail">
            <Voicemail className="mr-2 size-4" />
            Voicemail
            {voicemails.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {voicemails.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recordings">
            <Play className="mr-2 size-4" />
            Recordings
            {callsWithRecordings.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {callsWithRecordings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="routing">
            <PhoneForwarded className="mr-2 size-4" />
            Routing
          </TabsTrigger>
          <TabsTrigger value="analytics" disabled>
            <BarChart3 className="mr-2 size-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Dialer Tab */}
        <TabsContent value="dialer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dialer</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Make outbound calls using Twilio integration
              </p>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-md space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="text-lg"
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
                      className="h-14 text-xl font-semibold"
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
                    size="lg"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Dial
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Log Tab */}
        <TabsContent value="calls" className="space-y-4">
          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search by customer name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Call Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredCalls.length}</div>
                <p className="text-muted-foreground mt-1 text-xs">This month</p>
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
                  {filteredCalls.filter((c) => c.aiHandled).length}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {filteredCalls.length > 0
                    ? (
                        (filteredCalls.filter((c) => c.aiHandled).length /
                          filteredCalls.length) *
                        100
                      ).toFixed(0)
                    : 0}
                  % of total
                </p>
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
                  {filteredCalls.length > 0
                    ? Math.floor(
                        filteredCalls.reduce((sum, c) => sum + c.duration, 0) /
                          filteredCalls.length /
                          60,
                      )
                    : 0}
                  m
                </div>
                <p className="text-muted-foreground mt-1 text-xs">Per call</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  With Recordings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredCalls.filter((c) => c.recordingUrl).length}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">Available</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                All inbound and outbound calls with search by customer name or
                phone number
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={callColumns}
                data={filteredCalls}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Voicemail</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    All voicemail messages from missed calls
                  </p>
                </div>
                {voicemails.length > 0 && (
                  <Badge variant="destructive" className="px-3 py-1 text-lg">
                    {voicemails.length} New
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {voicemails.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Voicemail className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No voicemails</p>
                </div>
              ) : (
                <DataTable
                  columns={callColumns}
                  data={voicemails}
                  searchColumn="clientName"
                  searchPlaceholder="Search voicemails by name or number..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Recordings</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                All recorded calls available for playback and download
              </p>
            </CardHeader>
            <CardContent>
              {callsWithRecordings.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Play className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No recordings available</p>
                </div>
              ) : (
                <DataTable
                  columns={recordingColumns}
                  data={callsWithRecordings}
                  searchColumn="clientName"
                  searchPlaceholder="Search recordings..."
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
                  <p className="text-muted-foreground mt-1 text-sm">
                    Configure how incoming calls are handled and routed
                  </p>
                </div>
                <Button onClick={() => setShowRoutingModal(true)}>
                  <Plus className="mr-2 size-4" />
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

        {/* Analytics Tab (Placeholder) */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Analytics</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Detailed call metrics and insights (Coming soon)
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-12 text-center">
                <BarChart3 className="mx-auto mb-4 h-16 w-16 opacity-50" />
                <p>Call Analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog
        open={showCallDetailsModal}
        onOpenChange={setShowCallDetailsModal}
      >
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
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
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <RoutingRuleModal onClose={() => setShowRoutingModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
