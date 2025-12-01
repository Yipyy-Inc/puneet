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
  Upload,
} from "lucide-react";
import { mobileAppSettings } from "@/data/additional-features";
import { Badge } from "@/components/ui/badge";

export function MobileAppSettings() {
  const [settings, setSettings] = useState(mobileAppSettings);

  return (
    <div className="space-y-6">
      {/* App Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={settings.appName}
                onChange={(e) =>
                  setSettings({ ...settings, appName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain</Label>
              <Input
                id="customDomain"
                value={settings.customDomain || ""}
                placeholder="app.yourfacility.com"
                onChange={(e) =>
                  setSettings({ ...settings, customDomain: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>App Icon</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 bg-slate-100 rounded-lg border-2 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    {settings.appIcon}
                  </p>
                  <Button size="sm" variant="outline">
                    <Upload className="h-3 w-3 mr-2" />
                    Upload Icon
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 1024x1024px PNG
              </p>
            </div>

            <div className="space-y-2">
              <Label>Splash Screen</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 bg-slate-100 rounded-lg border-2 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    {settings.splashScreen}
                  </p>
                  <Button size="sm" variant="outline">
                    <Upload className="h-3 w-3 mr-2" />
                    Upload Image
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 2048x2732px PNG
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, primaryColor: e.target.value })
                  }
                  className="w-20 h-10"
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
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, secondaryColor: e.target.value })
                  }
                  className="w-20 h-10"
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
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) =>
                    setSettings({ ...settings, accentColor: e.target.value })
                  }
                  className="w-20 h-10"
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
          <div className="p-4 border rounded-lg bg-slate-50">
            <p className="text-sm font-medium mb-3">Preview</p>
            <div className="flex gap-3">
              <div
                className="h-16 w-16 rounded-lg shadow-sm border-2"
                style={{ backgroundColor: settings.primaryColor }}
              />
              <div
                className="h-16 w-16 rounded-lg shadow-sm border-2"
                style={{ backgroundColor: settings.secondaryColor }}
              />
              <div
                className="h-16 w-16 rounded-lg shadow-sm border-2"
                style={{ backgroundColor: settings.accentColor }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Store Links */}
      <Card>
        <CardHeader>
          <CardTitle>App Store Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="iosAppId">iOS App ID</Label>
              <Input
                id="iosAppId"
                value={settings.iosAppId || ""}
                placeholder="com.yourfacility.app"
                onChange={(e) =>
                  setSettings({ ...settings, iosAppId: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="androidPackageName">Android Package Name</Label>
              <Input
                id="androidPackageName"
                value={settings.androidPackageName || ""}
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
              <Label htmlFor="appStoreUrl">App Store URL</Label>
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
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="playStoreUrl">Play Store URL</Label>
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
                      <ExternalLink className="h-3 w-3" />
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
          <CardTitle>Feature Toggles</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Control which features are available in the mobile app
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Enable push notifications for bookings, updates, etc.
                </p>
              </div>
              <Switch
                checked={settings.enablePushNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enablePushNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">In-App Messaging</p>
                <p className="text-sm text-muted-foreground">
                  Chat with customers directly in the app
                </p>
              </div>
              <Switch
                checked={settings.enableInAppMessaging}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableInAppMessaging: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Live Camera Access</p>
                <p className="text-sm text-muted-foreground">
                  Let customers view live pet cameras
                </p>
              </div>
              <Switch
                checked={settings.enableLiveCamera}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableLiveCamera: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Booking Flow</p>
                <p className="text-sm text-muted-foreground">
                  Allow customers to book services via app
                </p>
              </div>
              <Switch
                checked={settings.enableBookingFlow}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableBookingFlow: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Loyalty Program</p>
                <p className="text-sm text-muted-foreground">
                  Show loyalty points and rewards
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
          <CardTitle>Legal & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="termsUrl">Terms of Service URL</Label>
              <Input
                id="termsUrl"
                value={settings.termsOfServiceUrl}
                onChange={(e) =>
                  setSettings({ ...settings, termsOfServiceUrl: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
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
          <Badge variant="secondary">White-Label Ready</Badge>
          <Badge variant="outline">iOS & Android</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

