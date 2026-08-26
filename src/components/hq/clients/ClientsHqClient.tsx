"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Users,
  Search,
  MapPin,
  Crown,
  Heart,
  TrendingUp,
  AlertTriangle,
  Clock,
  Download,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FacilityLocation } from "@/types/location";
import type {
  HqClientNetworkValue,
  HqLoyaltyTierSummary,
} from "@/types/hq-clients";
import { HqKpiTile } from "@/components/hq/HqKpiTile";
import { locationStyles } from "@/lib/hq/location-styles";

// ============================================================================
// Real client network value -- see supabase/migrations/20260826120000.
//
// `locationsVisited` is derived from real bookings, sorted by visit count by
// the RPC itself, so the client's PRIMARY location is simply its first entry
// -- there is no stored "primary location" attribute to fake.
//
// "Multi-Location Clients" used to assume its input was already the
// pre-filtered cross-location cohort (the mock fixture only ever contained
// 2+-location clients). Real `clients` here is every client with at least one
// real booking -- the whole network, not a curated subset -- so this tile now
// reports that total, and "Visiting 2+ Locations" is the meaningful subset.
// ============================================================================

type SegmentKey = "champions" | "loyalists" | "growing" | "atRisk";

const SEGMENTS: {
  key: SegmentKey;
  label: string;
  desc: string;
  icon: LucideIcon;
  text: string;
  softBg: string;
  ring: string;
}[] = [
  {
    key: "champions",
    label: "Champions",
    desc: "Top 10% by network spend",
    icon: Crown,
    text: "text-emerald-600 dark:text-emerald-400",
    softBg: "bg-emerald-500/10",
    ring: "ring-emerald-500/40",
  },
  {
    key: "loyalists",
    label: "Loyalists",
    desc: "11–30% · multi-location regulars",
    icon: Heart,
    text: "text-sky-600 dark:text-sky-400",
    softBg: "bg-sky-500/10",
    ring: "ring-sky-500/40",
  },
  {
    key: "growing",
    label: "Growing",
    desc: "31–60% · increasing spend",
    icon: TrendingUp,
    text: "text-amber-600 dark:text-amber-400",
    softBg: "bg-amber-500/10",
    ring: "ring-amber-500/40",
  },
  {
    key: "atRisk",
    label: "At-Risk",
    desc: "Declining visit frequency",
    icon: AlertTriangle,
    text: "text-red-600 dark:text-red-400",
    softBg: "bg-red-500/10",
    ring: "ring-red-500/40",
  },
];

function segmentForPercentile(p: number): SegmentKey {
  if (p < 0.1) return "champions";
  if (p < 0.3) return "loyalists";
  if (p < 0.6) return "growing";
  return "atRisk";
}

function shortName(loc: FacilityLocation): string {
  return loc.name.split("–")[1]?.trim() ?? loc.name;
}

function daysSince(iso: string, nowMs: number): number {
  return Math.max(
    0,
    Math.floor((nowMs - new Date(iso).getTime()) / 86_400_000),
  );
}

const RISK_THRESHOLDS = [60, 90, 120] as const;
type RiskThreshold = (typeof RISK_THRESHOLDS)[number];

function primaryLocationId(c: HqClientNetworkValue): string | null {
  return c.locationsVisited[0]?.locationId ?? null;
}

/** RFC 4180 enough for names/numbers: quote and double up embedded quotes. */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadClientsCsv(clients: HqClientNetworkValue[]) {
  const header = [
    "Client",
    "Pets",
    "Locations Visited",
    "Total Visits",
    "Total Spend",
    "First Visit",
    "Last Visit",
  ];
  const rows = clients.map((c) => [
    c.clientName,
    c.petNames.join("; "),
    String(c.locationsVisited.length),
    String(c.totalVisits),
    c.totalSpend.toFixed(2),
    c.firstVisitedAt.slice(0, 10),
    c.lastVisitedAt.slice(0, 10),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hq-clients-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  clients: HqClientNetworkValue[];
  tiers: HqLoyaltyTierSummary[];
  locations: FacilityLocation[];
}

export function ClientsHqClient({ clients, tiers, locations }: Props) {
  const [search, setSearch] = useState("");
  const [minLocations, setMinLocations] = useState<string>("2");
  const [tier, setTier] = useState<string>("all");
  const [segment, setSegment] = useState<SegmentKey | "all">("all");
  const [riskThreshold, setRiskThreshold] = useState<RiskThreshold>(60);
  // Snapshot "now" once at mount (avoids reading the clock during render).
  const [nowMs] = useState(() => Date.now());

  const getLocation = (id: string) => locations.find((l) => l.id === id);
  const tierById = useMemo(() => new Map(tiers.map((t) => [t.id, t])), [tiers]);

  const segmentByClient = useMemo(() => {
    const sorted = [...clients].sort((a, b) => b.totalSpend - a.totalSpend);
    const n = sorted.length;
    const map = new Map<number, SegmentKey>();
    sorted.forEach((c, i) => {
      map.set(c.clientId, segmentForPercentile(n > 0 ? i / n : 0));
    });
    return map;
  }, [clients]);

  const segmentCounts = useMemo(() => {
    const counts: Record<SegmentKey, number> = {
      champions: 0,
      loyalists: 0,
      growing: 0,
      atRisk: 0,
    };
    for (const seg of segmentByClient.values()) counts[seg] += 1;
    return counts;
  }, [segmentByClient]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter((c) => {
      if (
        q &&
        !c.clientName.toLowerCase().includes(q) &&
        !c.petNames.some((p) => p.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (
        minLocations !== "all" &&
        c.locationsVisited.length < Number(minLocations)
      ) {
        return false;
      }
      if (tier !== "all" && c.loyaltyTierId !== tier) return false;
      if (segment !== "all" && segmentByClient.get(c.clientId) !== segment)
        return false;
      return true;
    });
  }, [clients, search, minLocations, tier, segment, segmentByClient]);

  // Location discovery: where clients started (their primary location) and
  // which other locations they went on to visit.
  const discovery = useMemo(() => {
    const m: Record<string, { started: number; also: Record<string, number> }> =
      {};
    locations.forEach((o) => {
      m[o.id] = { started: 0, also: {} };
      locations.forEach((d) => (m[o.id].also[d.id] = 0));
    });
    clients.forEach((c) => {
      const primary = primaryLocationId(c);
      const row = primary ? m[primary] : undefined;
      if (!row) return;
      row.started += 1;
      c.locationsVisited.forEach((v) => {
        if (v.locationId !== primary && row.also[v.locationId] !== undefined) {
          row.also[v.locationId] += 1;
        }
      });
    });
    return m;
  }, [clients, locations]);

  const atRisk = useMemo(
    () =>
      clients
        .map((c) => ({ client: c, days: daysSince(c.lastVisitedAt, nowMs) }))
        .filter((x) => x.days >= riskThreshold)
        .sort((a, b) => b.days - a.days),
    [clients, nowMs, riskThreshold],
  );

  // Aggregates
  const totalClients = clients.length;
  const visiting2Plus = clients.filter(
    (c) => c.locationsVisited.length >= 2,
  ).length;
  const networkRevenue = clients.reduce((sum, c) => sum + c.totalSpend, 0);
  const avgSpend = clients.length > 0 ? networkRevenue / clients.length : 0;
  const pct2Plus =
    clients.length > 0 ? Math.round((visiting2Plus / clients.length) * 100) : 0;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/facility/hq/overview">
          <Button variant="ghost" size="icon" className="size-9">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
            <Link
              href="/facility/hq/overview"
              className="hover:text-foreground transition-colors"
            >
              HQ
            </Link>
            <ChevronRight className="size-3" />
            <span>Clients HQ</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="size-6 text-sky-600" />
            Clients HQ
          </h1>
          <p className="text-muted-foreground text-sm">
            Every client with a real booking, and where across the network they
            spend.
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HqKpiTile
          label="Network Clients"
          value={totalClients}
          sublabel="All clients across the network"
        />
        <HqKpiTile
          label="Visiting 2+ Locations"
          value={visiting2Plus}
          sublabel={`${pct2Plus}% of the client base`}
        />
        <HqKpiTile
          label="Network Revenue"
          value={`$${networkRevenue.toLocaleString()}`}
          sublabel="Lifetime · all locations"
        />
        <HqKpiTile
          label="Avg Spend per Client"
          value={`$${avgSpend.toFixed(0)}`}
          sublabel="Lifetime average"
        />
      </div>

      {/* Network Value Segments */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Network Value Segments</h2>
            <p className="text-muted-foreground text-xs">
              All clients ranked by network-wide spend · click a segment to
              filter the table
            </p>
          </div>
          {segment !== "all" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setSegment("all")}
            >
              Clear filter
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SEGMENTS.map((s) => {
            const count = segmentCounts[s.key];
            const pct =
              clients.length > 0
                ? Math.round((count / clients.length) * 100)
                : 0;
            const active = segment === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSegment(active ? "all" : s.key)}
                aria-pressed={active}
                className={cn(
                  "bg-card rounded-xl border p-4 text-left transition-all",
                  active ? cn("ring-2", s.ring, s.softBg) : "hover:bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-lg",
                      s.softBg,
                    )}
                  >
                    <s.icon className={cn("size-4", s.text)} />
                  </span>
                  <span className="text-2xl font-bold tabular-nums">
                    {count}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold">{s.label}</p>
                <p className="text-muted-foreground text-[11px]">{s.desc}</p>
                <p className={cn("mt-1 text-[11px] font-semibold", s.text)}>
                  {pct}% of client base
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Discovery */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold">Location Discovery</h2>
          <p className="text-muted-foreground text-xs">
            Where clients first visit (their highest-volume branch) and which
            other locations they went on to visit.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-[11px] tracking-wider uppercase">
                    <th className="px-4 py-2 text-left font-semibold">
                      Started at
                    </th>
                    <th className="px-4 py-2 text-center font-semibold">
                      Clients
                    </th>
                    {locations.map((d) => (
                      <th
                        key={d.id}
                        className={cn(
                          "px-3 py-2 text-center font-semibold",
                          locationStyles(d).text,
                        )}
                      >
                        → {d.shortCode}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {locations.map((origin) => {
                    const row = discovery[origin.id];
                    const ls = locationStyles(origin);
                    return (
                      <tr key={origin.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white",
                                ls.bg,
                              )}
                            >
                              {origin.shortCode}
                            </span>
                            <span className="text-sm font-medium">
                              {shortName(origin)}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold tabular-nums">
                          {row.started}
                        </td>
                        {locations.map((d) => (
                          <td
                            key={d.id}
                            className="px-3 py-2.5 text-center tabular-nums"
                          >
                            {d.id === origin.id ? (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  row.also[d.id] > 0
                                    ? "font-semibold"
                                    : "text-muted-foreground/50",
                                )}
                              >
                                {row.also[d.id]}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-1.5">
              {locations.map((origin) => {
                const row = discovery[origin.id];
                if (row.started === 0) return null;
                const ls = locationStyles(origin);
                const parts = locations
                  .filter((d) => d.id !== origin.id)
                  .map((d) => `${row.also[d.id]} also visited ${shortName(d)}`);
                return (
                  <li key={origin.id} className="text-xs">
                    <span className={cn("font-semibold", ls.text)}>
                      {row.started} client{row.started === 1 ? "" : "s"}
                    </span>{" "}
                    started at{" "}
                    <span className={cn("font-semibold", ls.text)}>
                      {shortName(origin)}
                    </span>
                    {parts.length > 0 && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {parts.join(" · ")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Retention Risk */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="size-4 text-red-500" />
              Retention Risk
            </h2>
            <p className="text-muted-foreground text-xs">
              Clients not seen in {riskThreshold}+ days.
            </p>
          </div>
          <div className="bg-muted/60 flex items-center gap-1 rounded-xl border p-1">
            {RISK_THRESHOLDS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRiskThreshold(t)}
                data-active={riskThreshold === t}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  riskThreshold === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
                {t === 120 ? "+" : ""}d
              </button>
            ))}
          </div>
        </div>
        <Card>
          {atRisk.length === 0 ? (
            <CardContent className="flex flex-col items-center gap-2 py-10">
              <Clock className="text-muted-foreground/40 size-8" />
              <p className="text-muted-foreground text-sm">
                No clients past the {riskThreshold}-day mark — retention looks
                healthy.
              </p>
            </CardContent>
          ) : (
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-[11px] tracking-wider uppercase">
                      <th className="px-4 py-2 font-semibold">Client</th>
                      <th className="px-4 py-2 font-semibold">Last visit</th>
                      <th className="px-4 py-2 font-semibold">Location</th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Total Spend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {atRisk.map(({ client: c, days }) => {
                      const locId = primaryLocationId(c);
                      const loc = locId ? getLocation(locId) : undefined;
                      const ls = loc ? locationStyles(loc) : null;
                      const tone =
                        days >= 120
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : days >= 90
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-muted text-muted-foreground";
                      return (
                        <tr key={c.clientId} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{c.clientName}</p>
                            <p className="text-muted-foreground text-[11px]">
                              {c.petNames.join(", ")}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs">
                              {new Date(c.lastVisitedAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </p>
                            <span
                              className={cn(
                                "mt-0.5 inline-block rounded-md px-1.5 py-px text-[10px] font-semibold tabular-nums",
                                tone,
                              )}
                            >
                              {days}d ago
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {loc && ls ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "flex size-5 items-center justify-center rounded-sm text-[9px] font-bold text-white",
                                    ls.bg,
                                  )}
                                >
                                  {loc.shortCode}
                                </span>
                                <span className="text-xs">
                                  {shortName(loc)}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            ${c.totalSpend.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <div className="relative min-w-60 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or pet name..."
              className="pl-9"
            />
          </div>
          <Select value={minLocations} onValueChange={setMinLocations}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2+ locations</SelectItem>
              {locations.length > 2 && (
                <SelectItem value={String(locations.length)}>
                  All {locations.length} locations
                </SelectItem>
              )}
              <SelectItem value="all">Any</SelectItem>
            </SelectContent>
          </Select>
          {tiers.length > 0 && (
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            disabled={filtered.length === 0}
            onClick={() => downloadClientsCsv(filtered)}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} client{filtered.length === 1 ? "" : "s"} match
            {segment !== "all" &&
              ` · ${SEGMENTS.find((s) => s.key === segment)?.label}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-[11px] tracking-wider uppercase">
                  <th className="px-4 py-2 font-semibold">Client</th>
                  <th className="px-4 py-2 font-semibold">Pets</th>
                  <th className="px-4 py-2 text-center font-semibold">
                    Locations
                  </th>
                  {locations.map((loc) => (
                    <th
                      key={loc.id}
                      className={cn(
                        "px-3 py-2 text-right font-semibold",
                        locationStyles(loc).text,
                      )}
                    >
                      {loc.shortCode}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right font-semibold">
                    Total Spend
                  </th>
                  {tiers.length > 0 && (
                    <th className="px-4 py-2 text-center font-semibold">
                      Tier
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        4 + locations.length + (tiers.length > 0 ? 1 : 0)
                      }
                      className="text-muted-foreground px-4 py-10 text-center text-sm"
                    >
                      No clients match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const primary = primaryLocationId(c);
                    const clientTier = c.loyaltyTierId
                      ? tierById.get(c.loyaltyTierId)
                      : null;
                    return (
                      <tr key={c.clientId} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{c.clientName}</p>
                          <p className="text-muted-foreground text-[11px]">
                            First visit{" "}
                            {new Date(c.firstVisitedAt).toLocaleDateString(
                              undefined,
                              { month: "short", year: "numeric" },
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {c.petNames.join(", ")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className="gap-1 text-[11px]"
                          >
                            <MapPin className="size-3" />
                            {c.locationsVisited.length}
                          </Badge>
                        </td>
                        {locations.map((loc) => {
                          const visit = c.locationsVisited.find(
                            (v) => v.locationId === loc.id,
                          );
                          const isPrimary = primary === loc.id;
                          const ls = locationStyles(loc);
                          return (
                            <td
                              key={loc.id}
                              className={cn(
                                "px-3 py-3 text-right tabular-nums",
                                visit ? "" : "text-muted-foreground/40",
                              )}
                            >
                              {visit ? (
                                <div>
                                  <p
                                    className={cn(
                                      "text-sm font-semibold",
                                      isPrimary ? "text-foreground" : ls.text,
                                    )}
                                  >
                                    {visit.visits}
                                    {isPrimary && (
                                      <span className="ml-0.5 text-[9px]">
                                        ★
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-muted-foreground text-[10px]">
                                    ${visit.spend.toLocaleString()}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[11px]">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          ${c.totalSpend.toLocaleString()}
                        </td>
                        {tiers.length > 0 && (
                          <td className="px-4 py-3 text-center">
                            {clientTier ? (
                              <Badge
                                variant="outline"
                                className="gap-1 text-[10px]"
                                style={{
                                  backgroundColor: `${clientTier.color}1a`,
                                  color: clientTier.color,
                                  borderColor: `${clientTier.color}40`,
                                }}
                              >
                                {clientTier.icon} {clientTier.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">
                                —
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-[11px]">
        ★ marks the client&apos;s highest-volume location. Cross-location
        clients are ideal targets for cross-sell campaigns — segment them in
        Marketing.
      </p>
    </div>
  );
}
