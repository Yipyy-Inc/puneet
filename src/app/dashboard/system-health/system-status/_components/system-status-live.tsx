"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Gauge,
  MemoryStick,
  Plug,
  RefreshCw,
  ScrollText,
  ServerCog,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  HealthComponent,
  HealthResponse,
  HealthStatus,
  TrendSample,
} from "@/lib/monitoring/types";

function ChartSkeleton() {
  return (
    <div className="bg-muted/40 text-muted-foreground flex h-[220px] w-full items-center justify-center rounded-md text-sm">
      Loading chart…
    </div>
  );
}

const ComponentTrendChart = dynamic(
  () => import("./component-trend-chart").then((m) => m.ComponentTrendChart),
  { ssr: false, loading: ChartSkeleton },
);

const STATUS_META: Record<
  HealthStatus,
  { label: string; dot: string; text: string }
> = {
  operational: {
    label: "Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  down: {
    label: "Down",
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
  },
  not_configured: {
    label: "Not configured",
    dot: "bg-slate-400",
    text: "text-muted-foreground",
  },
};

const HISTORY_CAP = 60;

function StatusDot({ status }: { status: HealthStatus }) {
  const meta = STATUS_META[status];
  const animated = status === "degraded" || status === "down";
  return (
    <span className="relative flex size-2.5">
      {animated && (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-75",
            meta.dot,
          )}
        />
      )}
      <span
        className={cn("relative inline-flex size-2.5 rounded-full", meta.dot)}
      />
    </span>
  );
}

function NotConfigured({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="border-muted-foreground/20 bg-muted/30 flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center">
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">{body}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/system-admin/integrations">
          <Plug className="mr-2 size-4" />
          Connect a monitoring provider
        </Link>
      </Button>
    </div>
  );
}

export function SystemStatusLive() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [history, setHistory] = useState<Record<string, TrendSample[]>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`Health endpoint returned ${res.status}`);
      const json = (await res.json()) as HealthResponse;
      setData(json);
      setError(null);
      setLastUpdated(new Date());
      setHistory((prev) => {
        const next: Record<string, TrendSample[]> = { ...prev };
        const t = new Date(json.checkedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        for (const c of json.components) {
          const sample: TrendSample = {
            t,
            cpu: c.cpuPercent,
            mem: c.memoryPercent,
            latency: c.latencyMs,
          };
          next[c.id] = [...(prev[c.id] ?? []), sample].slice(-HISTORY_CAP);
        }
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the initial call so state updates aren't synchronous to the effect.
    const t = setTimeout(fetchHealth, 0);
    const id = setInterval(fetchHealth, 60_000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [fetchHealth]);

  const components = data?.components ?? [];
  const unhealthy = components.filter(
    (c) => c.status === "degraded" || c.status === "down",
  );
  const operational = components.filter(
    (c) => c.status === "operational",
  ).length;
  const appServer = components.find((c) => c.id === "app-server");
  const providerConfigured = data?.provider.configured ?? false;

  return (
    <div className="space-y-6">
      {/* Header + last updated */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
          <p className="text-muted-foreground">
            Live infrastructure health from real checks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
              : "Checking…"}
            <span className="ml-1 hidden sm:inline">· auto-refresh 60s</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 size-4", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Fetch error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="size-4 shrink-0" />
          Unable to reach the health endpoint: {error}
        </div>
      )}

      {/* Degraded / Down alert banner */}
      {unhealthy.length > 0 && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="size-5" />
            {unhealthy.length} component{unhealthy.length > 1 ? "s" : ""} need
            attention
          </div>
          <ul className="mt-1.5 space-y-0.5 text-sm text-rose-700/90 dark:text-rose-300/90">
            {unhealthy.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span> —{" "}
                {STATUS_META[c.status].label}: {c.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI summary (real) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Overall Health"
          value={
            !data ? "—" : data.healthy ? "All systems go" : "Issues detected"
          }
          hint={data ? `Checked in ${data.durationMs}ms` : undefined}
          icon={Activity}
          tone={!data ? "slate" : data.healthy ? "emerald" : "rose"}
        />
        <KpiTile
          label="Components Operational"
          value={data ? `${operational}/${components.length}` : "—"}
          icon={Gauge}
          tone={data && operational === components.length ? "emerald" : "amber"}
        />
        <KpiTile
          label="App CPU"
          value={
            appServer?.cpuPercent != null ? `${appServer.cpuPercent}%` : "—"
          }
          hint="of all cores"
          icon={Cpu}
          tone={
            appServer?.cpuPercent != null && appServer.cpuPercent > 85
              ? "rose"
              : "indigo"
          }
        />
        <KpiTile
          label="App Memory"
          value={
            appServer?.memoryPercent != null
              ? `${appServer.memoryPercent}%`
              : "—"
          }
          hint="heap utilisation"
          icon={MemoryStick}
          tone={
            appServer?.memoryPercent != null && appServer.memoryPercent > 90
              ? "rose"
              : "violet"
          }
        />
      </div>

      {/* Live component health + per-component drill-down */}
      <Card>
        <CardHeader>
          <CardTitle>Application Health Checks</CardTitle>
          <CardDescription>
            Real probes of the running platform. Click a component to drill in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Running health checks…
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {components.map((c) => (
                <ComponentRow
                  key={c.id}
                  component={c}
                  samples={history[c.id] ?? []}
                  providerConfigured={providerConfigured}
                />
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Infrastructure fleet — provider gated */}
      <Card>
        <CardHeader>
          <CardTitle>Infrastructure Fleet</CardTitle>
          <CardDescription>
            Server fleet metrics, 24-hour history and error logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providerConfigured ? (
            <p className="text-muted-foreground text-sm">
              Provider{" "}
              <span className="text-foreground font-medium">
                {data?.provider.name}
              </span>{" "}
              is configured. Per-server fleet inventory, 24-hour history and
              error-log streaming will populate here once the provider data
              integration is enabled — no fleet data is being fabricated in the
              meantime.
            </p>
          ) : (
            <NotConfigured
              icon={ServerCog}
              title="Monitoring not configured"
              body="Per-server fleet status, 24-hour CPU/memory history and error logs require a connected monitoring provider (e.g. Datadog, Grafana Cloud, Prometheus). No live infrastructure data is available yet — this panel will populate once a provider is connected."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ComponentRow({
  component: c,
  samples,
  providerConfigured,
}: {
  component: HealthComponent;
  samples: TrendSample[];
  providerConfigured: boolean;
}) {
  const meta = STATUS_META[c.status];
  const isResource = c.category === "application";
  const hasSeries = isResource ? c.cpuPercent != null : c.latencyMs != null;
  return (
    <AccordionItem value={c.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 pr-3">
          <StatusDot status={c.status} />
          <span className="font-medium">{c.name}</span>
          <span className={cn("text-xs font-medium", meta.text)}>
            {meta.label}
          </span>
          {/* min-w-0 so `truncate` can actually shrink it — as a flex item it
              defaulted to min-width:auto and pushed the row 235px wide. */}
          <span className="text-muted-foreground ml-auto min-w-0 truncate text-xs">
            {c.detail}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-5 pt-2">
          {/* Real current metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {c.metrics.map((m) => (
              <div key={m.label} className="bg-muted/40 rounded-lg p-2.5">
                <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                  {m.label}
                </p>
                <p className="font-medium tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Live trend chart (real accumulated samples) */}
          {hasSeries ? (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Cpu className="text-muted-foreground size-4" />
                <h4 className="text-sm font-semibold">
                  {isResource
                    ? "CPU & Memory — live trend"
                    : "Latency — live trend"}
                </h4>
              </div>
              <p className="text-muted-foreground mb-2 text-xs">
                Real samples collected since this page opened (one per refresh).
                Full 24-hour history requires a connected monitoring provider.
              </p>
              {samples.length === 0 ? (
                <div className="bg-muted/40 text-muted-foreground flex h-[120px] items-center justify-center rounded-md text-sm">
                  Collecting samples…
                </div>
              ) : (
                <ComponentTrendChart
                  samples={samples}
                  kind={isResource ? "resource" : "latency"}
                />
              )}
            </div>
          ) : (
            <div>
              <h4 className="mb-1 text-sm font-semibold">Live trend</h4>
              <p className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
                No continuously-sampled metric for this component — its status
                is a point-in-time check.
              </p>
            </div>
          )}

          {/* Error logs — provider gated */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ScrollText className="text-muted-foreground size-4" />
              <h4 className="text-sm font-semibold">Error logs (last 50)</h4>
            </div>
            {providerConfigured ? (
              <p className="text-muted-foreground text-sm">
                Provider connected — error-log streaming integration is pending.
                The last 50 entries will appear here once it is enabled.
              </p>
            ) : (
              <NotConfigured
                icon={Database}
                title="Monitoring not configured"
                body="Error log streaming requires a connected monitoring/log provider. Once connected, the last 50 error entries for this component will appear here."
              />
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
