"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DataTable, ColumnDef, FilterDef } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import {
  tenantModuleConfigs,
  remoteConfigFlags,
  configChangeLogs,
  availableModules,
  getConfigStats,
  TenantModuleConfig,
  RemoteConfigFlag,
  ConfigChangeLog,
} from "@/data/feature-toggles";
import {
  Flag,
  Building,
  Settings,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  History,
  Plus,
  Edit,
  Eye,
  ToggleLeft,
  ToggleRight,
  Globe,
  User,
  Users,
  Package,
  Search,
  Filter,
  Play,
  Pause,
  Copy,
  Trash2,
  ArrowRight,
  Timer,
  Activity,
  Shield,
  Layers,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function FeatureToggles() {
  const [activeTab, setActiveTab] = useState("tenants");
  const [tenantConfigs, setTenantConfigs] = useState(tenantModuleConfigs);
  const [remoteFlags, setRemoteFlags] = useState(remoteConfigFlags);
  const [selectedTenant, setSelectedTenant] = useState<TenantModuleConfig | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<RemoteConfigFlag | null>(null);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [isNewFlagModalOpen, setIsNewFlagModalOpen] = useState(false);
  const [syncingFlags, setSyncingFlags] = useState<string[]>([]);

  const stats = useMemo(() => getConfigStats(), []);

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      beginner: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      pro: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      enterprise: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      custom: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    };
    return colors[tier] || "bg-muted text-muted-foreground";
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "synced":
        return "bg-success/10 text-success border-success/20";
      case "pending":
        return "bg-warning/10 text-warning border-warning/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getScopeBadge = (scope: string) => {
    switch (scope) {
      case "global":
        return { icon: Globe, color: "bg-blue-500/10 text-blue-600" };
      case "tenant":
        return { icon: Building, color: "bg-purple-500/10 text-purple-600" };
      case "user":
        return { icon: User, color: "bg-green-500/10 text-green-600" };
      default:
        return { icon: Flag, color: "bg-muted text-muted-foreground" };
    }
  };

  const toggleTenantModule = (tenantId: string, moduleId: string, enable: boolean) => {
    setTenantConfigs((prev) =>
      prev.map((config) => {
        if (config.tenantId === tenantId) {
          const enabledModules = enable
            ? [...config.enabledModules.filter((m) => m !== moduleId), moduleId]
            : config.enabledModules.filter((m) => m !== moduleId);
          const disabledModules = enable
            ? config.disabledModules.filter((m) => m !== moduleId)
            : [...config.disabledModules.filter((m) => m !== moduleId), moduleId];
          return {
            ...config,
            enabledModules,
            disabledModules,
            lastUpdated: new Date().toISOString(),
          };
        }
        return config;
      })
    );
  };

  const toggleRemoteFlag = async (flagId: string) => {
    setSyncingFlags((prev) => [...prev, flagId]);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setRemoteFlags((prev) =>
      prev.map((flag) =>
        flag.id === flagId
          ? {
              ...flag,
              currentValue: flag.currentValue === "true" ? "false" : "true",
              lastSynced: new Date().toISOString(),
              syncStatus: "synced" as const,
              version: flag.version + 1,
            }
          : flag
      )
    );

    setSyncingFlags((prev) => prev.filter((id) => id !== flagId));
  };

  const syncAllFlags = async () => {
    const pendingFlags = remoteFlags.filter((f) => f.syncStatus === "pending");
    setSyncingFlags(pendingFlags.map((f) => f.id));

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setRemoteFlags((prev) =>
      prev.map((flag) =>
        flag.syncStatus === "pending"
          ? { ...flag, syncStatus: "synced" as const, lastSynced: new Date().toISOString() }
          : flag
      )
    );

    setSyncingFlags([]);
  };

  // Tenant columns
  const tenantColumns: ColumnDef<TenantModuleConfig>[] = [
    {
      key: "tenantName",
      label: "Tenant",
      icon: Building,
      defaultVisible: true,
      render: (config) => (
        <div>
          <p className="font-medium">{config.tenantName}</p>
          <p className="text-xs text-muted-foreground">{config.tenantId}</p>
        </div>
      ),
    },
    {
      key: "subscriptionTier",
      label: "Tier",
      icon: Layers,
      defaultVisible: true,
      render: (config) => (
        <Badge className={`${getTierBadge(config.subscriptionTier)} border capitalize`}>
          {config.subscriptionTier}
        </Badge>
      ),
    },
    {
      key: "enabledModules",
      label: "Enabled Modules",
      icon: Package,
      defaultVisible: true,
      render: (config) => (
        <div className="flex items-center gap-2">
          <span className="text-success font-medium">{config.enabledModules.length}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{availableModules.length}</span>
        </div>
      ),
    },
    {
      key: "moduleOverrides",
      label: "Overrides",
      icon: Shield,
      defaultVisible: true,
      render: (config) =>
        config.moduleOverrides.length > 0 ? (
          <Badge variant="outline" className="text-warning border-warning/30">
            {config.moduleOverrides.length} active
          </Badge>
        ) : (
          <span className="text-muted-foreground">None</span>
        ),
    },
    {
      key: "lastUpdated",
      label: "Last Updated",
      icon: Clock,
      defaultVisible: true,
      render: (config) => (
        <span className="text-sm">{new Date(config.lastUpdated).toLocaleDateString()}</span>
      ),
    },
  ];

  const tenantFilters: FilterDef[] = [
    {
      key: "subscriptionTier",
      label: "Tier",
      options: [
        { value: "all", label: "All Tiers" },
        { value: "beginner", label: "Beginner" },
        { value: "pro", label: "Pro" },
        { value: "enterprise", label: "Enterprise" },
        { value: "custom", label: "Custom" },
      ],
    },
  ];

  // Remote flag columns
  const flagColumns: ColumnDef<RemoteConfigFlag>[] = [
    {
      key: "name",
      label: "Flag",
      icon: Flag,
      defaultVisible: true,
      render: (flag) => (
        <div>
          <p className="font-medium">{flag.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{flag.key}</p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      icon: Settings,
      defaultVisible: true,
      render: (flag) => (
        <Badge variant="outline" className="capitalize">
          {flag.type}
        </Badge>
      ),
    },
    {
      key: "currentValue",
      label: "Value",
      icon: ToggleRight,
      defaultVisible: true,
      render: (flag) => {
        if (flag.type === "boolean") {
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={flag.currentValue === "true"}
                disabled={syncingFlags.includes(flag.id)}
                onCheckedChange={() => toggleRemoteFlag(flag.id)}
              />
              <span className={flag.currentValue === "true" ? "text-success" : "text-muted-foreground"}>
                {flag.currentValue === "true" ? "Enabled" : "Disabled"}
              </span>
            </div>
          );
        }
        return (
          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
            {flag.currentValue.length > 30
              ? flag.currentValue.substring(0, 30) + "..."
              : flag.currentValue}
          </span>
        );
      },
    },
    {
      key: "scope",
      label: "Scope",
      icon: Globe,
      defaultVisible: true,
      render: (flag) => {
        const scopeInfo = getScopeBadge(flag.scope);
        const Icon = scopeInfo.icon;
        return (
          <Badge className={`${scopeInfo.color} border-0 gap-1`}>
            <Icon className="h-3 w-3" />
            {flag.scope}
          </Badge>
        );
      },
    },
    {
      key: "syncStatus",
      label: "Sync",
      icon: RefreshCw,
      defaultVisible: true,
      render: (flag) => (
        <div className="flex items-center gap-2">
          {syncingFlags.includes(flag.id) ? (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Badge className={`${getSyncStatusBadge(flag.syncStatus)} border capitalize`}>
              {flag.syncStatus}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "environment",
      label: "Env",
      icon: Activity,
      defaultVisible: true,
      render: (flag) => (
        <Badge
          variant="outline"
          className={
            flag.environment === "production"
              ? "border-success/30 text-success"
              : flag.environment === "staging"
                ? "border-warning/30 text-warning"
                : "border-info/30 text-info"
          }
        >
          {flag.environment}
        </Badge>
      ),
    },
  ];

  const flagFilters: FilterDef[] = [
    {
      key: "scope",
      label: "Scope",
      options: [
        { value: "all", label: "All Scopes" },
        { value: "global", label: "Global" },
        { value: "tenant", label: "Tenant" },
        { value: "user", label: "User" },
      ],
    },
    {
      key: "environment",
      label: "Environment",
      options: [
        { value: "all", label: "All Environments" },
        { value: "production", label: "Production" },
        { value: "staging", label: "Staging" },
        { value: "development", label: "Development" },
      ],
    },
    {
      key: "type",
      label: "Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "boolean", label: "Boolean" },
        { value: "string", label: "String" },
        { value: "number", label: "Number" },
        { value: "json", label: "JSON" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Toggles & Remote Config</h1>
          <p className="text-muted-foreground mt-1">
            Enable/disable modules per tenant and manage remote configuration flags
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.pendingSync > 0 && (
            <Button variant="outline" onClick={syncAllFlags} disabled={syncingFlags.length > 0}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncingFlags.length > 0 ? "animate-spin" : ""}`} />
              Sync All ({stats.pendingSync})
            </Button>
          )}
          <Button onClick={() => setIsNewFlagModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Config Flag
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Tenants"
          value={stats.totalTenants.toString()}
          icon={Building}
          variant="primary"
          subtitle="With module configs"
        />
        <StatCard
          title="Config Flags"
          value={stats.totalFlags.toString()}
          icon={Flag}
          variant="info"
          subtitle={`${stats.activeFlags} active`}
        />
        <StatCard
          title="Pending Sync"
          value={stats.pendingSync.toString()}
          icon={RefreshCw}
          variant={stats.pendingSync > 0 ? "warning" : "success"}
          subtitle="Awaiting deployment"
        />
        <StatCard
          title="Active Overrides"
          value={stats.totalOverrides.toString()}
          icon={Shield}
          variant="secondary"
          subtitle="Module exceptions"
        />
        <StatCard
          title="Recent Changes"
          value={stats.recentChanges.toString()}
          icon={History}
          variant="default"
          subtitle="Last 24 hours"
        />
        <StatCard
          title="Sync Status"
          value={syncingFlags.length > 0 ? "Syncing..." : "Ready"}
          icon={Zap}
          variant={syncingFlags.length > 0 ? "warning" : "success"}
          subtitle="Real-time updates"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 max-w-lg">
          <TabsTrigger value="tenants" className="gap-2">
            <Building className="h-4 w-4" />
            Tenant Modules
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-2">
            <Flag className="h-4 w-4" />
            Remote Config
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Change History
          </TabsTrigger>
        </TabsList>

        {/* Tenant Modules Tab */}
        <TabsContent value="tenants" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tenant Module Configuration</CardTitle>
              <CardDescription>
                Enable or disable modules for individual tenants. Click on a tenant to manage their modules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={tenantConfigs}
                columns={tenantColumns}
                filters={tenantFilters}
                searchKey="tenantName"
                searchPlaceholder="Search tenants..."
                itemsPerPage={10}
                actions={(config) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTenant(config);
                        setIsTenantModalOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remote Config Tab */}
        <TabsContent value="flags" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Remote Configuration Flags</CardTitle>
                  <CardDescription>
                    Manage feature flags and configuration values. Changes are applied instantly.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-success" />
                  Real-time sync enabled
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={remoteFlags}
                columns={flagColumns}
                filters={flagFilters}
                searchKey="name"
                searchPlaceholder="Search flags..."
                itemsPerPage={10}
                actions={(flag) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFlag(flag);
                        setIsFlagModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Configuration Change History</CardTitle>
              <CardDescription>
                Audit log of all configuration changes with sync details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configChangeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        log.action === "toggled"
                          ? "bg-primary/10"
                          : log.action === "updated"
                            ? "bg-warning/10"
                            : log.action === "created"
                              ? "bg-success/10"
                              : "bg-muted"
                      }`}
                    >
                      {log.action === "toggled" ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : log.action === "updated" ? (
                        <Edit className="h-5 w-5 text-warning" />
                      ) : log.action === "created" ? (
                        <Plus className="h-5 w-5 text-success" />
                      ) : (
                        <RefreshCw className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{log.action}</span>
                        <span className="text-muted-foreground">•</span>
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">{log.configKey}</code>
                      </div>
                      {log.previousValue && log.newValue && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground line-through">
                            {log.previousValue.length > 50
                              ? log.previousValue.substring(0, 50) + "..."
                              : log.previousValue}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-foreground">
                            {log.newValue.length > 50
                              ? log.newValue.substring(0, 50) + "..."
                              : log.newValue}
                          </span>
                        </div>
                      )}
                      {!log.previousValue && log.newValue && (
                        <p className="text-sm text-muted-foreground">
                          Created with value: {log.newValue}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.actor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {log.affectedTenants} tenants affected
                        </span>
                        {log.syncDuration && (
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {log.syncDuration}ms sync
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        log.action === "toggled"
                          ? "border-primary/30 text-primary"
                          : log.action === "updated"
                            ? "border-warning/30 text-warning"
                            : "border-success/30 text-success"
                      }
                    >
                      {log.action}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tenant Module Configuration Modal */}
      <Dialog open={isTenantModalOpen} onOpenChange={setIsTenantModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {selectedTenant?.tenantName} - Module Configuration
            </DialogTitle>
            <DialogDescription>
              Enable or disable modules for this tenant. Changes are applied instantly.
            </DialogDescription>
          </DialogHeader>

          {selectedTenant && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {/* Tenant Info */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Subscription Tier</p>
                  <Badge className={`${getTierBadge(selectedTenant.subscriptionTier)} border capitalize mt-1`}>
                    {selectedTenant.subscriptionTier}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Enabled Modules</p>
                  <p className="text-2xl font-bold text-success">
                    {selectedTenant.enabledModules.length}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedTenant.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Module Toggles */}
              <div className="space-y-4">
                <h4 className="font-semibold">Available Modules</h4>
                <div className="grid gap-3">
                  {availableModules.map((module) => {
                    const isEnabled = selectedTenant.enabledModules.includes(module.id);
                    const hasOverride = selectedTenant.moduleOverrides.find(
                      (o) => o.moduleId === module.id
                    );
                    const tierAllowed =
                      module.tier === "all" ||
                      (module.tier === "pro" &&
                        ["pro", "enterprise", "custom"].includes(selectedTenant.subscriptionTier)) ||
                      (module.tier === "enterprise" &&
                        ["enterprise", "custom"].includes(selectedTenant.subscriptionTier));

                    return (
                      <div
                        key={module.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          isEnabled ? "border-success/30 bg-success/5" : "border-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Package className={`h-5 w-5 ${isEnabled ? "text-success" : "text-muted-foreground"}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{module.name}</p>
                              <Badge variant="outline" className="text-xs capitalize">
                                {module.category}
                              </Badge>
                              {hasOverride && (
                                <Badge className="bg-warning/10 text-warning border-0 text-xs">
                                  Override Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Required tier: {module.tier === "all" ? "All tiers" : `${module.tier}+`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {!tierAllowed && !hasOverride && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Tier upgrade required
                            </Badge>
                          )}
                          <Switch
                            checked={isEnabled}
                            disabled={!tierAllowed && !hasOverride}
                            onCheckedChange={(checked) =>
                              toggleTenantModule(selectedTenant.tenantId, module.id, checked)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Overrides */}
              {selectedTenant.moduleOverrides.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Active Module Overrides
                  </h4>
                  <div className="space-y-2">
                    {selectedTenant.moduleOverrides.map((override) => (
                      <div
                        key={override.moduleId}
                        className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{override.moduleName}</p>
                          <p className="text-sm text-muted-foreground">{override.overrideReason}</p>
                          {override.expiresAt && (
                            <p className="text-xs text-warning mt-1">
                              Expires: {new Date(override.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTenantModalOpen(false)}>
              Close
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Detail Modal */}
      <Dialog open={isFlagModalOpen} onOpenChange={setIsFlagModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              {selectedFlag?.name}
            </DialogTitle>
            <DialogDescription>
              <code className="text-sm bg-muted px-2 py-0.5 rounded">{selectedFlag?.key}</code>
            </DialogDescription>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-6 py-4">
              <p className="text-muted-foreground">{selectedFlag.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline" className="capitalize">
                    {selectedFlag.type}
                  </Badge>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Scope</p>
                  <Badge className={`${getScopeBadge(selectedFlag.scope).color} border-0`}>
                    {selectedFlag.scope}
                  </Badge>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Environment</p>
                  <Badge variant="outline">{selectedFlag.environment}</Badge>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Version</p>
                  <span className="font-mono">v{selectedFlag.version}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Default Value</Label>
                <Input value={selectedFlag.defaultValue} readOnly className="font-mono" />
              </div>

              <div className="space-y-2">
                <Label>Current Value</Label>
                {selectedFlag.type === "boolean" ? (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      checked={selectedFlag.currentValue === "true"}
                      disabled={syncingFlags.includes(selectedFlag.id)}
                      onCheckedChange={() => toggleRemoteFlag(selectedFlag.id)}
                    />
                    <span className={selectedFlag.currentValue === "true" ? "text-success" : ""}>
                      {selectedFlag.currentValue === "true" ? "Enabled" : "Disabled"}
                    </span>
                    {syncingFlags.includes(selectedFlag.id) && (
                      <RefreshCw className="h-4 w-4 animate-spin ml-auto" />
                    )}
                  </div>
                ) : (
                  <Textarea value={selectedFlag.currentValue} className="font-mono" rows={3} />
                )}
              </div>

              {selectedFlag.targetTenants && selectedFlag.targetTenants.length > 0 && (
                <div className="space-y-2">
                  <Label>Target Tenants</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedFlag.targetTenants.map((tenantId) => {
                      const tenant = tenantConfigs.find((t) => t.tenantId === tenantId);
                      return (
                        <Badge key={tenantId} variant="outline">
                          {tenant?.tenantName || tenantId}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                <span className="text-muted-foreground">
                  Last synced: {new Date(selectedFlag.lastSynced).toLocaleString()}
                </span>
                <Badge className={`${getSyncStatusBadge(selectedFlag.syncStatus)} border`}>
                  {selectedFlag.syncStatus}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFlagModalOpen(false)}>
              Close
            </Button>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Flag
            </Button>
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Flag Modal */}
      <Dialog open={isNewFlagModalOpen} onOpenChange={setIsNewFlagModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Config Flag
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Flag Name</Label>
              <Input placeholder="e.g., New Feature X" />
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <Input placeholder="e.g., feature.new_x" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe what this flag controls..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Value</Label>
              <Input placeholder="Enter default value" className="font-mono" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFlagModalOpen(false)}>
              Cancel
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

