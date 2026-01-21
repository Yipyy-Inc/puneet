"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Clock, CalendarClock, ChevronRight } from "lucide-react";

import { BOOKING_REQUESTS, type BookingRequest } from "@/data/booking-requests";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

type SortMode = "submitted_desc" | "appointment_asc";
type NotifyMode = "none" | "text" | "email" | "both";
type ConfirmAction = "decline" | "waitlist";

const SCHEDULE_DRAFT_KEY = "booking_requests_schedule_draft";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function servicesLabel(services: BookingRequest["services"]) {
  return services
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(", ");
}

export function BookingRequestsPanel() {
  const router = useRouter();
  const [requests, setRequests] = React.useState<BookingRequest[]>(
    BOOKING_REQUESTS.filter((r) => r.facilityId === 11),
  );

  const [sortMode, setSortMode] = React.useState<SortMode>("submitted_desc");
  const sorted = React.useMemo(() => {
    const data = requests.filter((r) => r.status === "pending");
    if (sortMode === "submitted_desc") {
      return [...data].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return [...data].sort((a, b) => +new Date(a.appointmentAt) - +new Date(b.appointmentAt));
  }, [requests, sortMode]);

  const [selected, setSelected] = React.useState<BookingRequest | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>("decline");
  const [confirmTarget, setConfirmTarget] = React.useState<BookingRequest | null>(null);
  const [notifyMode, setNotifyMode] = React.useState<NotifyMode>("none");

  const openConfirm = (action: ConfirmAction, req: BookingRequest) => {
    setConfirmAction(action);
    setConfirmTarget(req);
    setNotifyMode("none");
    setConfirmOpen(true);
  };

  const schedule = (req: BookingRequest) => {
    // Frontend-only: store a draft and navigate to bookings page to edit/save.
    localStorage.setItem(
      SCHEDULE_DRAFT_KEY,
      JSON.stringify({
        requestId: req.id,
        clientId: req.clientId,
        petId: req.petId,
        service: req.services[0],
        appointmentAt: req.appointmentAt,
      }),
    );
    router.push("/facility/dashboard/bookings");
    toast.success("Opened booking for scheduling");
  };

  const applyConfirm = () => {
    if (!confirmTarget) return;
    const nextStatus = confirmAction === "decline" ? "declined" : "waitlisted";
    setRequests((prev) =>
      prev.map((r) => (r.id === confirmTarget.id ? { ...r, status: nextStatus } : r)),
    );
    toast.success(
      confirmAction === "decline" ? "Request declined" : "Moved to waitlist",
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
    setConfirmOpen(false);
  };

  const columns: ColumnDef<BookingRequest>[] = [
    {
      key: "createdAt",
      label: "Submitted",
      icon: Clock,
      sortable: false,
      render: (r) => <div className="text-xs">{formatDateTime(r.createdAt)}</div>,
    },
    {
      key: "appointmentAt",
      label: "Appointment",
      icon: CalendarClock,
      sortable: false,
      render: (r) => <div className="text-xs">{formatDateTime(r.appointmentAt)}</div>,
    },
    {
      key: "customer",
      label: "Customer / Pet",
      sortable: false,
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.clientName}</div>
          <div className="truncate text-xs text-muted-foreground">{r.petName}</div>
        </div>
      ),
    },
    {
      key: "services",
      label: "Service(s)",
      sortable: false,
      render: (r) => (
        <div className="text-xs text-muted-foreground">{servicesLabel(r.services)}</div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: () => <Badge variant="warning">Pending</Badge>,
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Booking Requests</CardTitle>
            <div className="text-xs text-muted-foreground">
              Act quickly on new requests
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_desc">Submitted (newest first)</SelectItem>
                <SelectItem value="appointment_asc">Appointment (soonest first)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/facility/dashboard/bookings")}
              className="gap-1"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={sorted}
            columns={columns}
            itemsPerPage={5}
            onRowClick={(r) => setSelected(r)}
            rowClassName={() => "cursor-pointer"}
            actions={(r) => (
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" onClick={() => schedule(r)}>
                  Schedule
                </Button>
                <Button size="sm" variant="outline" onClick={() => openConfirm("decline", r)}>
                  Decline
                </Button>
                <Button size="sm" variant="outline" onClick={() => openConfirm("waitlist", r)}>
                  To Waitlist
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Booking Request</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Submitted</div>
                  <div className="text-sm font-medium">{formatDateTime(selected.createdAt)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Requested appointment</div>
                  <div className="text-sm font-medium">{formatDateTime(selected.appointmentAt)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Customer / Pet</div>
                  <div className="text-sm font-medium">
                    {selected.clientName} — {selected.petName}
                  </div>
                  <div className="text-xs text-muted-foreground">{selected.clientContact}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Service(s)</div>
                  <div className="text-sm font-medium">{servicesLabel(selected.services)}</div>
                </div>
                {selected.notes && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Notes</div>
                    <div className="text-sm">{selected.notes}</div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => schedule(selected)}>
                    Schedule
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => openConfirm("decline", selected)}
                  >
                    Decline
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => openConfirm("waitlist", selected)}
                  >
                    To Waitlist
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "decline" ? "Decline request?" : "Move to waitlist?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose how to notify the customer after this action.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <RadioGroup value={notifyMode} onValueChange={(v) => setNotifyMode(v as NotifyMode)}>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="notify-none" value="none" />
              <Label htmlFor="notify-none">None</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="notify-text" value="text" />
              <Label htmlFor="notify-text">Send text</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="notify-email" value="email" />
              <Label htmlFor="notify-email">Send email</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="notify-both" value="both" />
              <Label htmlFor="notify-both">Send text + email</Label>
            </div>
          </RadioGroup>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

