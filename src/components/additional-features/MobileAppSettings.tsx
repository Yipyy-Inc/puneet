"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Smartphone,
  Palette,
  Image as ImageIcon,
  ExternalLink,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useMobileAppConfig,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import type { MobileAppConfig } from "@/lib/settings/mobile-app";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { SETTINGS_CARD_GRID } from "@/components/ui/settings-card-grid";

// ── NOTHING RENDERS UNTIL THE FACILITY'S OWN CONFIG HAS ARRIVED ────────────
//
// The editor seeds useState from what it is handed and a useState initialiser
// runs ONCE, so mounting against the empty fallback and letting the query land
// afterwards would show a blank app identity whatever the facility had saved,
// and the first Save would write that emptiness back over it. This is the shape
// check:settings-seeding exists to catch.
export function MobileAppSettings() {
  const { config, configured, isPending } = useMobileAppConfig();

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <MobileAppEditor
      key={configured ? "stored" : "empty"}
      initialConfig={config}
    />
  );
}

function MobileAppEditor({
  initialConfig,
}: {
  initialConfig: MobileAppConfig;
}) {
  const t = useSettingsText().section("mobile-app");
  const saveSetting = useSaveFacilitySetting();
  const [settings, setSettings] = useState<MobileAppConfig>(initialConfig);
  const [savedSettings, setSavedSettings] =
    useState<MobileAppConfig>(initialConfig);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // What is on screen, as a file. No request and nothing to persist — it reads
  // the draft the person is looking at, which is what "export what I have
  // configured" means.
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${settings.appName.trim() || "mobile-app"}-config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    saveSetting.mutate(
      { domain: "mobile_app_config", value: settings },
      {
        onSuccess: () => {
          setSavedSettings(settings);
          toast.success(t("saved"));
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t("notSaved")),
      },
    );
  };

  return (
    <div className={SETTINGS_CARD_GRID}>
      {/* App Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            {t("appIdentity")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appName">{t("appName")}</Label>
              <Input
                id="appName"
                value={settings.appName}
                onChange={(e) =>
                  setSettings({ ...settings, appName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomain">{t("customDomain")}</Label>
              <Input
                id="customDomain"
                value={settings.customDomain || ""}
                // french-ok: an example domain, identical in both languages
                placeholder="app.yourfacility.com"
                onChange={(e) =>
                  setSettings({ ...settings, customDomain: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="app-icon-url">{t("appIcon")}</Label>
              {/* Was a read-only line of text under an Upload button with no
                  onClick and no file input. There is no image store to upload
                  to yet, and a button that does nothing is worse than a field
                  that works: the value is a URL, so this edits the URL and the
                  save persists it. The upload replaces this when there is
                  somewhere to put a file. */}
              <div className="flex items-center gap-3">
                <div className="border-line bg-surface-inset flex size-16 items-center justify-center rounded-lg border">
                  <ImageIcon className="text-ink-disabled size-8" />
                </div>
                <Input
                  id="app-icon-url"
                  value={settings.appIcon}
                  placeholder="https://…/app-icon.png"
                  onChange={(e) =>
                    setSettings({ ...settings, appIcon: e.target.value })
                  }
                />
              </div>
              <p className="text-ink-tertiary text-xs">
                {t("iconRecommended")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="splash-url">{t("splashScreen")}</Label>
              <div className="flex items-center gap-3">
                <div className="border-line bg-surface-inset flex size-16 items-center justify-center rounded-lg border">
                  <ImageIcon className="text-ink-disabled size-8" />
                </div>
                <Input
                  id="splash-url"
                  value={settings.splashScreen}
                  placeholder="https://…/splash.png"
                  onChange={(e) =>
                    setSettings({ ...settings, splashScreen: e.target.value })
                  }
                />
              </div>
              <p className="text-ink-tertiary text-xs">
                {t("splashRecommended")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-5" />
            {t("brandingColours")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t("primaryColour")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, primaryColor: e.target.value })
                  }
                  className="h-10 w-20"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, primaryColor: e.target.value })
                  }
                  className="flex-1 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">{t("secondaryColour")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, secondaryColor: e.target.value })
                  }
                  className="h-10 w-20"
                />
                <Input
                  value={settings.secondaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, secondaryColor: e.target.value })
                  }
                  className="flex-1 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">{t("accentColour")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) =>
                    setSettings({ ...settings, accentColor: e.target.value })
                  }
                  className="h-10 w-20"
                />
                <Input
                  value={settings.accentColor}
                  onChange={(e) =>
                    setSettings({ ...settings, accentColor: e.target.value })
                  }
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="mb-3 text-sm font-medium">{t("preview")}</p>
            <div className="flex gap-3">
              <div
                className="h-16 w-16 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: settings.primaryColor }}
              />
              <div
                className="h-16 w-16 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: settings.secondaryColor }}
              />
              <div
                className="h-16 w-16 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: settings.accentColor }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Store Links */}
      <Card>
        <CardHeader>
          <CardTitle>{t("appStoreLinks")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="iosAppId">{t("iosAppId")}</Label>
              <Input
                id="iosAppId"
                value={settings.iosAppId || ""}
                // french-ok: an example bundle id, identical in both languages
                placeholder="com.yourfacility.app"
                onChange={(e) =>
                  setSettings({ ...settings, iosAppId: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="androidPackageName">{t("androidPackage")}</Label>
              <Input
                id="androidPackageName"
                value={settings.androidPackageName || ""}
                // french-ok: an example package name, identical in both languages
                placeholder="com.yourfacility.app"
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    androidPackageName: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appStoreUrl">{t("appStoreUrl")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="appStoreUrl"
                  value={settings.appStoreUrl || ""}
                  placeholder="https://apps.apple.com/..."
                  onChange={(e) =>
                    setSettings({ ...settings, appStoreUrl: e.target.value })
                  }
                />
                {settings.appStoreUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={settings.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="playStoreUrl">{t("playStoreUrl")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="playStoreUrl"
                  value={settings.playStoreUrl || ""}
                  placeholder="https://play.google.com/..."
                  onChange={(e) =>
                    setSettings({ ...settings, playStoreUrl: e.target.value })
                  }
                />
                {settings.playStoreUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={settings.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>{t("featureToggles")}</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("featureTogglesHelp")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex-1">
                <p className="font-medium">{t("pushNotifications")}</p>
                <p className="text-muted-foreground text-sm">
                  {t("pushNotificationsHelp")}
                </p>
              </div>
              <Switch
                checked={settings.enablePushNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enablePushNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex-1">
                <p className="font-medium">{t("inAppMessaging")}</p>
                <p className="text-muted-foreground text-sm">
                  {t("inAppMessagingHelp")}
                </p>
              </div>
              <Switch
                checked={settings.enableInAppMessaging}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableInAppMessaging: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex-1">
                <p className="font-medium">{t("liveCamera")}</p>
                <p className="text-muted-foreground text-sm">
                  {t("liveCameraHelp")}
                </p>
              </div>
              <Switch
                checked={settings.enableLiveCamera}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableLiveCamera: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex-1">
                <p className="font-medium">{t("bookingFlow")}</p>
                <p className="text-muted-foreground text-sm">
                  {t("bookingFlowHelp")}
                </p>
              </div>
              <Switch
                checked={settings.enableBookingFlow}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableBookingFlow: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex-1">
                <p className="font-medium">{t("loyaltyProgram")}</p>
                <p className="text-muted-foreground text-sm">
                  {t("loyaltyProgramHelp")}
                </p>
              </div>
              <Switch
                checked={settings.enableLoyaltyProgram}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableLoyaltyProgram: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Links */}
      <Card>
        <CardHeader>
          <CardTitle>{t("legalAndCompliance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="termsUrl">{t("termsUrl")}</Label>
              <Input
                id="termsUrl"
                value={settings.termsOfServiceUrl}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    termsOfServiceUrl: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacyUrl">{t("privacyUrl")}</Label>
              <Input
                id="privacyUrl"
                value={settings.privacyPolicyUrl}
                onChange={(e) =>
                  setSettings({ ...settings, privacyPolicyUrl: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t("whiteLabelReady")}</Badge>
          <Badge variant="outline">iOS & Android</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <p className="text-ink-tertiary text-sm">{t("unsavedChanges")}</p>
          )}
          {/* Both of these had NO onClick — not a stub, not a toast, nothing.
              "Export Config" is a pure function of what is on screen, so it is
              wired here rather than left as a button that lies about being one.
              §5q: a button is a verb plus its object. */}
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 size-4" />
            {t("downloadConfig")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || saveSetting.isPending}
          >
            {saveSetting.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
