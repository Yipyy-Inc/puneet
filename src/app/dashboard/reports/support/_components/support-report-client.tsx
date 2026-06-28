"use client";

import dynamic from "next/dynamic";
import {
  Clock,
  Headphones,
  MessageSquare,
  PhoneCall,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import type { AgentPerfRow, SupportReport } from "@/lib/api/support-report";

function ChartSkeleton() {
  return (
    <div className="bg-muted/40 text-muted-foreground flex h-[280px] w-full items-center justify-center rounded-md text-sm">
      Loading chart…
    </div>
  );
}

const TicketVolumeChart = dynamic(
  () => import("./ticket-volume-chart").then((m) => m.TicketVolumeChart),
  { ssr: false, loading: ChartSkeleton },
);
const ResolutionTrendChart = dynamic(
  () => import("./resolution-trend-chart").then((m) => m.ResolutionTrendChart),
  { ssr: false, loading: ChartSkeleton },
);
const ChatVolumeChart = dynamic(
  () => import("./chat-volume-chart").then((m) => m.ChatVolumeChart),
  { ssr: false, loading: ChartSkeleton },
);
const CallRecoveryChart = dynamic(
  () => import("./call-recovery-chart").then((m) => m.CallRecoveryChart),
  { ssr: false, loading: ChartSkeleton },
);
const TopCategoriesChart = dynamic(
  () => import("./top-categories-chart").then((m) => m.TopCategoriesChart),
  { ssr: false, loading: ChartSkeleton },
);

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function CallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function SupportReportClient({ report }: { report: SupportReport }) {
  const {
    kpis,
    ticketVolume,
    resolutionTrend,
    chatVolume,
    topCategories,
    callMetrics,
    agents,
  } = report;

  const columns: ColumnDef<AgentPerfRow>[] = [
    {
      key: "name",
      label: "Agent",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-muted-foreground text-xs">{r.role}</div>
        </div>
      ),
    },
    {
      key: "ticketsResolved",
      label: "Tickets Resolved",
      sortable: true,
      sortValue: (r) => r.ticketsResolved,
      render: (r) => <span className="tabular-nums">{r.ticketsResolved}</span>,
    },
    {
      key: "avgResolutionHrs",
      label: "Avg Resolution",
      sortable: true,
      sortValue: (r) => r.avgResolutionHrs,
      render: (r) => (
        <span className="tabular-nums">{r.avgResolutionHrs}h</span>
      ),
    },
    {
      key: "slaCompliance",
      label: "SLA Compliance",
      sortable: true,
      sortValue: (r) => r.slaCompliance,
      render: (r) => (
        <span
          className={`tabular-nums ${
            r.slaCompliance >= 95
              ? "text-emerald-600 dark:text-emerald-400"
              : r.slaCompliance < 88
                ? "text-amber-600 dark:text-amber-400"
                : ""
          }`}
        >
          {r.slaCompliance}%
        </span>
      ),
    },
    {
      key: "chatMessages",
      label: "Chat Messages",
      sortable: true,
      sortValue: (r) => r.chatMessages,
      render: (r) => <span className="tabular-nums">{r.chatMessages}</span>,
    },
    {
      key: "callsTaken",
      label: "Calls Taken",
      sortable: true,
      sortValue: (r) => r.callsTaken,
      render: (r) => <span className="tabular-nums">{r.callsTaken}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile
          label="Avg First Response"
          value={`${kpis.avgFirstResponseHrs}h`}
          icon={Clock}
          tone="amber"
        />
        <KpiTile
          label="Avg Resolution Time"
          value={`${kpis.avgResolutionHrs}h`}
          icon={Timer}
          tone="indigo"
        />
        <KpiTile
          label="SLA Compliance"
          value={`${kpis.slaComplianceRate}%`}
          icon={ShieldCheck}
          tone={kpis.slaComplianceRate >= 90 ? "emerald" : "amber"}
          alert={
            kpis.slaComplianceRate < 90
              ? { label: "Below target", tone: "amber" }
              : undefined
          }
        />
        <KpiTile
          label="Chat Response Time"
          value={`${kpis.chatResponseMin} min`}
          icon={MessageSquare}
          tone="violet"
        />
        <KpiTile
          label="Call Answer Rate"
          value={`${kpis.callAnswerRate}%`}
          icon={PhoneCall}
          tone="slate"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Volume by Priority</CardTitle>
          <CardDescription>
            Weekly ticket volume, stacked by priority
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketVolumeChart data={ticketVolume} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resolution Time Trend</CardTitle>
            <CardDescription>
              Average ticket resolution time per week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResolutionTrendChart data={resolutionTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Issue Categories</CardTitle>
            <CardDescription>
              Tickets by category over the period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopCategoriesChart data={topCategories} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chat Volume</CardTitle>
            <CardDescription>
              Support chat messages per day over 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChatVolumeChart data={chatVolume} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Metrics</CardTitle>
            <CardDescription>
              Missed-call rate, average duration, and recovery-rate trend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <CallStat
                label="Missed-Call Rate"
                value={`${callMetrics.missedCallRate}%`}
              />
              <CallStat
                label="Avg Duration"
                value={formatDuration(callMetrics.avgDurationSeconds)}
              />
              <CallStat
                label="Recovery Rate"
                value={`${callMetrics.recoveryRate}%`}
              />
            </div>
            <CallRecoveryChart data={callMetrics.recoveryTrend} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
          <CardDescription>
            Per agent across tickets, chat and calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={agents}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search agents…"
            itemsPerPage={10}
            emptyState={{
              icon: Headphones,
              title: "No agent activity yet",
              description:
                "Agent performance will appear here once support tickets, chats, and calls are handled.",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
