"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Hourglass,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Sparkles,
  Truck,
  Clock,
  CalendarDays,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useGroomingWaitlist } from "@/hooks/use-grooming-waitlist";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { groomingQueries } from "@/lib/api/grooming";
import { findAvailableMatches } from "@/lib/grooming-waitlist-matcher";
import type {
  GroomingWaitlistEntry,
  GroomingWaitlistStatus,
  WaitlistExpectedDate,
  WaitlistExpectedTime,
} from "@/data/grooming-waitlist";
import { DAY_SHORT } from "@/lib/service-areas";

const STATUS_OPTIONS: { value: "all" | GroomingWaitlistStatus; label: string }[] =
  [
    { value: "all", label: "All statuses" },
    { value: "waiting", label: "Waiting" },
    { value: "offered", label: "Offered" },
    { value: "confirmed", label: "Confirmed" },
    { value: "expired", label: "Expired" },
  ];

const STATUS_CLASS: Record<GroomingWaitlistStatus, string> = {
  waiting:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  offered: "bg-sky-100 text-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
  confirmed:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
  expired:
    "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  removed:
    "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function blankEntry(): Omit<GroomingWaitlistEntry, "id" | "addedAt"> {
  // Default `date` to today so the legacy field is always populated; the
  // structured expectedDate variant below is what the matcher actually uses.
  const today = new Date().toISOString().split("T")[0];
  return {
    date: today,
    petName: "",
    petBreed: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    serviceName: "",
    preferredStylistIds: [],
    expectedDate: { kind: "asap" },
    expectedTime: { kind: "anytime" },
    validUntil: undefined,
    comment: "",
    source: "manual",
    status: "waiting",
  };
}

function ExpectedDatePicker({
  value,
  onChange,
}: {
  value: WaitlistExpectedDate;
  onChange: (next: WaitlistExpectedDate) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <Label className="text-xs flex items-center gap-1.5">
        <CalendarDays className="size-3.5" />
        Expected date
      </Label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(
          [
            { kind: "asap", label: "ASAP" },
            { kind: "specific-date", label: "Specific date" },
            { kind: "day-of-week", label: "Day of week" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.kind}
            type="button"
            onClick={() => {
              if (opt.kind === "asap") onChange({ kind: "asap" });
              else if (opt.kind === "specific-date")
                onChange({ kind: "specific-date", date: "" });
              else onChange({ kind: "day-of-week", daysOfWeek: [] });
            }}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px]",
              value.kind === opt.kind
                ? "border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value.kind === "specific-date" && (
        <Input
          type="date"
          value={value.date}
          onChange={(e) =>
            onChange({ kind: "specific-date", date: e.target.value })
          }
          className="mt-2 h-8 text-xs"
        />
      )}
      {value.kind === "day-of-week" && (
        <div className="mt-2 flex flex-wrap gap-1">
          {DAY_SHORT.map((label, dow) => {
            const checked = value.daysOfWeek.includes(dow);
            return (
              <button
                key={dow}
                type="button"
                onClick={() =>
                  onChange({
                    kind: "day-of-week",
                    daysOfWeek: checked
                      ? value.daysOfWeek.filter((d) => d !== dow)
                      : [...value.daysOfWeek, dow].sort((a, b) => a - b),
                  })
                }
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px]",
                  checked
                    ? "border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpectedTimePicker({
  value,
  onChange,
}: {
  value: WaitlistExpectedTime;
  onChange: (next: WaitlistExpectedTime) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <Label className="text-xs flex items-center gap-1.5">
        <Clock className="size-3.5" />
        Expected time
      </Label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(
          [
            { kind: "anytime", label: "Anytime" },
            { kind: "period", label: "Morning / Afternoon / Evening" },
            { kind: "exact-time", label: "Exact time" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.kind}
            type="button"
            onClick={() => {
              if (opt.kind === "anytime") onChange({ kind: "anytime" });
              else if (opt.kind === "period")
                onChange({ kind: "period", period: "morning" });
              else onChange({ kind: "exact-time", time: "10:00" });
            }}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px]",
              value.kind === opt.kind
                ? "border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value.kind === "period" && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(["morning", "afternoon", "evening"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ kind: "period", period: p })}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] capitalize",
                value.period === p
                  ? "border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      {value.kind === "exact-time" && (
        <Input
          type="time"
          value={value.time}
          onChange={(e) =>
            onChange({ kind: "exact-time", time: e.target.value })
          }
          className="mt-2 h-8 w-32 text-xs"
        />
      )}
    </div>
  );
}

function PreferredGroomerPicker({
  stylists,
  value,
  onChange,
}: {
  stylists: { id: string; name: string; status: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const isAnyone = value.length === 0;
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <Label className="text-xs">Preferred groomer</Label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11px]",
            isAnyone
              ? "border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          Anyone
        </button>
        {stylists
          .filter((s) => s.status === "active")
          .map((s) => {
            const checked = value.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  onChange(
                    checked
                      ? value.filter((id) => id !== s.id)
                      : [...value, s.id],
                  )
                }
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px]",
                  checked
                    ? "border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {s.name}
              </button>
            );
          })}
      </div>
    </div>
  );
}

export function WaitlistManagementPage() {
  const { entries, addEntry, setStatus, offerSlot } = useGroomingWaitlist();
  const { data: appointments = [] } = useQuery(groomingQueries.appointments());
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());
  const { data: packagesData = [] } = useQuery(groomingQueries.packages());
  const {
    enabled: mobileEnabled,
    certainAreaEnabled,
    staffSchedules,
    serviceAreas,
  } = useMobileGrooming();

  const [filterStatus, setFilterStatus] = useState<"all" | GroomingWaitlistStatus>(
    "all",
  );
  const [filterDate, setFilterDate] = useState<string>("");
  const [query, setQuery] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<
    Omit<GroomingWaitlistEntry, "id" | "addedAt">
  >(blankEntry);

  // Intelligent matching — for every "waiting" entry, find the earliest open
  // slot in the next week that satisfies its preferences. The result powers
  // the Available Now panel.
  const availableMatches = useMemo(
    () =>
      findAvailableMatches({
        entries,
        appointments,
        stylists: stylistsData,
        packages: packagesData,
        mobileEnabled,
        certainAreaEnabled,
        staffSchedules,
        serviceAreas,
      }),
    [
      entries,
      appointments,
      stylistsData,
      packagesData,
      mobileEnabled,
      certainAreaEnabled,
      staffSchedules,
      serviceAreas,
    ],
  );
  const availableIds = useMemo(
    () => new Set(availableMatches.map((m) => m.entry.id)),
    [availableMatches],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (filterStatus !== "all" && (e.status ?? "waiting") !== filterStatus)
          return false;
        if (filterDate && e.date !== filterDate) return false;
        if (q) {
          const hay = (
            e.petName +
            " " +
            e.ownerName +
            " " +
            e.serviceName +
            " " +
            e.ownerPhone
          ).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Date asc, then addedAt asc.
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.addedAt.localeCompare(b.addedAt);
      });
  }, [entries, filterStatus, filterDate, query]);

  const counts = useMemo(() => {
    const c: Record<GroomingWaitlistStatus, number> = {
      waiting: 0,
      offered: 0,
      confirmed: 0,
      expired: 0,
      removed: 0,
    };
    for (const e of entries) c[e.status ?? "waiting"] += 1;
    return c;
  }, [entries]);

  function saveNew() {
    if (!form.petName.trim() || !form.ownerName.trim()) {
      toast.error("Pet and owner are required");
      return;
    }
    // Derive the legacy `date` field from the structured preference for back-
    // compat with the calendar indicators.
    const today = new Date().toISOString().split("T")[0];
    const legacyDate =
      form.expectedDate?.kind === "specific-date"
        ? form.expectedDate.date
        : form.date || today;
    addEntry({
      ...form,
      date: legacyDate,
      id: `wl-${Date.now()}`,
      addedAt: new Date().toISOString(),
      status: "waiting",
    });
    toast.success(`Added ${form.petName} to the waitlist`);
    setAddOpen(false);
    setForm(blankEntry());
  }

  /**
   * Convert an Available Now match into a "Slot Offered" entry — same flow
   * the calendar's autoMatchAndOffer uses, exposed inline so managers don't
   * have to bounce out to the calendar to pull the trigger.
   */
  function offerMatch(matchId: string, startTime: string, endTime: string) {
    offerSlot(matchId, { startTime, endTime });
    toast.success("Slot offered — client has 2 hours to confirm.");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Hourglass className="size-6 text-amber-600" />
            Waitlist
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Across every date. New entries auto-match against freed slots when
            an appointment is cancelled or marked no-show.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add to Waitlist
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            "waiting",
            "offered",
            "confirmed",
            "expired",
          ] as GroomingWaitlistStatus[]
        ).map((s) => (
          <Card key={s}>
            <CardContent className="pt-5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {s}
              </p>
              <p className="mt-1 text-2xl font-bold">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Now — intelligent matches. Auto-refreshes whenever any
          input (appointments, schedules, entries) changes. */}
      <Card className="border-violet-300 bg-violet-50/40 dark:border-violet-900 dark:bg-violet-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-violet-900 dark:text-violet-200">
            <Sparkles className="size-4" />
            Available Now
            {availableMatches.length > 0 && (
              <Badge
                variant="secondary"
                className="border-0 bg-violet-200 text-violet-900 dark:bg-violet-800/60 dark:text-violet-100"
              >
                {availableMatches.length} match
                {availableMatches.length === 1 ? "" : "es"}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Waitlist clients with an open slot this week that fits every
            preference. Refreshes automatically when a cancellation opens a
            slot.
          </p>
        </CardHeader>
        <CardContent>
          {availableMatches.length === 0 ? (
            <p className="rounded-md border border-dashed bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
              No waitlist clients currently have a matching open slot. New
              cancellations will surface candidates here.
            </p>
          ) : (
            <ul className="space-y-2">
              {availableMatches.map(({ entry, slot, extraDrivingMinutes }) => {
                const isAlreadyOffered =
                  (entry.status ?? "waiting") === "offered";
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-300/70 bg-card px-3 py-2.5 shadow-sm dark:border-violet-800/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {entry.petName}
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          {entry.petBreed} · {entry.ownerName}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.serviceName}
                      </p>
                    </div>
                    <div className="text-xs">
                      <p className="font-medium tabular-nums text-violet-900 dark:text-violet-200">
                        {formatDateLong(slot.date)} ·{" "}
                        {slot.startTime}–{slot.endTime}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        with {slot.stylistName}
                      </p>
                    </div>
                    {extraDrivingMinutes !== undefined && (
                      <Badge
                        variant="secondary"
                        className="gap-1 border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
                        title="Estimated detour to insert this stop on the day's route"
                      >
                        <Truck className="size-3" />
                        +{extraDrivingMinutes}m drive
                      </Badge>
                    )}
                    {isAlreadyOffered ? (
                      <Badge className="border-0 bg-sky-100 text-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                        Offered
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
                        onClick={() =>
                          offerMatch(entry.id, slot.startTime, slot.endTime)
                        }
                      >
                        <Sparkles className="size-3" />
                        Offer Slot
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="size-3.5" />
              Filter
            </div>
            <Select
              value={filterStatus}
              onValueChange={(v) =>
                setFilterStatus(v as "all" | GroomingWaitlistStatus)
              }
            >
              <SelectTrigger className="h-8 min-w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-8 w-40 text-xs"
            />
            <Input
              type="text"
              placeholder="Search pet / owner / phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 max-w-xs text-xs"
            />
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {filtered.length} of {entries.length}
            </span>
          </div>
          <CardTitle className="text-base">Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Hourglass className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">
                No waitlist entries match these filters.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((e) => {
                const status = e.status ?? "waiting";
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {e.petName}
                        <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                          {e.petBreed}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {e.ownerName} · {e.ownerPhone}
                      </p>
                    </div>
                    <div className="text-xs">
                      <p className="font-medium">{e.serviceName}</p>
                      {e.preferredStylistName && (
                        <p className="text-muted-foreground">
                          Prefers {e.preferredStylistName}
                        </p>
                      )}
                    </div>
                    <div className="text-xs tabular-nums">
                      {formatDateLong(e.date)}
                    </div>
                    <Badge
                      className={cn(
                        "border-0 capitalize",
                        STATUS_CLASS[status],
                      )}
                    >
                      {status}
                    </Badge>
                    {availableIds.has(e.id) && status === "waiting" && (
                      <Badge
                        variant="secondary"
                        className="gap-1 border-0 bg-violet-100 text-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
                        title="Has a matching open slot — see Available Now above"
                      >
                        <Sparkles className="size-3" />
                        Match
                      </Badge>
                    )}
                    {status === "offered" && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px] bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => {
                            setStatus(e.id, "confirmed");
                            toast.success(`${e.petName} confirmed`);
                          }}
                        >
                          <CheckCircle2 className="size-3" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => {
                            setStatus(e.id, "expired");
                            toast.info(`Offer to ${e.petName} expired`);
                          }}
                        >
                          <XCircle className="size-3" />
                          Expire
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add to Waitlist dialog — Intelligent Waitlist form */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to Waitlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Client + Pet */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  Pet Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.petName}
                  onChange={(e) =>
                    setForm({ ...form, petName: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Breed</Label>
                <Input
                  value={form.petBreed}
                  onChange={(e) =>
                    setForm({ ...form, petBreed: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">
                Owner Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.ownerName}
                onChange={(e) =>
                  setForm({ ...form, ownerName: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={form.ownerPhone}
                  onChange={(e) =>
                    setForm({ ...form, ownerPhone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email (optional)</Label>
                <Input
                  type="email"
                  value={form.ownerEmail ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, ownerEmail: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Service */}
            <div>
              <Label className="text-xs">Service</Label>
              <Select
                value={form.serviceName}
                onValueChange={(v) => setForm({ ...form, serviceName: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pick a service" />
                </SelectTrigger>
                <SelectContent>
                  {packagesData
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expected Date */}
            <ExpectedDatePicker
              value={form.expectedDate ?? { kind: "asap" }}
              onChange={(next) => setForm({ ...form, expectedDate: next })}
            />

            {/* Expected Time */}
            <ExpectedTimePicker
              value={form.expectedTime ?? { kind: "anytime" }}
              onChange={(next) => setForm({ ...form, expectedTime: next })}
            />

            {/* Preferred Groomer */}
            <PreferredGroomerPicker
              stylists={stylistsData}
              value={form.preferredStylistIds ?? []}
              onChange={(next) =>
                setForm({ ...form, preferredStylistIds: next })
              }
            />

            {/* Valid until */}
            <div>
              <Label className="text-xs">
                Valid until{" "}
                <span className="text-muted-foreground font-normal">
                  · auto-expires after this date
                </span>
              </Label>
              <Input
                type="date"
                value={form.validUntil ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    validUntil: e.target.value || undefined,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Comment */}
            <div>
              <Label className="text-xs">
                Comment{" "}
                <span className="text-muted-foreground font-normal">
                  · becomes a ticket comment when converted to an appointment
                </span>
              </Label>
              <Textarea
                value={form.comment ?? ""}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                rows={2}
                placeholder="Anything the team should know…"
                className="mt-1 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNew}>
              <Plus className="mr-1.5 size-4" />
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
