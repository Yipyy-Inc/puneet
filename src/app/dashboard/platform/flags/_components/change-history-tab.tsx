"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  Building,
  Clock,
  Edit,
  Plus,
  RefreshCw,
  Timer,
  ToggleRight,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { configChangeLogs } from "@/data/feature-toggles";
import { useChangeLog } from "@/lib/platform-flags-store";

function truncate(s: string) {
  return s.length > 50 ? `${s.substring(0, 50)}…` : s;
}

export function ChangeHistoryTab() {
  const live = useChangeLog();

  const logs = useMemo(
    () =>
      [...live, ...configChangeLogs].sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp),
      ),
    [live],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Configuration Change History</CardTitle>
        <CardDescription>
          Audit log of every module, flag, and tier-default change — including
          edits made on this page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4 transition-colors"
            >
              <div
                className={
                  log.action === "toggled"
                    ? "bg-primary/10 rounded-lg p-2"
                    : log.action === "updated"
                      ? "rounded-lg bg-amber-500/10 p-2"
                      : log.action === "created"
                        ? "rounded-lg bg-emerald-500/10 p-2"
                        : "bg-muted rounded-lg p-2"
                }
              >
                {log.action === "toggled" ? (
                  <ToggleRight className="text-primary size-5" />
                ) : log.action === "updated" ? (
                  <Edit className="size-5 text-amber-600 dark:text-amber-400" />
                ) : log.action === "created" ? (
                  <Plus className="size-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <RefreshCw className="text-muted-foreground size-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium capitalize">{log.action}</span>
                  <span className="text-muted-foreground">•</span>
                  <code className="bg-muted rounded-sm px-2 py-0.5 text-sm">
                    {log.configKey}
                  </code>
                </div>

                {log.previousValue && log.newValue && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground line-through">
                      {truncate(log.previousValue)}
                    </span>
                    <ArrowRight className="text-muted-foreground size-3" />
                    <span className="text-foreground">
                      {truncate(log.newValue)}
                    </span>
                  </div>
                )}
                {!log.previousValue && log.newValue && (
                  <p className="text-muted-foreground text-sm">
                    Created with value: {log.newValue}
                  </p>
                )}

                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <User className="size-3" />
                    {log.actor}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="size-3" />
                    {log.affectedTenants} tenants affected
                  </span>
                  {log.syncDuration && (
                    <span className="flex items-center gap-1">
                      <Timer className="size-3" />
                      {log.syncDuration}ms sync
                    </span>
                  )}
                </div>
              </div>

              <Badge
                variant="outline"
                className={
                  log.action === "toggled"
                    ? "border-primary/30 text-primary capitalize"
                    : log.action === "updated"
                      ? "border-amber-500/30 text-amber-600 capitalize dark:text-amber-400"
                      : "border-emerald-500/30 text-emerald-600 capitalize dark:text-emerald-400"
                }
              >
                {log.action}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
