"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  Video,
  CircleDot,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  RefreshCw,
  Lock,
  Globe,
  Plug,
  Moon,
  Move,
  Volume2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cameraIntegrationConfig as initialConfig,
  petCamAccessConfigs as initialAccessConfigs,
} from "@/data/camera-integration";
import { petCams } from "@/data/additional-features";
import type { CameraIntegrationConfig, PetCamAccessConfig, CameraProvider } from "@/types/camera-integration";
import { CameraAccessRulesDialog } from "./CameraAccessRulesDialog";
import type { PetCam } from "@/data/additional-features";
import { toast } from "sonner";

const PROVIDER_META = {
  idogcam: {
    name: "iDogCam",
    tagline: "Premium smart kennel cameras",
    color: "from-blue-500 to-cyan-500",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    credentialFields: [
      { key: "kennelId", label: "Kennel ID", placeholder: "DGV-MTL-001", secret: false },
      { key: "erpCode", label: "ERP Code", placeholder: "Enter ERP code", secret: true },
    ],
  },
  abckam: {
    name: "abcKam",
    tagline: "Professional pet monitoring cameras",
    color: "from-emerald-500 to-teal-500",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    credentialFields: [
      { key: "moegopetId", label: "Moegopetid", placeholder: "Enter your Moegopetid", secret: true },
    ],
  },
} as const;

function ProviderCard({
  provider,
  isSelected,
  isConnected,
  onSelect,
}: {
  provider: CameraProvider;
  isSelected: boolean;
  isConnected: boolean;
  onSelect: () => void;
}) {
  const meta = PROVIDER_META[provider];
  return (
    <button
      type="button"
      onClick={onSelect}
      data-selected={isSelected}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all",
        "border-border hover:border-primary/40 hover:shadow-md",
        "data-[selected=true]:border-primary data-[selected=true]:shadow-lg data-[selected=true]:shadow-primary/10",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity",
          `${meta.color}`,
          "group-data-[selected=true]:opacity-5",
        )}
      />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl bg-gradient-to-br",
              meta.color,
            )}
          >
            <Camera className="size-5 text-white" />
          </div>
          {isConnected && isSelected && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mr-1 size-3" />
              Connected
            </Badge>
          )}
        </div>
        <div>
          <p className="font-semibold">{meta.name}</p>
          <p className="text-muted-foreground text-xs">{meta.tagline}</p>
        </div>
        {isSelected && (
          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            Selected
            <ChevronRight className="size-3" />
          </div>
        )}
      </div>
    </button>
  );
}

function CredentialField({
  label,
  placeholder,
  secret,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  secret: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [showSecret, setShowSecret] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input
          type={secret && !showSecret ? "password" : "text"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-sm pr-10"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function CameraStatusBadge({ isOnline }: { isOnline: boolean }) {
  return (
    <Badge
      className={cn(
        "text-xs",
        isOnline
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-red-500/10 text-red-700 dark:text-red-400",
      )}
    >
      {isOnline ? (
        <>
          <CircleDot className="mr-1 size-2.5 animate-pulse" />
          Live
        </>
      ) : (
        <>
          <AlertCircle className="mr-1 size-2.5" />
          Offline
        </>
      )}
    </Badge>
  );
}

function AccessRuleSummary({ config, isGlobal }: { config: PetCamAccessConfig; isGlobal?: boolean }) {
  if (!config.isCustomerVisible) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <EyeOff className="size-3" /> Staff only
      </span>
    );
  }
  if (config.useGlobalRules) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Globe className="size-3" /> Global rules
      </span>
    );
  }
  const ruleCount = config.customRuleSet?.rules.length ?? 0;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Lock className="size-3" />
      {ruleCount} custom rule{ruleCount !== 1 ? "s" : ""}
    </span>
  );
}

export function CameraIntegrationSettings() {
  const [config, setConfig] = useState<CameraIntegrationConfig>(initialConfig);
  const [accessConfigs, setAccessConfigs] = useState<Record<string, PetCamAccessConfig>>(
    initialAccessConfigs,
  );
  const [credentials, setCredentials] = useState({
    idogcam: {
      kennelId: initialConfig.credentials.idogcam?.kennelId ?? "",
      erpCode: initialConfig.credentials.idogcam?.erpCode ?? "",
    },
    abckam: {
      moegopetId: initialConfig.credentials.abckam?.moegopetId ?? "",
    },
  });
  const [connecting, setConnecting] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<PetCam | null>(null);

  const onlineCams = petCams.filter((c) => c.isOnline).length;

  function handleProviderSelect(provider: CameraProvider) {
    setConfig((prev) => ({ ...prev, provider, connectionStatus: "disconnected" }));
  }

  async function handleConnect() {
    if (!config.provider) return;
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setConfig((prev) => ({
      ...prev,
      connectionStatus: "connected",
      lastSyncAt: new Date().toISOString(),
      credentials: {
        ...prev.credentials,
        [config.provider!]: {
          ...(config.provider === "idogcam"
            ? { kennelId: credentials.idogcam.kennelId, erpCode: credentials.idogcam.erpCode, isVerified: true }
            : { moegopetId: credentials.abckam.moegopetId, isVerified: true }),
        },
      },
    }));
    setConnecting(false);
    toast.success(`${PROVIDER_META[config.provider!].name} is now active.`);
  }

  function handleSaveAccessConfig(camera: PetCam, newConfig: PetCamAccessConfig) {
    setAccessConfigs((prev) => ({ ...prev, [camera.id]: newConfig }));
    toast.success(`${camera.name} access rules updated.`);
  }

  function handleToggleEnabled(enabled: boolean) {
    setConfig((prev) => ({ ...prev, isEnabled: enabled }));
    toast.success(
      enabled
        ? "Live cameras enabled — customers can now view cameras."
        : "Live cameras disabled for all customers.",
    );
  }

  const isConnected = config.connectionStatus === "connected";

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <Card className="overflow-hidden">
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Video className="size-5 text-blue-400" />
                <h2 className="text-lg font-semibold">Live Pet Cam</h2>
                <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                  <Sparkles className="mr-1 size-2.5" />
                  Integration
                </Badge>
              </div>
              <p className="max-w-sm text-sm text-slate-400">
                Give pet parents real-time peace of mind with configurable live camera access.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">Feature Status</p>
                <p className="text-sm font-medium">{config.isEnabled ? "Active" : "Inactive"}</p>
              </div>
              <Switch
                checked={config.isEnabled}
                onCheckedChange={handleToggleEnabled}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>
          </div>

          {isConnected && (
            <div className="relative mt-4 flex items-center gap-6 border-t border-white/10 pt-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Provider</p>
                <p className="font-medium">{config.provider ? PROVIDER_META[config.provider].name : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Cameras Online</p>
                <p className="font-medium">{onlineCams} / {petCams.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Last Sync</p>
                <p className="font-medium">
                  {config.lastSyncAt
                    ? new Date(config.lastSyncAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="mr-1.5 size-3.5" />
                Sync Cameras
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Provider Selection */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Plug className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Camera Provider</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Connect to your camera system to import and manage cameras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(["idogcam", "abckam"] as CameraProvider[]).map((p) => (
              <ProviderCard
                key={p}
                provider={p}
                isSelected={config.provider === p}
                isConnected={isConnected}
                onSelect={() => handleProviderSelect(p)}
              />
            ))}
          </div>

          {config.provider && (
            <div className="rounded-2xl border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {PROVIDER_META[config.provider].name} Credentials
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Obtain these from your {PROVIDER_META[config.provider].name} account manager.
                  </p>
                </div>
                {isConnected ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="mr-1 size-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <WifiOff className="mr-1 size-3" />
                    Not Connected
                  </Badge>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {config.provider === "idogcam" ? (
                  <>
                    <CredentialField
                      label="Kennel ID"
                      placeholder="DGV-MTL-001"
                      secret={false}
                      value={credentials.idogcam.kennelId}
                      onChange={(v) =>
                        setCredentials((p) => ({ ...p, idogcam: { ...p.idogcam, kennelId: v } }))
                      }
                    />
                    <CredentialField
                      label="ERP Code"
                      placeholder="Enter ERP code"
                      secret={true}
                      value={credentials.idogcam.erpCode}
                      onChange={(v) =>
                        setCredentials((p) => ({ ...p, idogcam: { ...p.idogcam, erpCode: v } }))
                      }
                    />
                  </>
                ) : (
                  <CredentialField
                    label="Moegopetid"
                    placeholder="Enter your Moegopetid"
                    secret={true}
                    value={credentials.abckam.moegopetId}
                    onChange={(v) =>
                      setCredentials((p) => ({ ...p, abckam: { moegopetId: v } }))
                    }
                  />
                )}
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full sm:w-auto"
                size="sm"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Connecting…
                  </>
                ) : isConnected ? (
                  <>
                    <RefreshCw className="mr-2 size-3.5" />
                    Reconnect
                  </>
                ) : (
                  <>
                    <Wifi className="mr-2 size-3.5" />
                    Connect Provider
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Access Rules */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Facility-Wide Default Rules</CardTitle>
          </div>
          <CardDescription className="text-xs">
            These rules apply to all cameras set to &quot;Use global defaults.&quot; Individual cameras can override these.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
            {config.globalRuleSet.rules.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No default rules configured.
              </p>
            ) : (
              config.globalRuleSet.rules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm"
                >
                  <CircleDot className="size-2.5 shrink-0 text-primary" />
                  <span className="capitalize">
                    {rule.type === "active_stay"
                      ? `Active Stay (${rule.services.join(", ")})`
                      : rule.type === "operation_hours"
                        ? "During operating hours"
                        : rule.type === "membership"
                          ? `Membership: ${rule.membershipPlanIds.length} plan(s)`
                          : rule.type === "package"
                            ? `Package: ${rule.packageIds.length} package(s)`
                            : `Service customer (${rule.services.join(", ")})`}
                  </span>
                </div>
              ))
            )}
            <div className="pt-1 text-right">
              <span className="text-muted-foreground text-xs">
                Logic: Grant access if customer meets{" "}
                <strong>{config.globalRuleSet.logic === "any" ? "ANY" : "ALL"}</strong> rule(s)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Camera Library</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {onlineCams} of {petCams.length} online
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Configure customer visibility and access rules for each camera.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {petCams.map((camera) => {
            const camConfig = accessConfigs[camera.id] ?? {
              isCustomerVisible: false,
              cameraType: "public",
              useGlobalRules: true,
            };
            return (
              <div
                key={camera.id}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm"
              >
                {/* Camera preview thumbnail */}
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <Video className="size-6 text-slate-600" />
                  </div>
                  {camera.isOnline && (
                    <div className="absolute top-1 left-1 flex items-center gap-0.5 rounded-sm bg-red-600 px-1 py-0.5 text-[9px] leading-none text-white">
                      <CircleDot className="size-1.5 animate-pulse" />
                      LIVE
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{camera.name}</span>
                    <CameraStatusBadge isOnline={camera.isOnline} />
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        camConfig.cameraType === "public"
                          ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400"
                          : "border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-400",
                      )}
                    >
                      {camConfig.cameraType === "public" ? (
                        <><Globe className="mr-1 size-2.5" />Public</>
                      ) : (
                        <><Lock className="mr-1 size-2.5" />Private</>
                      )}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">{camera.location}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <AccessRuleSummary config={camConfig} />
                    {camera.hasAudio && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Volume2 className="size-3" /> Audio
                      </span>
                    )}
                    {camera.hasPanTilt && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Move className="size-3" /> Pan/Tilt
                      </span>
                    )}
                    {camera.hasNightVision && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Moon className="size-3" /> Night Vision
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-muted-foreground text-xs">Customer Access</span>
                    <Switch
                      checked={camConfig.isCustomerVisible}
                      onCheckedChange={(v) => {
                        setAccessConfigs((prev) => ({
                          ...prev,
                          [camera.id]: { ...camConfig, isCustomerVisible: v },
                        }));
                      }}
                    />
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setSelectedCamera(camera)}
                  >
                    <Settings2 className="size-3.5" />
                    Configure
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Access Rules Dialog */}
      {selectedCamera && (
        <CameraAccessRulesDialog
          camera={selectedCamera}
          accessConfig={
            accessConfigs[selectedCamera.id] ?? {
              isCustomerVisible: false,
              cameraType: "public",
              useGlobalRules: true,
            }
          }
          globalRuleSet={config.globalRuleSet}
          open={!!selectedCamera}
          onClose={() => setSelectedCamera(null)}
          onSave={(cfg) => handleSaveAccessConfig(selectedCamera, cfg)}
        />
      )}
    </div>
  );
}
