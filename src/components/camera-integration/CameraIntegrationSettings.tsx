"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Moon,
  Move,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cameraIntegrationConfig as initialConfig,
  petCamAccessConfigs as initialAccessConfigs,
} from "@/data/camera-integration";
import { petCams } from "@/data/additional-features";
import type {
  CameraIntegrationConfig,
  PetCamAccessConfig,
  CameraProvider,
} from "@/types/camera-integration";
import { CameraAccessRulesDialog } from "./CameraAccessRulesDialog";
import type { PetCam } from "@/data/additional-features";
import { toast } from "sonner";

const PROVIDER_META = {
  idogcam: {
    name: "iDogCam",
    tagline: "Premium smart kennel cameras",
  },
  abckam: {
    name: "abcKam",
    tagline: "Professional pet monitoring cameras",
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
        "flex items-center gap-3 rounded-md border p-4 text-left transition-colors",
        "hover:bg-accent/50",
        "data-[selected=true]:border-primary data-[selected=true]:bg-accent/40",
      )}
    >
      <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
        <Camera className="text-muted-foreground size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{meta.name}</p>
          {isConnected && isSelected && (
            <Badge
              variant="outline"
              className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
            >
              <CheckCircle2 className="mr-1 size-3" />
              Connected
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground truncate text-xs">{meta.tagline}</p>
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
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={secret && !showSecret ? "password" : "text"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={secret ? "pr-10" : undefined}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
          >
            {showSecret ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function CameraStatusBadge({ isOnline }: { isOnline: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        isOnline
          ? "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
          : "border-red-200 text-red-700 dark:border-red-800 dark:text-red-400",
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

function AccessRuleSummary({ config }: { config: PetCamAccessConfig }) {
  if (!config.isCustomerVisible) {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <EyeOff className="size-3" /> Staff only
      </span>
    );
  }
  if (config.useGlobalRules) {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Globe className="size-3" /> Global rules
      </span>
    );
  }
  const ruleCount = config.customRuleSet?.rules.length ?? 0;
  return (
    <span className="text-muted-foreground flex items-center gap-1 text-xs">
      <Lock className="size-3" />
      {ruleCount} custom rule{ruleCount !== 1 ? "s" : ""}
    </span>
  );
}

export function CameraIntegrationSettings() {
  const [config, setConfig] = useState<CameraIntegrationConfig>(initialConfig);
  const [accessConfigs, setAccessConfigs] = useState<
    Record<string, PetCamAccessConfig>
  >(initialAccessConfigs);
  const [credentials, setCredentials] = useState({
    idogcam: {
      kennelId: initialConfig.credentials.idogcam?.kennelId ?? "",
      erpCode: initialConfig.credentials.idogcam?.erpCode ?? "",
    },
    abckam: {
      apiKey: initialConfig.credentials.abckam?.apiKey ?? "",
    },
  });
  const [connecting, setConnecting] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<PetCam | null>(null);

  const onlineCams = petCams.filter((c) => c.isOnline).length;

  function handleProviderSelect(provider: CameraProvider) {
    setConfig((prev) => ({
      ...prev,
      provider,
      connectionStatus: "disconnected",
    }));
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
            ? {
                kennelId: credentials.idogcam.kennelId,
                erpCode: credentials.idogcam.erpCode,
                isVerified: true,
              }
            : { apiKey: credentials.abckam.apiKey, isVerified: true }),
        },
      },
    }));
    setConnecting(false);
    toast.success(`${PROVIDER_META[config.provider!].name} is now active.`);
  }

  function handleSaveAccessConfig(
    camera: PetCam,
    newConfig: PetCamAccessConfig,
  ) {
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
      {/* Feature toggle + status */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Feature Status</CardTitle>
              <CardDescription>
                Enable or disable live camera access for pet parents.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">
                {config.isEnabled ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={config.isEnabled}
                onCheckedChange={handleToggleEnabled}
              />
            </div>
          </div>
        </CardHeader>
        {isConnected && (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs">Provider</p>
                <p className="text-sm font-medium">
                  {config.provider
                    ? PROVIDER_META[config.provider].name
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cameras Online</p>
                <p className="text-sm font-medium">
                  {onlineCams} / {petCams.length}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">Last Sync</p>
                  <p className="text-sm font-medium">
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
                <Button size="sm" variant="outline">
                  <RefreshCw className="mr-1.5 size-3.5" />
                  Sync
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Provider selection */}
      <Card>
        <CardHeader>
          <CardTitle>Camera Provider</CardTitle>
          <CardDescription>
            Connect to your camera system to import and manage cameras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
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
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {PROVIDER_META[config.provider].name} Credentials
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Obtain these from your{" "}
                      {PROVIDER_META[config.provider].name} account manager.
                    </p>
                  </div>
                  {isConnected ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="mr-1 size-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <WifiOff className="mr-1 size-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {config.provider === "idogcam" ? (
                    <>
                      <CredentialField
                        label="Kennel ID"
                        placeholder="DGV-MTL-001"
                        secret={false}
                        value={credentials.idogcam.kennelId}
                        onChange={(v) =>
                          setCredentials((p) => ({
                            ...p,
                            idogcam: { ...p.idogcam, kennelId: v },
                          }))
                        }
                      />
                      <CredentialField
                        label="ERP Code"
                        placeholder="Enter ERP code"
                        secret={true}
                        value={credentials.idogcam.erpCode}
                        onChange={(v) =>
                          setCredentials((p) => ({
                            ...p,
                            idogcam: { ...p.idogcam, erpCode: v },
                          }))
                        }
                      />
                    </>
                  ) : (
                    <CredentialField
                      label="API Key"
                      placeholder="Enter your abcKam API key"
                      secret={true}
                      value={credentials.abckam.apiKey}
                      onChange={(v) =>
                        setCredentials((p) => ({
                          ...p,
                          abckam: { apiKey: v },
                        }))
                      }
                    />
                  )}
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={connecting}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Default access rules */}
      <Card>
        <CardHeader>
          <CardTitle>Facility-Wide Default Rules</CardTitle>
          <CardDescription>
            These rules apply to all cameras set to &quot;Use global
            defaults.&quot; Individual cameras can override these.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {config.globalRuleSet.rules.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No default rules configured.
              </p>
            ) : (
              config.globalRuleSet.rules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <CircleDot className="text-primary size-2.5 shrink-0" />
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
            <p className="text-muted-foreground pt-1 text-right text-xs">
              Logic: Grant access if customer meets{" "}
              <strong>
                {config.globalRuleSet.logic === "any" ? "ANY" : "ALL"}
              </strong>{" "}
              rule(s)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Camera library */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Camera Library</CardTitle>
              <CardDescription>
                Configure customer visibility and access rules for each camera.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {onlineCams} of {petCams.length} online
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {petCams.map((camera) => {
            const camConfig = accessConfigs[camera.id] ?? {
              isCustomerVisible: false,
              cameraType: "public" as const,
              useGlobalRules: true,
            };
            return (
              <div
                key={camera.id}
                className="hover:bg-accent/30 flex items-center gap-4 rounded-md border p-4 transition-colors"
              >
                <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="text-muted-foreground size-6" />
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
                    <Badge variant="outline">
                      {camConfig.cameraType === "public" ? (
                        <>
                          <Globe className="mr-1 size-2.5" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="mr-1 size-2.5" />
                          Private
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {camera.location}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <AccessRuleSummary config={camConfig} />
                    {camera.hasAudio && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Volume2 className="size-3" /> Audio
                      </span>
                    )}
                    {camera.hasPanTilt && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Move className="size-3" /> Pan/Tilt
                      </span>
                    )}
                    {camera.hasNightVision && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Moon className="size-3" /> Night Vision
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-muted-foreground text-xs">
                      Customer Access
                    </span>
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
                    onClick={() => setSelectedCamera(camera)}
                  >
                    <Settings2 className="mr-1.5 size-3.5" />
                    Configure
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

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
