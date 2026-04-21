"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Clock, CalendarClock, ChevronRight } from "lucide-react";

import { type BookingRequest } from "@/data/booking-requests";
import { useBookingRequestsStore } from "@/hooks/use-booking-requests";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { clients as allClients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import type { Client } from "@/types/client";
import type { NewBooking } from "@/types/booking";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
type BookingRequestsPanelVariant = "card" | "dropdown";

export interface BookingRequestsPanelProps {
  /** Default: "card" (for dashboard pages). Use "dropdown" for top-bar popovers. */
  variant?: BookingRequestsPanelVariant;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function servicesLabel(services: BookingRequest["services"]) {
  return services.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ");
}

export function BookingRequestsPanel({
  variant = "card",
}: BookingRequestsPanelProps) {
  const router = useRouter();
  const facilityId = 11;
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

  const pending = React.useMemo(
    () =>
      requests.filter(
        (r) => r.facilityId === facilityId && r.status === "pending",
      ),
    [requests, facilityId],
  );
  // Default sort (matches MoeGo expectation: newest submitted first)
  const sorted = React.useMemo(
    () =>
      [...pending].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [pending],
  );

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

  const applyConfirm = () => {
    if (!confirmTarget) return;
    const action = confirmAction;
    const target = confirmTarget;

    // 1) Apply the action outcome
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

    // 2) Close confirm and open post-action notification chooser
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
      label: "Submitted",
      icon: Clock,
      sortable: true,
      sortValue: (r) => +new Date(r.createdAt),
      render: (r) => (
        <div className="text-xs">{formatDateTime(r.createdAt)}</div>
      ),
    },
    {
      key: "appointmentAt",
      label: "Appointment",
      icon: CalendarClock,
      sortable: true,
      sortValue: (r) => +new Date(r.appointmentAt),
      render: (r) => (
        <div className="text-xs">{formatDateTime(r.appointmentAt)}</div>
      ),
    },
    {
      key: "customer",
      label: "Customer / Pet",
      sortable: false,
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.clientName}</div>
          <div className="text-muted-foreground truncate text-xs">
            {r.petName}
          </div>
        </div>
      ),
    },
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
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: () => <Badge variant="warning">Pending</Badge>,
    },
  ];

  const header = (
    <div className="flex flex-row items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="text-base leading-none font-semibold tracking-tight">
          Booking Requests
        </div>
        <div className="text-muted-foreground text-xs">
          Act quickly on new requests
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/facility/dashboard/online-booking")}
          className="gap-1"
        >
          View all
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );

  const table = (
    <DataTable
      data={sorted}
      columns={columns}
      itemsPerPage={variant === "dropdown" ? 3 : 5}
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
            To Waitlist
          </Button>
        </div>
      )}
    />
  );

  return (
    <>
      {variant === "card" ? (
        <Card>
          <CardHeader>{header}</CardHeader>
          <CardContent>{table}</CardContent>
        </Card>
      ) : (
        <div className="p-4">
          {header}
          <div className="mt-3">{table}</div>
        </div>
      )}

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
              <RadioGroupItem id="post-notify-none" value="none" />
              <Label htmlFor="post-notify-none">None</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="post-notify-text" value="text" />
              <Label htmlFor="post-notify-text">Send text</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="post-notify-email" value="email" />
              <Label htmlFor="post-notify-email">Send email</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="post-notify-both" value="both" />
              <Label htmlFor="post-notify-both">Send text + email</Label>
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
    </>
  );
}
