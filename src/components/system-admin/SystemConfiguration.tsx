/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import {
  integrations,
  apiKeys,
  systemSettings,
  featureFlags,
} from "@/data/system-administration";
import {
  Settings,
  Key,
  Plug,
  Flag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TestTube,
  Copy,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export function SystemConfiguration() {
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const getIntegrationStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: any; icon: any; className: string }
    > = {
      Active: {
        variant: "default",
        icon: CheckCircle2,
        className: "bg-green-100 text-green-700",
      },
      Inactive: {
        variant: "secondary",
        icon: XCircle,
        className: "bg-gray-100 text-gray-700",
      },
      Error: {
        variant: "destructive",
        icon: AlertCircle,
        className: "bg-red-100 text-red-700",
      },
      Testing: {
        variant: "outline",
        icon: TestTube,
        className: "bg-blue-100 text-blue-700",
      },
    };
    const config = variants[status] || variants.Inactive;
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

  const getApiKeyStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      Active: { variant: "default", className: "bg-green-100 text-green-700" },
      Expired: { variant: "destructive", className: "bg-red-100 text-red-700" },
      Revoked: {
        variant: "destructive",
        className: "bg-gray-100 text-gray-700",
      },
      Suspended: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-700",
      },
    };
    const config = variants[status] || variants.Suspended;
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {status}
      </Badge>
    );
  };

  const getIntegrationTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      Email: "bg-blue-100 text-blue-700",
      SMS: "bg-green-100 text-green-700",
      Messaging: "bg-purple-100 text-purple-700",
      Feedback: "bg-orange-100 text-orange-700",
      Payment: "bg-green-100 text-green-700",
      Storage: "bg-gray-100 text-gray-700",
      Analytics: "bg-pink-100 text-pink-700",
    };
    return (
      <Badge variant="secondary" className={`text-xs ${colors[type]}`}>
        {type}
      </Badge>
    );
  };

  // Integration Columns
  const integrationColumns = [
    {
      key: "name",
      label: "Integration",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.provider}</div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (item: any) => getIntegrationTypeBadge(item.type),
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) => getIntegrationStatusBadge(item.status),
    },
    {
      key: "usageStats",
      label: "Usage",
      render: (item: any) => (
        <div className="text-sm">
          <div className="font-medium">
            {item.usageStats.totalRequests.toLocaleString()} requests
          </div>
          <div className="text-xs text-muted-foreground">
            {item.usageStats.successRate}% success rate
          </div>
        </div>
      ),
    },
    {
      key: "lastSync",
      label: "Last Sync",
      render: (item: any) => (
        <span className="text-sm">
          {item.lastSync ? new Date(item.lastSync).toLocaleString() : "Never"}
        </span>
      ),
    },
    {
      key: "testStatus",
      label: "Test Status",
      render: (item: any) => {
        if (!item.testStatus)
          return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <Badge
            variant={item.testStatus === "Passed" ? "default" : "destructive"}
            className="text-xs"
          >
            {item.testStatus}
          </Badge>
        );
      },
    },
  ];

  const integrationActions = () => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="gap-2">
        <TestTube className="h-4 w-4" />
        Test
      </Button>
      <Button variant="ghost" size="sm" className="gap-2">
        <Settings className="h-4 w-4" />
        Configure
      </Button>
    </div>
  );

  // API Key Columns
  const apiKeyColumns = [
    {
      key: "name",
      label: "Key Name",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "key",
      label: "API Key",
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
            {showApiKeys[item.id]
              ? item.key
              : item.key.substring(0, 20) + "..."}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setShowApiKeys((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
            }
          >
            {showApiKeys[item.id] ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
          <Button variant="ghost" size="sm">
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: any) => getApiKeyStatusBadge(item.status),
    },
    {
      key: "rateLimit",
      label: "Rate Limit",
      render: (item: any) => (
        <div className="text-sm">
          <div>{item.rateLimit.requestsPerMinute}/min</div>
          <div className="text-xs text-muted-foreground">
            {item.rateLimit.requestsPerDay}/day
          </div>
        </div>
      ),
    },
    {
      key: "usageStats",
      label: "Usage",
      render: (item: any) => (
        <div className="text-sm">
          <div className="font-medium">
            {item.usageStats.totalRequests.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {(
              (item.usageStats.successfulRequests /
                item.usageStats.totalRequests) *
              100
            ).toFixed(1)}
            % success
          </div>
        </div>
      ),
    },
    {
      key: "lastUsed",
      label: "Last Used",
      render: (item: any) => (
        <span className="text-sm">
          {item.lastUsed
            ? new Date(item.lastUsed).toLocaleDateString()
            : "Never"}
        </span>
      ),
    },
  ];

  const apiKeyActions = () => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Regenerate
      </Button>
      <Button variant="ghost" size="sm" className="gap-2 text-destructive">
        <XCircle className="h-4 w-4" />
        Revoke
      </Button>
    </div>
  );

  // System Settings Columns
  const settingsColumns = [
    {
      key: "name",
      label: "Setting",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (item: any) => (
        <Badge variant="outline" className="text-xs">
          {item.category}
        </Badge>
      ),
    },
    {
      key: "value",
      label: "Current Value",
      render: (item: any) => {
        if (item.type === "boolean") {
          return (
            <Switch
              checked={item.value as boolean}
              disabled={!item.isEditable}
              className="data-[state=checked]:bg-primary"
            />
          );
        }
        return (
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
              {String(item.value)}
            </code>
            {item.requiresRestart && (
              <Badge variant="secondary" className="text-xs">
                Restart Required
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "lastModified",
      label: "Last Modified",
      render: (item: any) => (
        <div className="text-sm">
          <div>{new Date(item.lastModified).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            by {item.modifiedBy}
          </div>
        </div>
      ),
    },
  ];

  const settingsActions = (item: any) => (
    <Button
      variant="ghost"
      size="sm"
      disabled={!item.isEditable}
      className="gap-2"
    >
      <Settings className="h-4 w-4" />
      Edit
    </Button>
  );

  // Feature Flag Columns
  const featureFlagColumns = [
    {
      key: "name",
      label: "Feature",
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: (item: any) => (
        <Switch
          checked={item.enabled}
          className="data-[state=checked]:bg-primary"
        />
      ),
    },
    {
      key: "rolloutPercentage",
      label: "Rollout",
      render: (item: any) => (
        <div className="w-32">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2"
              style={{ width: `${item.rolloutPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {item.rolloutPercentage}%
          </p>
        </div>
      ),
    },
    {
      key: "targetFacilities",
      label: "Target",
      render: (item: any) => {
        if (item.targetFacilities && item.targetFacilities.length > 0) {
          return (
            <Badge variant="outline" className="text-xs">
              {item.targetFacilities.length} facilities
            </Badge>
          );
        }
        if (item.targetUsers && item.targetUsers.length > 0) {
          return (
            <Badge variant="outline" className="text-xs">
              {item.targetUsers.length} users
            </Badge>
          );
        }
        return <span className="text-xs text-muted-foreground">All</span>;
      },
    },
    {
      key: "createdAt",
      label: "Created",
      render: (item: any) => (
        <div className="text-sm">
          <div>{new Date(item.createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            by {item.createdBy}
          </div>
        </div>
      ),
    },
  ];

  const featureFlagActions = () => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="gap-2">
        <Settings className="h-4 w-4" />
        Configure
      </Button>
    </div>
  );

  // Calculate statistics
  const activeIntegrations = integrations.filter(
    (i) => i.status === "Active",
  ).length;
  const activeApiKeys = apiKeys.filter((k) => k.status === "Active").length;
  const editableSettings = systemSettings.filter((s) => s.isEditable).length;
  const enabledFlags = featureFlags.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">System Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Manage integrations, API keys, and system settings
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Integration
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Active Integrations
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {activeIntegrations}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  of {integrations.length} total
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Plug className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  API Keys
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {activeApiKeys}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active keys
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <Key className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  System Settings
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {editableSettings}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configurable
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Settings className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Feature Flags
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {enabledFlags}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enabled features
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <Flag className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Integration Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure and monitor third-party service integrations
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={integrationColumns as any}
                data={integrations as any}
                actions={integrationActions as any}
                searchKey="name"
                searchPlaceholder="Search integrations..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                API Key Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage API keys and access permissions
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={apiKeyColumns as any}
                data={apiKeys as any}
                actions={apiKeyActions as any}
                searchKey="name"
                searchPlaceholder="Search API keys..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">
                    System Settings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure global system parameters
                  </p>
                </div>
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={settingsColumns as any}
                data={systemSettings as any}
                actions={settingsActions as any}
                searchKey="name"
                searchPlaceholder="Search settings..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Feature Flag Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Control feature rollout and experimentation
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={featureFlagColumns as any}
                data={featureFlags as any}
                actions={featureFlagActions as any}
                searchKey="name"
                searchPlaceholder="Search feature flags..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
