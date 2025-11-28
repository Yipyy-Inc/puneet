/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import {
  dataBackups,
  dataRecoveries,
  retentionPolicies,
} from "@/data/system-administration";
import {
  Database,
  HardDrive,
  RefreshCw,
  Download,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Archive,
  Trash2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export function DataManagement() {
  const getBackupStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: any; icon: any; className: string }
    > = {
      Completed: {
        variant: "default",
        icon: CheckCircle2,
        className: "bg-green-100 text-green-700",
      },
      "In Progress": {
        variant: "secondary",
        icon: Clock,
        className: "bg-blue-100 text-blue-700",
      },
      Failed: {
        variant: "destructive",
        icon: XCircle,
        className: "bg-red-100 text-red-700",
      },
      Scheduled: {
        variant: "outline",
        icon: Clock,
        className: "bg-gray-100 text-gray-700",
      },
    };
    const config = variants[status] || variants.Scheduled;
    const Icon = config.icon;
    return (
      <Badge
        variant={config.variant}
        className={`text-xs ${config.className} gap-1`}
      >
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getVerificationBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      Verified: {
        variant: "default",
        className: "bg-green-100 text-green-700",
      },
      Failed: { variant: "destructive", className: "bg-red-100 text-red-700" },
      Pending: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-700",
      },
      "Not Verified": {
        variant: "outline",
        className: "bg-gray-100 text-gray-700",
      },
    };
    const config = variants[status] || variants["Not Verified"];
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {status}
      </Badge>
    );
  };

  const getRecoveryStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      Completed: {
        variant: "default",
        className: "bg-green-100 text-green-700",
      },
      "In Progress": {
        variant: "secondary",
        className: "bg-blue-100 text-blue-700",
      },
      Failed: { variant: "destructive", className: "bg-red-100 text-red-700" },
      Requested: {
        variant: "outline",
        className: "bg-yellow-100 text-yellow-700",
      },
    };
    const config = variants[status] || variants.Requested;
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {status}
      </Badge>
    );
  };

  const getPolicyStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      Active: "default",
      Inactive: "secondary",
      Draft: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {status}
      </Badge>
    );
  };

  // Backup Columns
  const backupColumns = [
    {
      key: "backupName",
      label: "Backup Name",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.backupName}</div>
          <div className="text-xs text-muted-foreground">
            {item.backupType} - {item.scope}
          </div>
        </div>
      ),
    },
    {
      key: "facilityName",
      label: "Facility",
      render: (item: any) => (
        <span className="text-sm">{item.facilityName || "All Facilities"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) => getBackupStatusBadge(item.status),
    },
    {
      key: "startTime",
      label: "Date & Time",
      render: (item: any) => (
        <div className="text-sm">
          <div>{new Date(item.startTime).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(item.startTime).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: "size",
      label: "Size",
      render: (item: any) => (
        <span className="font-mono text-sm">
          {item.size >= 1024
            ? `${(item.size / 1024).toFixed(2)} GB`
            : `${item.size} MB`}
        </span>
      ),
    },
    {
      key: "verificationStatus",
      label: "Verification",
      render: (item: any) => getVerificationBadge(item.verificationStatus),
    },
    {
      key: "backupMethod",
      label: "Method",
      render: (item: any) => (
        <Badge variant="outline" className="text-xs">
          {item.backupMethod}
        </Badge>
      ),
    },
  ];

  const backupActions = () => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Restore
      </Button>
      <Button variant="ghost" size="sm" className="gap-2">
        <Download className="h-4 w-4" />
        Download
      </Button>
    </div>
  );

  // Recovery Columns
  const recoveryColumns = [
    {
      key: "recoveryName",
      label: "Recovery Name",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.recoveryName}</div>
          <div className="text-xs text-muted-foreground">
            {item.recoveryType}
          </div>
        </div>
      ),
    },
    {
      key: "backupName",
      label: "Source Backup",
      render: (item: any) => <span className="text-sm">{item.backupName}</span>,
    },
    {
      key: "requestedBy",
      label: "Requested By",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.requestedBy}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(item.requestedAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) => getRecoveryStatusBadge(item.status),
    },
    {
      key: "progress",
      label: "Progress",
      render: (item: any) => (
        <div className="w-32">
          <Progress value={item.progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{item.progress}%</p>
        </div>
      ),
    },
  ];

  // Retention Policy Columns
  const policyColumns = [
    {
      key: "policyName",
      label: "Policy Name",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.policyName}</div>
          <div className="text-xs text-muted-foreground">{item.dataType}</div>
        </div>
      ),
    },
    {
      key: "retentionPeriod",
      label: "Retention Period",
      render: (item: any) => (
        <span className="font-medium">
          {item.retentionPeriod} days ({Math.floor(item.retentionPeriod / 365)}{" "}
          years)
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (item: any) => {
        const colors: Record<string, string> = {
          Archive: "bg-blue-100 text-blue-700",
          Purge: "bg-red-100 text-red-700",
          Anonymize: "bg-purple-100 text-purple-700",
        };
        return (
          <Badge
            variant="secondary"
            className={`text-xs ${colors[item.action]}`}
          >
            {item.action}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) => getPolicyStatusBadge(item.status),
    },
    {
      key: "itemsProcessed",
      label: "Items Processed",
      render: (item: any) => (
        <span className="font-semibold">
          {item.itemsProcessed.toLocaleString()}
        </span>
      ),
    },
    {
      key: "nextExecution",
      label: "Next Execution",
      render: (item: any) => (
        <span className="text-sm">
          {new Date(item.nextExecution).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const policyActions = () => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="gap-2">
        <Play className="h-4 w-4" />
        Run Now
      </Button>
      <Button variant="ghost" size="sm" className="gap-2">
        <Settings className="h-4 w-4" />
        Edit
      </Button>
    </div>
  );

  // Calculate statistics
  const completedBackups = dataBackups.filter(
    (b) => b.status === "Completed",
  ).length;
  const totalBackupSize = dataBackups
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + b.size, 0);
  const verifiedBackups = dataBackups.filter(
    (b) => b.verificationStatus === "Verified",
  ).length;
  const activeRecoveries = dataRecoveries.filter(
    (r) => r.status === "In Progress",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Data Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage backups, recovery, and data retention policies
          </p>
        </div>
        <Button className="gap-2">
          <Database className="h-4 w-4" />
          Create Manual Backup
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Backups
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {dataBackups.length}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedBackups} completed
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Database className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Storage Used
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {(totalBackupSize / 1024).toFixed(1)} GB
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Across all backups
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <HardDrive className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Verified Backups
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {verifiedBackups}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {((verifiedBackups / dataBackups.length) * 100).toFixed(0)}%
                  verification rate
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Active Recoveries
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {activeRecoveries}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  In progress
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="backups" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="retention">Retention Policies</TabsTrigger>
        </TabsList>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Backup History
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                All system and facility backups with verification status
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={backupColumns as any}
                data={dataBackups as any}
                actions={backupActions as any}
                searchKey="backupName"
                searchPlaceholder="Search backups..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Recovery Operations
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track data recovery and restoration processes
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={recoveryColumns as any}
                data={dataRecoveries as any}
                searchKey="recoveryName"
                searchPlaceholder="Search recovery operations..."
              />
            </CardContent>
          </Card>

          {/* Disaster Recovery Info */}
          <Card className="border-0 shadow-card bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Disaster Recovery Procedures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Assess the Situation</p>
                    <p className="text-sm text-muted-foreground">
                      Identify the scope of data loss and affected systems
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Select Recovery Point</p>
                    <p className="text-sm text-muted-foreground">
                      Choose the most recent verified backup before the incident
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Execute Recovery</p>
                    <p className="text-sm text-muted-foreground">
                      Initiate full or partial recovery based on requirements
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Verify & Test</p>
                    <p className="text-sm text-muted-foreground">
                      Validate data integrity and system functionality
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Policies Tab */}
        <TabsContent value="retention" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Retention Policies
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Automated data retention and compliance management
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={policyColumns as any}
                data={retentionPolicies as any}
                actions={policyActions as any}
                searchKey="policyName"
                searchPlaceholder="Search policies..."
              />
            </CardContent>
          </Card>

          {/* Compliance Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Archive Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Data is archived to cold storage and remains accessible for
                  compliance audits
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Purge Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Data is permanently deleted after retention period expires
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Anonymize Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Personal data is anonymized while preserving statistical value
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
