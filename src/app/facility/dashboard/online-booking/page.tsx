"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Hourglass,
  Search,
  CheckCircle2,
  XCircle,
  X,
  LayoutGrid,
  Sun,
  Bed,
  Scissors,
  GraduationCap,
} from "lucide-react";

import { type BookingRequest } from "@/data/booking-requests";
import { getUnfinishedBookingsForFacility } from "@/data/unfinished-bookings";
import { useBookingRequestsStore } from "@/hooks/use-booking-requests";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { clients as allClients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { buildResumePreselection } from "@/lib/resume-booking";
import type { Client } from "@/types/client";
import type { NewBooking } from "@/types/booking";
import type {
  UnfinishedBooking,
} from "@/types/unfinished-booking";
import type { BookingRequestService } from "@/types/booking";
import { UnfinishedBookingsTable } from "@/components/bookings/UnfinishedBookingsTable";
import { BookingRequestCard } from "@/components/facility/BookingRequestCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

type NotifyMode = "none" | "text" | "email" | "both";
type ConfirmAction = "decline" | "waitlist";
type ServiceFilter = "all" | BookingRequestService;

const SERVICE_FILTERS: {
  value: ServiceFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "daycare", label: "Daycare", icon: Sun },
  { value: "boarding", label: "Boarding", icon: Bed },
  { value: "grooming", label: "Grooming", icon: Scissors },
  { value: "training", label: "Training", icon: GraduationCap },
];

function matchesQuery(r: BookingRequest, q: string): boolean {
  if (!q) return true;
  const hay =
    `${r.clientName} ${r.clientContact} ${r.petName} ${r.services.join(" ")} ${r.notes ?? ""}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function matchesService(r: BookingRequest, f: ServiceFilter): boolean {
  return f === "all" || r.services.includes(f);
}

function FilterBar({
  search,
  onSearchChange,
  serviceFilter,
  onServiceFilterChange,
  counts,
  total,
  shown,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  serviceFilter: ServiceFilter;
  onServiceFilterChange: (v: ServiceFilter) => void;
  counts: Record<ServiceFilter, number>;
  total: number;
  shown: number;
}) {
  const isFiltered = search.length > 0 || serviceFilter !== "all";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by client, pet, contact..."
            className="h-9 px-9"
          />
          {search && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onSearchChange("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-7 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {SERVICE_FILTERS.map((f) => {
            const Icon = f.icon;
            const active = serviceFilter === f.value;
            const count = counts[f.value];
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => onServiceFilterChange(f.value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 ease-out",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {f.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "tabular-nums",
                      active
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onServiceFilterChange("all");
            }}
            className="text-muted-foreground hover:text-foreground inline-flex h-8 shrink-0 items-center gap-1 text-xs font-medium transition-colors"
          >
            <X className="size-3.5" />
            Clear · {shown}/{total}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="bg-muted/60 text-muted-foreground mb-4 flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-6" />
      </div>
      <div className="text-foreground text-base font-semibold">{title}</div>
      <div className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </div>
    </div>
  );
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

  const [search, setSearch] = React.useState("");
  const [serviceFilter, setServiceFilter] =
    React.useState<ServiceFilter>("all");

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

  const handleScheduleUnfinished = (ub: UnfinishedBooking) => {
    if (!facility) return;

    if (ub.clientId) {
      toast.info(`Opening ${ub.clientName}'s account — resuming their booking`);
      router.push(
        `/facility/dashboard/clients/${ub.clientId}?resumeBooking=${ub.id}`,
      );
      return;
    }

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
      setRequests((prev) => prev.filter((r) => r.id !== target.id));
    } else {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === target.id ? { ...r, status: "waitlisted" } : r,
        ),
      );
    }

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

  const filteredPending = React.useMemo(
    () =>
      [...pending]
        .filter(
          (r) => matchesQuery(r, search) && matchesService(r, serviceFilter),
        )
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [pending, search, serviceFilter],
  );

  const filteredWaitlisted = React.useMemo(
    () =>
      [...waitlisted]
        .filter(
          (r) => matchesQuery(r, search) && matchesService(r, serviceFilter),
        )
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [waitlisted, search, serviceFilter],
  );

  const pendingServiceCounts = React.useMemo<Record<ServiceFilter, number>>(
    () => ({
      all: pending.length,
      daycare: pending.filter((r) => r.services.includes("daycare")).length,
      boarding: pending.filter((r) => r.services.includes("boarding")).length,
      grooming: pending.filter((r) => r.services.includes("grooming")).length,
      training: pending.filter((r) => r.services.includes("training")).length,
    }),
    [pending],
  );

  const waitlistedServiceCounts = React.useMemo<Record<ServiceFilter, number>>(
    () => ({
      all: waitlisted.length,
      daycare: waitlisted.filter((r) => r.services.includes("daycare")).length,
      boarding: waitlisted.filter((r) => r.services.includes("boarding"))
        .length,
      grooming: waitlisted.filter((r) => r.services.includes("grooming"))
        .length,
      training: waitlisted.filter((r) => r.services.includes("training"))
        .length,
    }),
    [waitlisted],
  );

  return (
    <div className="flex w-full max-w-none flex-1 flex-col gap-6 px-6 pt-6 pb-10 lg:px-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Booking Requests</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage incoming requests, waiting list, and unfinished bookings
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList className="flex w-full gap-2 px-0">
            {(
              [
                {
                  value: "requests",
                  label: "Booking requests",
                  count: pending.length,
                },
                {
                  value: "waitlist",
                  label: "Waiting list",
                  count: waitlisted.length,
                },
                {
                  value: "unfinished",
                  label: "Unfinished",
                  count: abandonedCount,
                },
                { value: "settings", label: "Settings", count: 0 },
              ] as const
            ).map((t) => {
              const active = activeTab === t.value;
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="group hover:-translate-y-px hover:text-foreground hover:bg-muted/50 active:translate-y-0 data-[state=active]:hover:bg-background relative transition-all duration-200 ease-out"
                >
                  <span className="transition-transform duration-200 group-data-[state=active]:scale-[1.01]">
                    {t.label}
                  </span>
                  {t.count > 0 && (
                    <span
                      className={cn(
                        "ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums transition-all duration-300 ease-out",
                        active
                          ? "bg-primary/15 text-primary scale-105 shadow-[0_0_0_1px_var(--primary)]/0"
                          : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/15",
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                  <span
                    className={cn(
                      "bg-primary pointer-events-none absolute inset-x-3 -bottom-px h-0.5 origin-center rounded-full transition-transform duration-300 ease-out",
                      active ? "scale-x-100" : "scale-x-0",
                    )}
                    aria-hidden
                  />
                </TabsTrigger>
              );
            })}
          </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            serviceFilter={serviceFilter}
            onServiceFilterChange={setServiceFilter}
            counts={pendingServiceCounts}
            total={pending.length}
            shown={filteredPending.length}
          />
          {filteredPending.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={
                search
                  ? "No requests match your search"
                  : "Inbox zero — nicely done"
              }
              description={
                search
                  ? "Try a different name, pet, or service."
                  : "New booking requests from your online form will appear here in real time."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredPending.map((r) => (
                <BookingRequestCard
                  key={r.id}
                  request={r}
                  variant="pending"
                  onSchedule={schedule}
                  onDecline={(req) => openConfirm("decline", req)}
                  onWaitlist={(req) => openConfirm("waitlist", req)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="waitlist" className="mt-4 space-y-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            serviceFilter={serviceFilter}
            onServiceFilterChange={setServiceFilter}
            counts={waitlistedServiceCounts}
            total={waitlisted.length}
            shown={filteredWaitlisted.length}
          />
          {filteredWaitlisted.length === 0 ? (
            <EmptyState
              icon={Hourglass}
              title={
                search
                  ? "No waitlisted requests match"
                  : "Your waitlist is clear"
              }
              description={
                search
                  ? "Try a different search term."
                  : "When you move a request to the waitlist, it will show up here."
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredWaitlisted.map((r) => (
                <BookingRequestCard
                  key={r.id}
                  request={r}
                  variant="waitlist"
                  onSchedule={schedule}
                  onDecline={(req) => openConfirm("decline", req)}
                />
              ))}
            </div>
          )}
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
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  confirmAction === "decline"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/15 text-warning",
                )}
              >
                {confirmAction === "decline" ? (
                  <XCircle className="size-5" />
                ) : (
                  <Hourglass className="size-5" />
                )}
              </div>
              <div className="flex-1">
                <AlertDialogTitle>
                  {confirmAction === "decline"
                    ? "Decline this request?"
                    : "Move to waitlist?"}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {confirmAction === "decline"
                    ? "The request will be removed from your queue. You can choose to notify the customer on the next step."
                    : "This request will move to the waitlist. You can choose to notify the customer on the next step."}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={applyConfirm}
              className={cn(
                confirmAction === "decline"
                  ? "bg-destructive hover:bg-destructive/90 text-white"
                  : "bg-warning hover:bg-warning/90 text-warning-foreground",
              )}
            >
              {confirmAction === "decline" ? "Decline" : "Move to waitlist"}
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
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle>Notify the customer?</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {postActionTarget
                    ? `Choose how to notify ${postActionTarget.clientName} (${postActionTarget.clientContact}).`
                    : "Choose how to notify the customer."}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <RadioGroup
            value={notifyMode}
            onValueChange={(v) => setNotifyMode(v as NotifyMode)}
            className="grid grid-cols-2 gap-2"
          >
            {(
              [
                { v: "none", label: "Don't notify" },
                { v: "text", label: "Text only" },
                { v: "email", label: "Email only" },
                { v: "both", label: "Text + Email" },
              ] as { v: NotifyMode; label: string }[]
            ).map((opt) => (
              <Label
                key={opt.v}
                htmlFor={`post-notify-online-${opt.v}`}
                className={cn(
                  "border-border hover:border-primary/50 flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm transition-colors",
                  notifyMode === opt.v &&
                    "border-primary bg-primary/5 ring-primary/30 ring-2",
                )}
              >
                <RadioGroupItem
                  id={`post-notify-online-${opt.v}`}
                  value={opt.v}
                />
                {opt.label}
              </Label>
            ))}
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
