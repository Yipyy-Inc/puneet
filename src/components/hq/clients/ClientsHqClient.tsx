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
  Mail,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import type { CrossLocationClient } from "@/data/hq-analytics";
import { HqKpiTile } from "@/components/hq/HqKpiTile";
import { locationStyles } from "@/lib/hq/location-styles";

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

// Assign every client to one segment by their network-wide spend percentile.
function segmentForPercentile(p: number): SegmentKey {
  if (p < 0.1) return "champions";
  if (p < 0.3) return "loyalists";
  if (p < 0.6) return "growing";
  return "atRisk";
}

function shortName(loc: Location): string {
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

const TIER_COLORS: Record<CrossLocationClient["loyaltyTier"], string> = {
  bronze: "bg-amber-100 text-amber-800 border-amber-300",
  silver: "bg-slate-100 text-slate-800 border-slate-300",
  gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
  platinum:
    "bg-linear-to-r from-violet-100 to-fuchsia-100 text-violet-800 border-violet-300",
};

interface Props {
  clients: CrossLocationClient[];
  locations: Location[];
}

export function ClientsHqClient({ clients, locations }: Props) {
  const [search, setSearch] = useState("");
  const [minLocations, setMinLocations] = useState<string>("2");
  const [tier, setTier] = useState<string>("all");
  const [segment, setSegment] = useState<SegmentKey | "all">("all");
  const [riskThreshold, setRiskThreshold] = useState<RiskThreshold>(60);
  // Snapshot "now" once at mount (avoids reading the clock during render).
  const [nowMs] = useState(() => Date.now());

  const getLocation = (id: string) => locations.find((l) => l.id === id);

  // clientId → value segment, by descending network-wide spend percentile.
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
      if (tier !== "all" && c.loyaltyTier !== tier) return false;
      if (segment !== "all" && segmentByClient.get(c.clientId) !== segment)
        return false;
      return true;
    });
  }, [clients, search, minLocations, tier, segment, segmentByClient]);

  // Location discovery: where clients started (their primary location) and which
  // other locations they went on to visit.
  const discovery = useMemo(() => {
    const m: Record<string, { started: number; also: Record<string, number> }> =
      {};
    locations.forEach((o) => {
      m[o.id] = { started: 0, also: {} };
      locations.forEach((d) => (m[o.id].also[d.id] = 0));
    });
    clients.forEach((c) => {
      const row = m[c.primaryLocationId];
      if (!row) return;
      row.started += 1;
      c.locationsVisited.forEach((v) => {
        if (
          v.locationId !== c.primaryLocationId &&
          row.also[v.locationId] !== undefined
        ) {
          row.also[v.locationId] += 1;
        }
      });
    });
    return m;
  }, [clients, locations]);

  // Retention risk: clients not seen in at least the selected threshold, most
  // stale first.
  const atRisk = useMemo(
    () =>
      clients
        .map((c) => ({ client: c, days: daysSince(c.lastVisitedAt, nowMs) }))
        .filter((x) => x.days >= riskThreshold)
        .sort((a, b) => b.days - a.days),
    [clients, nowMs, riskThreshold],
  );

  // Aggregates
  const multiLocationClients = clients.length;
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
            Cross-location clients — your most valuable cohort, spending across
            the whole network.
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HqKpiTile
          label="Multi-Location Clients"
          value={multiLocationClients}
          sublabel="Tracked cross-location cohort"
        />
        <HqKpiTile
          label="Visiting 2+ Locations"
          value={visiting2Plus}
          sublabel={`${pct2Plus}% of the cohort`}
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
            Where clients first visit and which locations they discover next —
            revealing which branches drive cross-location growth.
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

            {/* Roll-up sentences */}
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
              Clients not seen in {riskThreshold}+ days — win them back before
              they lapse.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={atRisk.length === 0}
              onClick={() =>
                toast.success(
                  `Re-engagement campaign created — targeting ${atRisk.length} client${atRisk.length === 1 ? "" : "s"} not seen in ${riskThreshold}+ days`,
                )
              }
            >
              <Mail className="size-4" />
              Send Re-engagement
            </Button>
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
                      const loc = getLocation(c.primaryLocationId);
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
              <SelectItem value="3">All 3 locations</SelectItem>
              <SelectItem value="all">Any</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => toast.success("Client report exported as CSV")}
          >
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
                  <th className="px-4 py-2 text-center font-semibold">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5 + locations.length}
                      className="text-muted-foreground px-4 py-10 text-center text-sm"
                    >
                      No clients match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
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
                        <Badge variant="outline" className="gap-1 text-[11px]">
                          <MapPin className="size-3" />
                          {c.locationsVisited.length}
                        </Badge>
                      </td>
                      {locations.map((loc) => {
                        const visit = c.locationsVisited.find(
                          (v) => v.locationId === loc.id,
                        );
                        const isPrimary = c.primaryLocationId === loc.id;
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
                                    <span className="ml-0.5 text-[9px]">★</span>
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
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            TIER_COLORS[c.loyaltyTier],
                          )}
                        >
                          {c.loyaltyTier}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-[11px]">
        ★ marks the client&apos;s primary location. Cross-location clients are
        ideal targets for cross-sell campaigns — segment them in Marketing.
      </p>
    </div>
  );
}
