"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BOARDING_BOOKING_REQUESTS,
  BoardingBookingRequest,
} from "@/data/boarding-ops";
import { BoardingOpsRequestsTable } from "@/components/boarding/ops/BoardingOpsRequestsTable";
import { BoardingRequestDialog } from "@/components/boarding/ops/BoardingRequestDialog";
import { Bell, ClipboardList, ShieldAlert, AlertTriangle } from "lucide-react";

export default function BoardingOpsPage() {
  const [requests, setRequests] = useState<BoardingBookingRequest[]>(
    BOARDING_BOOKING_REQUESTS,
  );
  const [selected, setSelected] = useState<BoardingBookingRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === "new").length;
    const inReview = requests.filter((r) => r.status === "in-review").length;
    const preCheckMissing = requests.filter(
      (r) => r.preCheck.status === "not-submitted",
    ).length;
    const corrections = requests.filter(
      (r) => r.preCheck.status === "corrections-requested",
    ).length;
    return { pending, inReview, preCheckMissing, corrections };
  }, [requests]);

  const openRequest = (req: BoardingBookingRequest) => {
    setSelected(req);
    setDialogOpen(true);
  };

  const updateRequest = (next: BoardingBookingRequest) => {
    setRequests((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Boarding Ops</h2>
          <p className="text-sm text-muted-foreground">
            Staff-only workflow: requests, eligibility checks, assignments, payments, and PreCheck.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button>
            <ClipboardList className="h-4 w-4 mr-2" />
            Create request
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New requests</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{counts.pending}</div>
            <Badge variant={counts.pending > 0 ? "warning" : "secondary"}>
              {counts.pending > 0 ? "Needs review" : "Clear"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In review</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{counts.inReview}</div>
            <Badge variant="secondary">Active</Badge>
          </CardContent>
        </Card>
        <Card className="border-warning/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PreCheck missing</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{counts.preCheckMissing}</div>
            <Badge variant="warning">Reminder</Badge>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Corrections</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{counts.corrections}</div>
            <Badge variant="destructive">Blocked</Badge>
          </CardContent>
        </Card>
      </div>

      {(counts.preCheckMissing > 0 || counts.corrections > 0) && (
        <Alert className="border-warning/40 bg-warning/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>PreCheck attention needed</AlertTitle>
          <AlertDescription>
            Some bookings are missing PreCheck or need corrections. Staff can manually fill and approve or request customer updates.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            Requests
            {counts.pending > 0 && <Badge variant="warning">{counts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="eligibility" className="flex items-center gap-2">
            Eligibility
            <ShieldAlert className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Booking Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <BoardingOpsRequestsTable
                requests={requests}
                onOpen={openRequest}
                onAccept={(r) => {
                  openRequest(r);
                }}
                onDecline={(r) => {
                  updateRequest({ ...r, status: "declined" });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Eligibility (per request)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Open a request to see detailed eligibility reasons and evaluation indicators per pet.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BoardingRequestDialog
        open={dialogOpen}
        request={selected}
        onOpenChange={setDialogOpen}
        onUpdateRequest={updateRequest}
      />
    </div>
  );
}

