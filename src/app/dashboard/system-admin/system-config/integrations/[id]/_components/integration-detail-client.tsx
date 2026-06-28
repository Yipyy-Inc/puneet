"use client";

import { useState } from "react";

import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Activity,
  RefreshCw,
  ShieldCheck,
  Plug,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import {
  buildIntegrationErrors,
  type IntegrationLogError,
} from "@/data/integration-logs";
import {
  reconnectIntegration,
  testIntegrationConnection,
  useIntegrations,
} from "@/lib/integrations-store";

import { UpdateCredentialsDialog } from "./update-credentials-dialog";

const STATUS_META: Record<string, { dot: string; text: string }> = {
  Active: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  Inactive: { dot: "bg-slate-400", text: "text-muted-foreground" },
  Error: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  Testing: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
};

const BACK = "/dashboard/system-admin/system-config";

function fmt(value?: string) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function IntegrationDetailClient({
  integrationId,
}: {
  integrationId: string;
}) {
  const integrations = useIntegrations();
  const integration = integrations.find((i) => i.id === integrationId);
  const [credsOpen, setCredsOpen] = useState(false);

  if (!integration) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="outline" asChild>
          <Link href={BACK}>
            <ArrowLeft className="mr-2 size-4" />
            Back to integrations
          </Link>
        </Button>
        <p className="text-muted-foreground">Integration not found.</p>
      </div>
    );
  }

  const meta = STATUS_META[integration.status] ?? STATUS_META.Inactive;
  const isError = integration.status === "Error";
  const errors = buildIntegrationErrors(integration);

  const onTest = () => {
    const r = testIntegrationConnection(integration.id);
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
  };
  const onReconnect = () => {
    reconnectIntegration(integration.id);
    toast.success(`${integration.name} reconnected`);
  };

  const errorColumns: ColumnDef<IntegrationLogError>[] = [
    {
      key: "timestamp",
      label: "Time",
      sortable: true,
      sortValue: (e) => e.timestamp,
      render: (e) => (
        <span className="text-xs whitespace-nowrap">
          {new Date(e.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: "statusCode",
      label: "Status",
      render: (e) => (
        <Badge
          variant={e.statusCode >= 500 ? "destructive" : "outline"}
          className="font-mono text-xs"
        >
          {e.statusCode}
        </Badge>
      ),
    },
    {
      key: "endpoint",
      label: "Endpoint",
      render: (e) => <span className="font-mono text-xs">{e.endpoint}</span>,
    },
    {
      key: "message",
      label: "Error",
      render: (e) => <span className="text-xs">{e.message}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href={BACK}>
          <ArrowLeft className="mr-1.5 size-4" />
          All integrations
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {integration.name}
            </h1>
            <Badge variant="secondary">{integration.type}</Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium",
                meta.text,
              )}
            >
              <span className={cn("size-2 rounded-full", meta.dot)} />
              {integration.status}
            </span>
          </div>
          <p className="text-muted-foreground">{integration.provider}</p>
        </div>
        {isError && (
          <Button
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={onReconnect}
          >
            <RefreshCw className="size-4" />
            Reconnect
          </Button>
        )}
      </div>

      {/* Error banner */}
      {isError && integration.errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{integration.errorMessage}</span>
        </div>
      )}

      {/* Status & Health */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="size-5" />
            Status &amp; Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs">Connection status</p>
              <p
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  meta.text,
                )}
              >
                {integration.status === "Active" ? (
                  <CheckCircle2 className="size-4" />
                ) : isError ? (
                  <XCircle className="size-4" />
                ) : (
                  <Clock className="size-4" />
                )}
                {integration.status}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                Last successful call
              </p>
              <p className="font-medium">
                {fmt(
                  integration.lastSuccessfulCall ??
                    integration.usageStats.lastRequest,
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last sync</p>
              <p className="font-medium">{fmt(integration.lastSync)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button variant="outline" className="gap-2" onClick={onTest}>
              <RefreshCw className="size-4" />
              Test Connection
            </Button>
            {isError && (
              <Button
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={onReconnect}
              >
                <Plug className="size-4" />
                Reconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <KeyRound className="size-5" />
              Credentials
            </CardTitle>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setCredsOpen(true)}
            >
              <KeyRound className="size-4" />
              Update Credentials
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Authentication</p>
              <p className="font-medium">{integration.authenticationType}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">API endpoint</p>
              <p className="font-mono text-sm">{integration.apiEndpoint}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Secret</p>
              <p className="flex items-center gap-2 font-mono text-sm">
                ••••••••••••••••••••
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="size-3" />
                  Encrypted — not displayable
                </span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last updated</p>
              <p className="font-medium">
                {new Date(
                  integration.credentials.lastUpdated,
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage & Logs */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="size-5" />
            Usage &amp; Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Total requests"
              value={integration.usageStats.totalRequests.toLocaleString()}
              icon={Activity}
              tone="indigo"
            />
            <KpiTile
              label="Success rate"
              value={`${integration.usageStats.successRate}%`}
              icon={CheckCircle2}
              tone={
                integration.usageStats.successRate >= 98 ? "emerald" : "amber"
              }
            />
            <KpiTile
              label="Monthly usage"
              value={integration.usageStats.monthlyUsage.toLocaleString()}
              icon={Activity}
              tone="violet"
            />
            <KpiTile
              label="Recent errors"
              value={errors.length}
              icon={AlertTriangle}
              tone="rose"
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Last 50 errors</h3>
            <DataTable
              columns={errorColumns}
              data={errors}
              itemsPerPage={10}
              searchKey="message"
              searchPlaceholder="Search errors…"
              emptyState={{
                icon: CircleCheck,
                title: "No errors logged",
                description:
                  "This integration hasn't recorded any recent errors.",
              }}
            />
          </div>
        </CardContent>
      </Card>

      <UpdateCredentialsDialog
        open={credsOpen}
        integrationId={integration.id}
        authenticationType={integration.authenticationType}
        onOpenChange={setCredsOpen}
      />
    </div>
  );
}
