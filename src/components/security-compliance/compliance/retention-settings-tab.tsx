"use client";

import { useState } from "react";

import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import type { RetentionPolicy } from "@/data/system-administration";
import { useRetentionPolicies } from "@/lib/compliance-store";

import { RetentionEditDrawer } from "./retention-edit-drawer";

function formatPeriod(days: number): string {
  const years = days / 365;
  return years >= 1 ? `${days} days (~${years.toFixed(1)} yr)` : `${days} days`;
}

export function RetentionSettingsTab() {
  const policies = useRetentionPolicies();
  const [editTarget, setEditTarget] = useState<RetentionPolicy | null>(null);

  const columns: ColumnDef<RetentionPolicy>[] = [
    {
      key: "policyName",
      label: "Policy / Data Type",
      render: (p) => (
        <div>
          <div className="font-medium">{p.policyName}</div>
          <div className="text-muted-foreground text-xs">{p.dataType}</div>
        </div>
      ),
    },
    {
      key: "retentionPeriod",
      label: "Retention Period",
      sortable: true,
      sortValue: (p) => p.retentionPeriod,
      render: (p) => (
        <span className="font-mono text-sm">
          {formatPeriod(p.retentionPeriod)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (p) => (
        <Badge variant="outline" className="text-xs">
          {p.action}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (p) => (
        <Badge variant={p.status === "Active" ? "default" : "secondary"}>
          {p.status}
        </Badge>
      ),
    },
    {
      key: "complianceFramework",
      label: "Framework",
      render: (p) => (
        <span className="text-xs">{p.complianceFramework ?? "—"}</span>
      ),
    },
    {
      key: "nextExecution",
      label: "Next Run",
      render: (p) => (
        <span className="text-sm">
          {new Date(p.nextExecution).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const actions = (p: RetentionPolicy) => (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
      aria-label="Edit retention policy"
      onClick={() => setEditTarget(p)}
    >
      <Pencil className="size-4" />
      Edit
    </Button>
  );

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Data Retention Settings
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          How long each data type is kept and what happens when it expires. Edit
          the retention period, action, or status per policy.
        </p>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={policies}
          actions={actions}
          searchKey="policyName"
          searchPlaceholder="Search retention policies..."
        />
      </CardContent>

      <RetentionEditDrawer
        key={editTarget?.id ?? "none"}
        policy={editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
      />
    </Card>
  );
}
