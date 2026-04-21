"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CalendarClock, Clock, ShoppingCart } from "lucide-react";

import { type BookingRequest } from "@/data/booking-requests";
import { getUnfinishedBookingsForFacility } from "@/data/unfinished-bookings";
import { useBookingRequestsStore } from "@/hooks/use-booking-requests";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { clients as allClients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { buildResumePreselection } from "@/lib/resume-booking";
import type { Client } from "@/types/client";
import type { NewBooking } from "@/types/booking";
import type { UnfinishedBooking } from "@/types/unfinished-booking";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { UnfinishedBookingsTable } from "@/components/bookings/UnfinishedBookingsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type NotifyMode = "none" | "text" | "email" | "both";
type ConfirmAction = "decline" | "waitlist";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function servicesLabel(services: BookingRequest["services"]) {
  return services.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ");
}

export default function OnlineBookingPage() {
  const facilityId = 11;
  const router = useRouter();
  const { requests, setRequests } = useBookingRequestsStore();
  const { openBookingModal, closeBookingModal } = useBookingModal();
  const facility = React.useMemo(
    () => facilities.find((f) => f.id === facilityId),
    [facilityId],
  );
  const facilityClients = React.useMemo<Client[]>(
    () =>
      (allClients as Client[]).filter((c) => c.facility === facility?.name),
    [facility],
  );

  const facilityRequests = React.useMemo(
    () => requests.filter((r) => r.facilityId === facilityId),
    [requests, facilityId],
  );

  const pending = React.useMemo(
    () => facilityRequests.filter((r) => r.status === "pending"),
    [facilityRequests],
  );

  const waitlisted = React.useMemo(
    () => facilityRequests.filter((r) => r.status === "waitlisted"),
    [facilityRequests],
  );

  const unfinishedBookings = React.useMemo(
    () => getUnfinishedBookingsForFacility(facilityId),
    [facilityId],
  );

  const abandonedCount = React.useMemo(
    () => unfinishedBookings.filter((b) => b.status === "abandoned").length,
    [unfinishedBookings],
  );

  const [activeTab, setActiveTab] = React.useState<
    "requests" | "waitlist" | "unfinished" | "settings"
  >("requests");

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] =
    React.useState<ConfirmAction>("decline");
  const [confirmTarget, setConfirmTarget] =
    React.useState<BookingRequest | null>(null);

  const [postActionOpen, setPostActionOpen] = React.useState(false);
  const [postActionType, setPostActionType] =
    React.useState<ConfirmAction>("decline");
  const [postActionTarget, setPostActionTarget] =
    React.useState<BookingRequest | null>(null);
  const [notifyMode, setNotifyMode] = React.useState<NotifyMode>("none");

  const openConfirm = (action: ConfirmAction, req: BookingRequest) => {
    setConfirmAction(action);
    setConfirmTarget(req);
    setConfirmOpen(true);
  };

  const schedule = (req: BookingRequest) => {
    if (!facility) return;

    const handleCreateBooking = (booking: NewBooking) => {
      // Mark the request as scheduled so it leaves the pending/waitlist queues.
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, status: "scheduled" } : r,
        ),
      );

      const notifyBits: string[] = [];
      if (booking.notificationEmail) notifyBits.push("email");
      if (booking.notificationSMS) notifyBits.push("SMS");
      const notifyDesc =
        notifyBits.length > 0
          ? `Confirmation sent via ${notifyBits.join(" + ")} to ${req.clientName}`
          : "No customer notification sent (disabled in wizard)";

      toast.success(`Booking scheduled for ${req.petName}`, {
        description: notifyDesc,
      });

      closeBookingModal();
    };

    openBookingModal({
      clients: facilityClients,
      facilityId,
      facilityName: facility.name,
      preSelectedClientId: req.clientId,
      preSelectedPetId: req.petId,
      preSelectedService: req.services[0],
      preSelectedStartDate: req.startDate,
      preSelectedEndDate: req.endDate,
      preSelectedCheckInTime: req.checkInTime,
      preSelectedCheckOutTime: req.checkOutTime,
      preSelectedDaycareDates: req.daycareDates,
      preSelectedRoomId: req.roomPreference,
      preSelectedDaycareSectionId: req.daycareSectionId,
      preSelectedExtraServices: req.extraServices,
      preSelectedFeedingSchedule: req.feedingSchedule,
      preSelectedMedications: req.medications,
      preSelectedNotificationEmail: req.notificationEmail,
      preSelectedNotificationSMS: req.notificationSMS,
      onCreateBooking: handleCreateBooking,
    });
  };

  const handleScheduleUnfinished = (ub: UnfinishedBooking) => {
    if (!facility) return;

    // When the session was started by an existing client, take the staff member
    // to the client's account and resume the wizard from there — that's where
    // they verify documents, vaccines, and card on file before confirming.
    if (ub.clientId) {
      toast.info(`Opening ${ub.clientName}'s account — resuming their booking`);
      router.push(
        `/facility/dashboard/clients/${ub.clientId}?resumeBooking=${ub.id}`,
      );
      return;
    }

    // Guest session — we have no customer profile yet, so open the wizard
    // inline with whatever the prospect entered.
    const preselection = buildResumePreselection(ub);
    toast.info(
      `Resuming ${ub.clientName}'s abandoned session (guest — no account yet)`,
    );
    openBookingModal({
      clients: facilityClients,
      facilityId,
      facilityName: facility.name,
      ...preselection,
      onCreateBooking: () => {
        toast.success(`Booking completed for ${ub.clientName}`);
        closeBookingModal();
      },
    });
  };

  const applyConfirm = () => {
    if (!confirmTarget) return;
    const action = confirmAction;
    const target = confirmTarget;

    if (action === "decline") {
      // MoeGo behavior: declining removes the request.
      setRequests((prev) => prev.filter((r) => r.id !== target.id));
    } else {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === target.id ? { ...r, status: "waitlisted" } : r,
        ),
      );
    }

    // Confirm -> Notify step
    setConfirmOpen(false);
    setPostActionType(action);
    setPostActionTarget(target);
    setNotifyMode("none");
    setPostActionOpen(true);
  };

  const completePostAction = () => {
    if (!postActionTarget) return;
    toast.success(
      postActionType === "decline" ? "Request declined" : "Moved to waitlist",
      {
        description:
          notifyMode === "none"
            ? "No customer message sent"
            : notifyMode === "both"
              ? "Send text + email"
              : notifyMode === "text"
                ? "Send text"
                : "Send email",
      },
    );
    setPostActionOpen(false);
    setPostActionTarget(null);
  };

  const columns: ColumnDef<BookingRequest>[] = [
    {
      key: "createdAt",
      label: "Submit date & time",
      icon: Clock,
      sortable: true,
      sortValue: (r) => +new Date(r.createdAt),
      render: (r) => (
        <div className="text-xs">{formatDateTime(r.createdAt)}</div>
      ),
    },
    {
      key: "appointmentAt",
      label: "Appt date & time",
      icon: CalendarClock,
      sortable: true,
      sortValue: (r) => +new Date(r.appointmentAt),
      render: (r) => (
        <div className="text-xs">{formatDateTime(r.appointmentAt)}</div>
      ),
    },
    {
      key: "clientName",
      label: "Client name",
      sortable: true,
      sortValue: (r) => r.clientName.toLowerCase(),
      render: (r) => <div className="text-sm font-medium">{r.clientName}</div>,
    },
    {
      key: "clientContact",
      label: "Contact",
      sortable: false,
      render: (r) => (
        <div className="text-muted-foreground text-xs">{r.clientContact}</div>
      ),
    },
    {
      key: "petName",
      label: "Pet",
      sortable: true,
      sortValue: (r) => r.petName.toLowerCase(),
      render: (r) => <div className="text-sm">{r.petName}</div>,
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Booking Requests</h2>
        <p className="text-muted-foreground">
          Manage incoming requests, waiting list, and unfinished bookings
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            Booking requests
            <Badge
              variant={pending.length > 0 ? "warning" : "secondary"}
              className="ml-1"
            >
              {pending.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="flex items-center gap-2">
            Waiting list
            <Badge variant="secondary" className="ml-1">
              {waitlisted.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unfinished" className="flex items-center gap-2">
            <ShoppingCart className="size-3.5" />
            Unfinished
            <Badge
              variant={abandonedCount > 0 ? "warning" : "secondary"}
              className="ml-1"
            >
              {abandonedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="settings">Setting</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Booking requests</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={[...pending].sort(
                  (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
                )}
                columns={[
                  ...columns,
                  {
                    key: "services",
                    label: "Service(s)",
                    sortable: false,
                    render: (r) => (
                      <div className="text-muted-foreground text-xs">
                        {servicesLabel(r.services)}
                      </div>
                    ),
                  },
                ]}
                itemsPerPage={10}
                getSearchValue={(r) =>
                  `${r.clientName} ${r.clientContact} ${r.petName} ${r.services.join(" ")}`.toLowerCase()
                }
                searchPlaceholder="Search by client, contact, pet..."
                actions={(r) => (
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" onClick={() => schedule(r)}>
                      Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openConfirm("decline", r)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openConfirm("waitlist", r)}
                    >
                      To waitlist
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waitlist" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Waiting list</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={[...waitlisted].sort(
                  (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
                )}
                columns={[
                  ...columns,
                  {
                    key: "services",
                    label: "Service(s)",
                    sortable: false,
                    render: (r) => (
                      <div className="text-muted-foreground text-xs">
                        {servicesLabel(r.services)}
                      </div>
                    ),
                  },
                ]}
                itemsPerPage={10}
                getSearchValue={(r) =>
                  `${r.clientName} ${r.clientContact} ${r.petName} ${r.services.join(" ")}`.toLowerCase()
                }
                searchPlaceholder="Search by client, contact, pet..."
                actions={(r) => (
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" onClick={() => schedule(r)}>
                      Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openConfirm("decline", r)}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unfinished" className="mt-4">
          <UnfinishedBookingsTable
            data={unfinishedBookings}
            onSchedule={handleScheduleUnfinished}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Booking request settings
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Settings UI isn’t required for this task; this tab is a
              placeholder for the booking request settings flow.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "decline"
                ? "Decline request?"
                : "Move to waitlist?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will update the request immediately. You can choose
              whether to notify the customer on the next step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={postActionOpen}
        onOpenChange={(o) => {
          setPostActionOpen(o);
          if (!o) setPostActionTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notify customer?</AlertDialogTitle>
            <AlertDialogDescription>
              {postActionTarget
                ? `Choose how to notify ${postActionTarget.clientName} (${postActionTarget.clientContact}).`
                : "Choose how to notify the customer."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <RadioGroup
            value={notifyMode}
            onValueChange={(v) => setNotifyMode(v as NotifyMode)}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id="post-notify-none-online" value="none" />
              <Label htmlFor="post-notify-none-online">None</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="post-notify-text-online" value="text" />
              <Label htmlFor="post-notify-text-online">Send text</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="post-notify-email-online" value="email" />
              <Label htmlFor="post-notify-email-online">Send email</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="post-notify-both-online" value="both" />
              <Label htmlFor="post-notify-both-online">Send text + email</Label>
            </div>
          </RadioGroup>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={completePostAction}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
