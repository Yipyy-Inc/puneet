"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Search,
  Crown,
  TrendingUp,
  MapPin,
  Award,
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
import type { Location } from "@/types/location";
import type { CrossLocationClient } from "@/data/hq-analytics";

const TIER_COLORS: Record<CrossLocationClient["loyaltyTier"], string> = {
  bronze: "bg-amber-100 text-amber-800 border-amber-300",
  silver: "bg-slate-100 text-slate-800 border-slate-300",
  gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
  platinum:
    "bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-800 border-violet-300",
};

interface Props {
  clients: CrossLocationClient[];
  locations: Location[];
}

export function ClientActivityClient({ clients, locations }: Props) {
  const [search, setSearch] = useState("");
  const [minLocations, setMinLocations] = useState<string>("2");
  const [tier, setTier] = useState<string>("all");

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
      return true;
    });
  }, [clients, search, minLocations, tier]);

  // Aggregates
  const totalCrossClients = clients.filter(
    (c) => c.locationsVisited.length >= 2,
  ).length;
  const totalSpend = clients.reduce((sum, c) => sum + c.totalSpend, 0);
  const avgSpend = clients.length > 0 ? totalSpend / clients.length : 0;
  const tripleVisitors = clients.filter(
    (c) => c.locationsVisited.length >= 3,
  ).length;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/facility/hq/reports"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="size-3" />
            All HQ Reports
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="size-6 text-sky-600" />
            Cross-Location Client Activity
          </h1>
          <p className="text-muted-foreground text-sm">
            Clients who visit more than one location — your most valuable cohort.
          </p>
        </div>
      </div>

      {/* Aggregates */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Multi-location clients"
          value={totalCrossClients.toLocaleString()}
          sub={`${((totalCrossClients / clients.length) * 100).toFixed(0)}% of active clients`}
          icon={Users}
        />
        <StatTile
          label="Visited 3+ locations"
          value={tripleVisitors.toLocaleString()}
          sub="The platinum loyalty pool"
          icon={Crown}
          accent="text-violet-600 bg-violet-100"
        />
        <StatTile
          label="Group spend"
          value={`$${totalSpend.toLocaleString()}`}
          sub="From cross-location clients"
          icon={TrendingUp}
          accent="text-emerald-600 bg-emerald-100"
        />
        <StatTile
          label="Avg spend per client"
          value={`$${avgSpend.toFixed(0)}`}
          sub="Lifetime · all locations"
          icon={Award}
          accent="text-amber-600 bg-amber-100"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <div className="relative flex-1 min-w-[220px]">
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
            <SelectTrigger className="w-[160px]">
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
          <Button variant="outline" size="sm" className="ml-auto">
            Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} client{filtered.length === 1 ? "" : "s"} match
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Client</th>
                  <th className="px-4 py-2 font-semibold">Pets</th>
                  <th className="px-4 py-2 text-center font-semibold">
                    Locations
                  </th>
                  {locations.map((loc) => (
                    <th
                      key={loc.id}
                      className="px-3 py-2 text-right font-semibold"
                      style={{ color: loc.color }}
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
                {filtered.map((c) => (
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
                                  isPrimary && "text-foreground",
                                )}
                                style={
                                  !isPrimary
                                    ? { color: loc.color }
                                    : undefined
                                }
                              >
                                {visit.visits}
                                {isPrimary && (
                                  <span className="ml-0.5 text-[9px]">
                                    ★
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                ${visit.spend.toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px]">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      ${c.totalSpend.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] capitalize", TIER_COLORS[c.loyaltyTier])}
                      >
                        {c.loyaltyTier}
                      </Badge>
                    </td>
                  </tr>
                ))}
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

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  accent = "text-sky-600 bg-sky-100",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("flex size-10 items-center justify-center rounded-lg", accent)}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-[10px]">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
