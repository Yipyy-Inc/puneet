"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Clock } from "lucide-react";

import { type BookingRequest } from "@/data/booking-requests";
import { useBookingRequestsStore } from "@/hooks/use-booking-requests";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

type NotifyMode = "none" | "text" | "email" | "both";
type ConfirmAction = "decline" | "waitlist";

const SCHEDULE_DRAFT_KEY = "booking_requests_schedule_draft";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function servicesLabel(services: BookingRequest["services"]) {
  return services
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(", ");
}

export default function OnlineBookingPage() {
  const router = useRouter();
  const facilityId = 11;
  const { requests, setRequests } = useBookingRequestsStore();

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

  const [activeTab, setActiveTab] = React.useState<"requests" | "waitlist" | "settings">(
    "requests",
  );
  const [selected, setSelected] = React.useState<BookingRequest | null>(null);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>("decline");
  const [confirmTarget, setConfirmTarget] = React.useState<BookingRequest | null>(null);

  const [postActionOpen, setPostActionOpen] = React.useState(false);
  const [postActionType, setPostActionType] = React.useState<ConfirmAction>("decline");
  const [postActionTarget, setPostActionTarget] = React.useState<BookingRequest | null>(null);
  const [notifyMode, setNotifyMode] = React.useState<NotifyMode>("none");

  const openConfirm = (action: ConfirmAction, req: BookingRequest) => {
    setConfirmAction(action);
    setConfirmTarget(req);
    setConfirmOpen(true);
  };

  const schedule = (req: BookingRequest) => {
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
    toast.success("Opened booking details for scheduling");
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
        prev.map((r) => (r.id === target.id ? { ...r, status: "waitlisted" } : r)),
      );
    }

    // Close the drawer if it was showing this request
    setSelected((prev) => (prev?.id === target.id ? null : prev));

    // Confirm -> Notify step
    setConfirmOpen(false);
    setPostActionType(action);
    setPostActionTarget(target);
    setNotifyMode("none");
    setPostActionOpen(true);
  };

  const completePostAction = () => {
    if (!postActionTarget) return;
    toast.success(postActionType === "decline" ? "Request declined" : "Moved to waitlist", {
      description:
        notifyMode === "none"
          ? "No customer message sent"
          : notifyMode === "both"
            ? "Send text + email"
            : notifyMode === "text"
              ? "Send text"
              : "Send email",
    });
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
      render: (r) => <div className="text-xs">{formatDateTime(r.createdAt)}</div>,
    },
    {
      key: "appointmentAt",
      label: "Appt date & time",
      icon: CalendarClock,
      sortable: true,
      sortValue: (r) => +new Date(r.appointmentAt),
      render: (r) => <div className="text-xs">{formatDateTime(r.appointmentAt)}</div>,
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
      render: (r) => <div className="text-xs text-muted-foreground">{r.clientContact}</div>,
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
        <h2 className="text-3xl font-bold tracking-tight">Online booking</h2>
        <p className="text-muted-foreground">Booking requests &amp; waiting list</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            Booking requests
            <Badge variant={pending.length > 0 ? "warning" : "secondary"} className="ml-1">
              {pending.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="flex items-center gap-2">
            Waiting list
            <Badge variant="secondary" className="ml-1">
              {waitlisted.length}
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
                data={[...pending].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))}
                columns={[
                  ...columns,
                  {
                    key: "services",
                    label: "Service(s)",
                    sortable: false,
                    render: (r) => (
                      <div className="text-xs text-muted-foreground">{servicesLabel(r.services)}</div>
                    ),
                  },
                ]}
                itemsPerPage={10}
                onRowClick={(r) => setSelected(r)}
                rowClassName={() => "cursor-pointer"}
                getSearchValue={(r) =>
                  `${r.clientName} ${r.clientContact} ${r.petName} ${r.services.join(" ")}`.toLowerCase()
                }
                searchPlaceholder="Search by client, contact, pet..."
                actions={(r) => (
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" onClick={() => schedule(r)}>
                      Schedule
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openConfirm("decline", r)}>
                      Decline
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openConfirm("waitlist", r)}>
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
                data={[...waitlisted].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))}
                columns={[
                  ...columns,
                  {
                    key: "services",
                    label: "Service(s)",
                    sortable: false,
                    render: (r) => (
                      <div className="text-xs text-muted-foreground">{servicesLabel(r.services)}</div>
                    ),
                  },
                ]}
                itemsPerPage={10}
                onRowClick={(r) => setSelected(r)}
                rowClassName={() => "cursor-pointer"}
                getSearchValue={(r) =>
                  `${r.clientName} ${r.clientContact} ${r.petName} ${r.services.join(" ")}`.toLowerCase()
                }
                searchPlaceholder="Search by client, contact, pet..."
                actions={(r) => (
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" onClick={() => schedule(r)}>
                      Schedule
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openConfirm("decline", r)}>
                      Decline
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Online booking settings</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Settings UI isn’t required for this task; this tab is a placeholder for the online booking settings flow.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Booking request</SheetTitle>
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
                  {selected.status === "pending" && (
                    <Button className="flex-1" variant="outline" onClick={() => openConfirm("waitlist", selected)}>
                      To waitlist
                    </Button>
                  )}
                  <Button className="flex-1" variant="outline" onClick={() => openConfirm("decline", selected)}>
                    Decline
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
              This action will update the request immediately. You can choose whether to notify the customer on the next step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyConfirm}>Confirm</AlertDialogAction>
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

          <RadioGroup value={notifyMode} onValueChange={(v) => setNotifyMode(v as NotifyMode)}>
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
            <AlertDialogAction onClick={completePostAction}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

