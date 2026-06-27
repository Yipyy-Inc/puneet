"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  MousePointerClick,
  PhoneCall,
  PhoneMissed,
  Search,
  Voicemail,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { lookupFacilityByPhone } from "@/data/support-calls";
import { useSupportCallLog } from "@/lib/support-call-log-store";
import { CallLogDetail } from "./call-log-detail";
import { CallLogRow } from "./call-log-row";
import {
  inTimeRange,
  STATUS_OPTIONS,
  TIME_OPTIONS,
  type TimeRange,
  TYPE_OPTIONS,
} from "./call-log-utils";

export function CallLogTab() {
  const entries = useSupportCallLog();
  const hydrated = useHydrated();
  // Captured once at mount (keeps render pure); only read post-hydration.
  const [nowMs] = useState(() => Date.now());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [location, setLocation] = useState("all");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [time, setTime] = useState<TimeRange>("all");

  const teams = useMemo(
    () => [...new Set(entries.map((e) => e.team))].sort(),
    [entries],
  );

  // Scope = location + time + search (NOT type/status, so the KPI breakdown
  // stays meaningful regardless of the type/status dropdowns below).
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (location !== "all" && e.team !== location) return false;
      if (!inTimeRange(e.at, time, nowMs)) return false;
      if (q) {
        const facility = lookupFacilityByPhone(e.callerNumber);
        const hay =
          `${facility?.facilityName ?? "unknown caller"} ${e.callerNumber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, location, time, search, nowMs]);

  const kpis = useMemo(
    () => ({
      total: scoped.length,
      completed: scoped.filter((e) => e.status === "completed").length,
      missed: scoped.filter((e) => e.status === "missed").length,
      voicemail: scoped.filter((e) => e.status === "voicemail").length,
    }),
    [scoped],
  );

  const filtered = useMemo(
    () =>
      scoped.filter((e) => {
        if (type !== "all" && e.direction !== type) return false;
        if (status !== "all" && e.status !== status) return false;
        return true;
      }),
    [scoped, type, status],
  );

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Total Calls"
          value={kpis.total}
          icon={PhoneCall}
          tone="indigo"
        />
        <KpiTile
          label="Completed"
          value={kpis.completed}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Missed"
          value={kpis.missed}
          icon={PhoneMissed}
          tone="rose"
          alert={
            kpis.missed > 0
              ? { label: "Needs callback", tone: "rose" }
              : undefined
          }
        />
        <KpiTile
          label="Voicemails"
          value={kpis.voicemail}
          icon={Voicemail}
          tone="amber"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {teams.length > 1 && (
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search facility or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={time} onValueChange={(v) => setTime(v as TimeRange)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Master-detail */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardContent className="space-y-2 p-3">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
                No calls match the current filters.
              </p>
            ) : (
              filtered.map((e) => (
                <CallLogRow
                  key={e.id}
                  entry={e}
                  selected={selectedId === e.id}
                  onSelect={() => setSelectedId(e.id)}
                  nowMs={nowMs}
                />
              ))
            )}
          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {selected ? (
            <CallLogDetail
              key={selected.id}
              entry={selected}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-2xl">
                  <MousePointerClick className="size-5" />
                </span>
                <p className="text-sm font-semibold">No call selected</p>
                <p className="text-muted-foreground text-xs">
                  Select a call from the list to view its details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
