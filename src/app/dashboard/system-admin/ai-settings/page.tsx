"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Key,
  Building2,
  BarChart3,
  Shield,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  Zap,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  aiPlatformConfig,
  aiFacilityConfigs,
  aiUsageRecords,
  getAiFacilityUsageSummaries,
} from "@/data/ai-settings";
import type { AiFacilityConfig } from "@/types/ai-settings";

export default function AiSettingsPage() {
  // Platform config
  const [platformKey, setPlatformKey] = useState(
    aiPlatformConfig.platformApiKey,
  );
  const [showKey, setShowKey] = useState(false);
  const [defaultModel, setDefaultModel] = useState(
    aiPlatformConfig.defaultModel,
  );
  const [globalEnabled, setGlobalEnabled] = useState(aiPlatformConfig.enabled);
  const [maxTokens, setMaxTokens] = useState(
    aiPlatformConfig.maxTokensPerRequest,
  );
  const [defaultLimit, setDefaultLimit] = useState(
    aiPlatformConfig.defaultMonthlyLimit,
  );

  // Facility configs
  const [facilityConfigs, setFacilityConfigs] =
    useState<AiFacilityConfig[]>(aiFacilityConfigs);

  const usageSummaries = getAiFacilityUsageSummaries();
  const totalTokensThisMonth = usageSummaries.reduce(
    (s, u) => s + u.currentMonthTokens,
    0,
  );
  const totalCostThisMonth = usageSummaries.reduce(
    (s, u) => s + u.estimatedCost,
    0,
  );
  const totalRequests = aiUsageRecords.length;

  const updateFacility = (
    facilityId: number,
    patch: Partial<AiFacilityConfig>,
  ) => {
    setFacilityConfigs((prev) =>
      prev.map((f) => (f.facilityId === facilityId ? { ...f, ...patch } : f)),
    );
  };

  const maskKey = (key: string) => {
    if (!key) return "Not set";
    return `${key.slice(0, 12)}${"*".repeat(20)}${key.slice(-4)}`;
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="size-6 text-violet-500" />
          AI Integration Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys, usage limits, and AI features across all facilities.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  Active Facilities
                </p>
                <p className="text-2xl font-bold">
                  {facilityConfigs.filter((f) => f.enabled).length}
                </p>
              </div>
              <Building2 className="size-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  Tokens This Month
                </p>
                <p className="text-2xl font-bold">
                  {totalTokensThisMonth.toLocaleString()}
                </p>
              </div>
              <Zap className="size-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Estimated Cost</p>
                <p className="text-2xl font-bold">
                  ${totalCostThisMonth.toFixed(4)}
                </p>
              </div>
              <TrendingUp className="size-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Requests</p>
                <p className="text-2xl font-bold">{totalRequests}</p>
              </div>
              <BarChart3 className="size-8 text-violet-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="platform">Platform Config</TabsTrigger>
          <TabsTrigger value="facilities">Facility Access</TabsTrigger>
          <TabsTrigger value="usage">Usage & Billing</TabsTrigger>
        </TabsList>

        {/* ── Platform Config ─────────────────────────────────────── */}
        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="size-5" />
                Platform API Key
              </CardTitle>
              <CardDescription>
                Master Anthropic API key used for all facilities that don&apos;t
                have their own key. This is Yipyy&apos;s platform key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Anthropic API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={platformKey}
                      onChange={(e) => setPlatformKey(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    onClick={() => toast.success("API key saved")}
                    className="gap-1.5"
                  >
                    <Save className="size-4" />
                    Save
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Get your key from{" "}
                  <span className="font-medium">
                    console.anthropic.com/settings/keys
                  </span>
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <Select value={defaultModel} onValueChange={setDefaultModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-haiku-4-5-20251001">
                        Claude Haiku 4.5 (fastest, cheapest)
                      </SelectItem>
                      <SelectItem value="claude-sonnet-4-6">
                        Claude Sonnet 4.6 (balanced)
                      </SelectItem>
                      <SelectItem value="claude-opus-4-6">
                        Claude Opus 4.6 (most capable)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens Per Request</Label>
                  <Input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Monthly Limit (per facility)</Label>
                  <Input
                    type="number"
                    value={defaultLimit}
                    onChange={(e) => setDefaultLimit(Number(e.target.value))}
                  />
                  <p className="text-muted-foreground text-xs">
                    Tokens per month. 0 = unlimited.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    id="global-ai"
                    checked={globalEnabled}
                    onCheckedChange={setGlobalEnabled}
                  />
                  <Label htmlFor="global-ai">
                    Enable AI features platform-wide
                  </Label>
                </div>
              </div>

              {!globalEnabled && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <p className="text-sm text-amber-700">
                    AI features are disabled. No facility can use AI generation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Facility Access ─────────────────────────────────────── */}
        <TabsContent value="facilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                Per-Facility AI Settings
              </CardTitle>
              <CardDescription>
                Control which facilities can use AI, set individual limits, and
                manage custom API keys (BYOK).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {facilityConfigs.map((config) => {
                  const usage = usageSummaries.find(
                    (u) => u.facilityId === config.facilityId,
                  );
                  const usagePct =
                    config.monthlyTokenLimit > 0
                      ? Math.min(
                          100,
                          ((usage?.currentMonthTokens ?? 0) /
                            config.monthlyTokenLimit) *
                            100,
                        )
                      : 0;

                  return (
                    <div
                      key={config.facilityId}
                      className="rounded-xl border p-5"
                    >
                      {/* Facility header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">
                            <Building2 className="size-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {config.facilityName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              ID: {config.facilityId}
                              {config.customApiKey && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 gap-1 text-[10px]"
                                >
                                  <Key className="size-2.5" />
                                  Custom Key
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(v) =>
                            updateFacility(config.facilityId, { enabled: v })
                          }
                        />
                      </div>

                      {config.enabled && (
                        <div className="mt-4 space-y-4">
                          {/* Usage bar */}
                          <div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {(
                                  usage?.currentMonthTokens ?? 0
                                ).toLocaleString()}{" "}
                                tokens used
                              </span>
                              <span className="text-muted-foreground">
                                {config.monthlyTokenLimit > 0
                                  ? `${config.monthlyTokenLimit.toLocaleString()} limit`
                                  : "Unlimited"}
                              </span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  usagePct > 90
                                    ? "bg-red-500"
                                    : usagePct > 70
                                      ? "bg-amber-500"
                                      : "bg-emerald-500",
                                )}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Monthly Limit</Label>
                              <Input
                                type="number"
                                value={config.monthlyTokenLimit}
                                onChange={(e) =>
                                  updateFacility(config.facilityId, {
                                    monthlyTokenLimit: Number(e.target.value),
                                  })
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">AI Tone</Label>
                              <Select
                                value={config.tone}
                                onValueChange={(v) =>
                                  updateFacility(config.facilityId, {
                                    tone: v as
                                      | "warm"
                                      | "professional"
                                      | "playful",
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="warm">Warm</SelectItem>
                                  <SelectItem value="professional">
                                    Professional
                                  </SelectItem>
                                  <SelectItem value="playful">
                                    Playful
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">
                                Custom API Key (optional)
                              </Label>
                              <Input
                                type="password"
                                value={config.customApiKey}
                                onChange={(e) =>
                                  updateFacility(config.facilityId, {
                                    customApiKey: e.target.value,
                                  })
                                }
                                placeholder="Use platform key"
                                className="h-8 font-mono text-xs"
                              />
                            </div>
                          </div>

                          {/* Feature toggles */}
                          <div>
                            <Label className="text-xs">Enabled Features</Label>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {(
                                [
                                  {
                                    key: "evaluationSummaries" as const,
                                    label: "Evaluations",
                                  },
                                  {
                                    key: "reportCardSummaries" as const,
                                    label: "Report Cards",
                                  },
                                  {
                                    key: "chatReplies" as const,
                                    label: "Chat Replies",
                                  },
                                  {
                                    key: "emailMarketing" as const,
                                    label: "Email Marketing",
                                  },
                                  {
                                    key: "incidentNotes" as const,
                                    label: "Incident Notes",
                                  },
                                  {
                                    key: "generalNotes" as const,
                                    label: "General Notes",
                                  },
                                ] as const
                              ).map((feat) => (
                                <label
                                  key={feat.key}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-slate-50"
                                >
                                  <Switch
                                    checked={config.enabledFeatures[feat.key]}
                                    onCheckedChange={(v) =>
                                      updateFacility(config.facilityId, {
                                        enabledFeatures: {
                                          ...config.enabledFeatures,
                                          [feat.key]: v,
                                        },
                                      })
                                    }
                                    className="scale-75"
                                  />
                                  {feat.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Usage & Billing ─────────────────────────────────────── */}
        <TabsContent value="usage" className="space-y-4">
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {usageSummaries.map((summary) => {
              const pct =
                summary.monthlyLimit > 0
                  ? Math.min(
                      100,
                      (summary.currentMonthTokens / summary.monthlyLimit) * 100,
                    )
                  : 0;
              return (
                <Card key={summary.facilityId}>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {summary.facilityName}
                      </p>
                      {summary.usesCustomKey ? (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Key className="size-2.5" />
                          BYOK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Shield className="size-2.5" />
                          Platform
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {summary.currentMonthTokens.toLocaleString()} tokens
                        </span>
                        <span className="font-medium">
                          ${summary.estimatedCost.toFixed(4)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            pct > 90
                              ? "bg-red-500"
                              : pct > 70
                                ? "bg-amber-500"
                                : "bg-blue-500",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-muted-foreground text-[10px]">
                        {summary.totalRequests} requests ·{" "}
                        {summary.lastUsed
                          ? `Last used ${new Date(summary.lastUsed).toLocaleDateString()}`
                          : "Never used"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-5" />
                Request Log
              </CardTitle>
              <CardDescription>
                Detailed log of all AI requests across facilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiUsageRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm font-medium">
                        {record.facilityName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {record.type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[10px]">
                        {record.model
                          .replace("claude-", "")
                          .replace("-20251001", "")}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {record.inputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {record.outputTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {record.totalTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        ${record.cost.toFixed(5)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(record.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
