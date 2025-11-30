/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  brandingSettings,
  supportedLanguages,
  supportedCurrencies,
  systemDefaults,
  emailTemplates,
  timezones,
  dateFormatOptions,
  timeFormatOptions,
  colorPresets,
  type BrandingSettings,
  type LanguageOption,
  type CurrencyOption,
  type SystemDefaults,
} from "@/data/global-settings";
import {
  Palette,
  Languages,
  DollarSign,
  Settings,
  Globe,
  Mail,
  Save,
  Check,
  X,
  Clock,
  Calendar,
  Shield,
  Bell,
  FileText,
  Upload,
  Link,
  Moon,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Edit,
} from "lucide-react";

export function GlobalSettings() {
  const [branding, setBranding] = useState<BrandingSettings>(brandingSettings);
  const [languages, setLanguages] =
    useState<LanguageOption[]>(supportedLanguages);
  const [currencies, setCurrencies] =
    useState<CurrencyOption[]>(supportedCurrencies);
  const [defaults, setDefaults] = useState<SystemDefaults>(systemDefaults);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorType, setSelectedColorType] = useState<
    "primary" | "secondary" | "accent"
  >("primary");
  const [showPreview, setShowPreview] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleBrandingChange = (field: keyof BrandingSettings, value: any) => {
    setBranding((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setBranding((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value },
    }));
    setUnsavedChanges(true);
  };

  const handleLanguageToggle = (code: string) => {
    setLanguages((prev) =>
      prev.map((lang) =>
        lang.code === code ? { ...lang, enabled: !lang.enabled } : lang,
      ),
    );
    setUnsavedChanges(true);
  };

  const handleDefaultLanguage = (code: string) => {
    setLanguages((prev) =>
      prev.map((lang) => ({
        ...lang,
        isDefault: lang.code === code,
        enabled: lang.code === code ? true : lang.enabled,
      })),
    );
    setUnsavedChanges(true);
  };

  const handleCurrencyToggle = (code: string) => {
    setCurrencies((prev) =>
      prev.map((curr) =>
        curr.code === code ? { ...curr, enabled: !curr.enabled } : curr,
      ),
    );
    setUnsavedChanges(true);
  };

  const handleDefaultCurrency = (code: string) => {
    setCurrencies((prev) =>
      prev.map((curr) => ({
        ...curr,
        isDefault: curr.code === code,
        enabled: curr.code === code ? true : curr.enabled,
      })),
    );
    setUnsavedChanges(true);
  };

  const handleDefaultsChange = (field: keyof SystemDefaults, value: any) => {
    setDefaults((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  const applyColorPreset = (preset: {
    primary: string;
    secondary: string;
    accent: string;
  }) => {
    setBranding((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
    setUnsavedChanges(true);
    setShowColorPicker(false);
  };

  const handleSave = () => {
    // Simulating save
    setUnsavedChanges(false);
    setShowSaveDialog(true);
    setTimeout(() => setShowSaveDialog(false), 2000);
  };

  const enabledLanguagesCount = languages.filter((l) => l.enabled).length;
  const enabledCurrenciesCount = currencies.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure branding, languages, currencies, and system defaults
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unsavedChanges && (
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-700 gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={!unsavedChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Active Languages
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {enabledLanguagesCount}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  of {languages.length} available
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Languages className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Active Currencies
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {enabledCurrenciesCount}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  of {currencies.length} available
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Email Templates
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {emailTemplates.filter((e) => e.enabled).length}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active templates
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Mail className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  System Status
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-green-600">
                  {defaults.maintenanceMode ? "Maintenance" : "Online"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {defaults.registrationEnabled
                    ? "Registration open"
                    : "Registration closed"}
                </p>
              </div>
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background: defaults.maintenanceMode
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                }}
              >
                <Globe className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="localization" className="gap-2">
            <Globe className="h-4 w-4" />
            Localization
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Settings className="h-4 w-4" />
            System Defaults
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Platform Identity */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Platform Identity
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Basic platform information and branding
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={branding.platformName}
                    onChange={(e) =>
                      handleBrandingChange("platformName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={branding.tagline}
                    onChange={(e) =>
                      handleBrandingChange("tagline", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="websiteUrl"
                        className="pl-9"
                        value={branding.websiteUrl}
                        onChange={(e) =>
                          handleBrandingChange("websiteUrl", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Click to upload
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">32x32 PNG</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Colors & Theme */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Colors & Theme
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customize the platform color scheme
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg border cursor-pointer"
                        style={{ backgroundColor: branding.primaryColor }}
                        onClick={() => {
                          setSelectedColorType("primary");
                          setShowColorPicker(true);
                        }}
                      />
                      <Input
                        className="w-24 font-mono text-xs"
                        value={branding.primaryColor}
                        onChange={(e) =>
                          handleBrandingChange("primaryColor", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg border cursor-pointer"
                        style={{ backgroundColor: branding.secondaryColor }}
                        onClick={() => {
                          setSelectedColorType("secondary");
                          setShowColorPicker(true);
                        }}
                      />
                      <Input
                        className="w-24 font-mono text-xs"
                        value={branding.secondaryColor}
                        onChange={(e) =>
                          handleBrandingChange("secondaryColor", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg border cursor-pointer"
                        style={{ backgroundColor: branding.accentColor }}
                        onClick={() => {
                          setSelectedColorType("accent");
                          setShowColorPicker(true);
                        }}
                      />
                      <Input
                        className="w-24 font-mono text-xs"
                        value={branding.accentColor}
                        onChange={(e) =>
                          handleBrandingChange("accentColor", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="mb-3 block">Color Presets</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                        onClick={() => applyColorPreset(preset)}
                      >
                        <div className="flex gap-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: preset.secondary }}
                          />
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Allow users to switch to dark theme
                    </p>
                  </div>
                  <Switch
                    checked={branding.darkModeEnabled}
                    onCheckedChange={(checked) =>
                      handleBrandingChange("darkModeEnabled", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Support Contact
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Contact information displayed to users
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={branding.supportEmail}
                    onChange={(e) =>
                      handleBrandingChange("supportEmail", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input
                    id="supportPhone"
                    value={branding.supportPhone}
                    onChange={(e) =>
                      handleBrandingChange("supportPhone", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailFooterText">Email Footer Text</Label>
                  <Textarea
                    id="emailFooterText"
                    rows={2}
                    value={branding.emailFooterText}
                    onChange={(e) =>
                      handleBrandingChange("emailFooterText", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Social Links
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Links to social media profiles
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Facebook</Label>
                  <Input
                    placeholder="https://facebook.com/..."
                    value={branding.socialLinks.facebook || ""}
                    onChange={(e) =>
                      handleSocialLinkChange("facebook", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter / X</Label>
                  <Input
                    placeholder="https://twitter.com/..."
                    value={branding.socialLinks.twitter || ""}
                    onChange={(e) =>
                      handleSocialLinkChange("twitter", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input
                    placeholder="https://instagram.com/..."
                    value={branding.socialLinks.instagram || ""}
                    onChange={(e) =>
                      handleSocialLinkChange("instagram", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input
                    placeholder="https://linkedin.com/company/..."
                    value={branding.socialLinks.linkedin || ""}
                    onChange={(e) =>
                      handleSocialLinkChange("linkedin", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Localization Tab */}
        <TabsContent value="localization" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Languages */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Supported Languages
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enable languages for your platform
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {languages.map((lang) => (
                    <div
                      key={lang.code}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        lang.enabled ? "bg-primary/5" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-8 text-center font-mono text-xs text-muted-foreground uppercase">
                          {lang.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{lang.name}</span>
                            <span className="text-sm text-muted-foreground">
                              ({lang.nativeName})
                            </span>
                            {lang.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${lang.completionPercentage}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {lang.completionPercentage}% translated
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!lang.isDefault && lang.enabled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleDefaultLanguage(lang.code)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Switch
                          checked={lang.enabled}
                          onCheckedChange={() =>
                            handleLanguageToggle(lang.code)
                          }
                          disabled={lang.isDefault}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Currencies */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Supported Currencies
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enable currencies for transactions
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currencies.map((curr) => (
                    <div
                      key={curr.code}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        curr.enabled ? "bg-primary/5" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-12 h-8 flex items-center justify-center rounded bg-muted font-mono text-sm font-bold">
                          {curr.symbol}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{curr.code}</span>
                            <span className="text-sm text-muted-foreground">
                              {curr.name}
                            </span>
                            {curr.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Exchange rate: {curr.exchangeRate} (vs USD)
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!curr.isDefault && curr.enabled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleDefaultCurrency(curr.code)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Switch
                          checked={curr.enabled}
                          onCheckedChange={() =>
                            handleCurrencyToggle(curr.code)
                          }
                          disabled={curr.isDefault}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Exchange rates last updated
                  </span>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Update Rates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Defaults Tab */}
        <TabsContent value="defaults" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Date & Time */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Date & Time Settings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Default date, time, and timezone settings
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Timezone</Label>
                  <Select
                    value={defaults.defaultTimezone}
                    onValueChange={(value) =>
                      handleDefaultsChange("defaultTimezone", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label} ({tz.offset})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select
                    value={defaults.defaultDateFormat}
                    onValueChange={(value) =>
                      handleDefaultsChange("defaultDateFormat", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormatOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select
                    value={defaults.defaultTimeFormat}
                    onValueChange={(value) =>
                      handleDefaultsChange("defaultTimeFormat", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeFormatOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Authentication and access controls
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={defaults.sessionTimeoutMinutes}
                      onChange={(e) =>
                        handleDefaultsChange(
                          "sessionTimeoutMinutes",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Login Attempts</Label>
                    <Input
                      type="number"
                      value={defaults.maxLoginAttempts}
                      onChange={(e) =>
                        handleDefaultsChange(
                          "maxLoginAttempts",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password Expiry (days)</Label>
                    <Input
                      type="number"
                      value={defaults.passwordExpiryDays}
                      onChange={(e) =>
                        handleDefaultsChange(
                          "passwordExpiryDays",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Password Length</Label>
                    <Input
                      type="number"
                      value={defaults.minPasswordLength}
                      onChange={(e) =>
                        handleDefaultsChange(
                          "minPasswordLength",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label>Require MFA</Label>
                    <p className="text-xs text-muted-foreground">
                      Enforce two-factor authentication
                    </p>
                  </div>
                  <Switch
                    checked={defaults.requireMfa}
                    onCheckedChange={(checked) =>
                      handleDefaultsChange("requireMfa", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Social Login</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable Google, Facebook login
                    </p>
                  </div>
                  <Switch
                    checked={defaults.allowSocialLogin}
                    onCheckedChange={(checked) =>
                      handleDefaultsChange("allowSocialLogin", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Registration & Trials */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Registration & Trials
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  User registration and trial settings
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Registration</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow new users to sign up
                    </p>
                  </div>
                  <Switch
                    checked={defaults.registrationEnabled}
                    onCheckedChange={(checked) =>
                      handleDefaultsChange("registrationEnabled", checked)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trial Period (days)</Label>
                  <Input
                    type="number"
                    value={defaults.trialPeriodDays}
                    onChange={(e) =>
                      handleDefaultsChange(
                        "trialPeriodDays",
                        parseInt(e.target.value),
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Duration of free trial for new facilities
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Mode */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Maintenance Mode
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Control system availability
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Maintenance Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Show maintenance page to all users
                    </p>
                  </div>
                  <Switch
                    checked={defaults.maintenanceMode}
                    onCheckedChange={(checked) =>
                      handleDefaultsChange("maintenanceMode", checked)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea
                    value={defaults.maintenanceMessage}
                    onChange={(e) =>
                      handleDefaultsChange("maintenanceMessage", e.target.value)
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Notification Channels */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Channels
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enable/disable notification methods
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Send notifications via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={defaults.enableEmailNotifications}
                    onCheckedChange={(checked) =>
                      handleDefaultsChange("enableEmailNotifications", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Send notifications via SMS
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={defaults.enableSmsNotifications}
                    onCheckedChange={(checked) =>
                      handleDefaultsChange("enableSmsNotifications", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Send browser/app push notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={defaults.enablePushNotifications}
                    onCheckedChange={(checked) =>
                      handleDefaultsChange("enablePushNotifications", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Templates */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Email Templates
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage email notification templates
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {emailTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {template.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {template.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {template.enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Color Picker Dialog */}
      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose Color</DialogTitle>
            <DialogDescription>
              Select a preset or enter a custom color
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {[
                "#ef4444",
                "#f97316",
                "#f59e0b",
                "#eab308",
                "#84cc16",
                "#22c55e",
                "#10b981",
                "#14b8a6",
                "#06b6d4",
                "#0ea5e9",
                "#3b82f6",
                "#6366f1",
                "#8b5cf6",
                "#a855f7",
                "#d946ef",
                "#ec4899",
                "#f43f5e",
                "#64748b",
              ].map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-primary transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    handleBrandingChange(
                      `${selectedColorType}Color` as keyof BrandingSettings,
                      color,
                    );
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
            <div className="space-y-2">
              <Label>Custom Color</Label>
              <Input
                type="color"
                className="w-full h-10"
                onChange={(e) => {
                  handleBrandingChange(
                    `${selectedColorType}Color` as keyof BrandingSettings,
                    e.target.value,
                  );
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Changes</DialogTitle>
            <DialogDescription>
              See how your branding changes will look
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: branding.primaryColor + "10" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  <span className="text-white text-xl font-bold">
                    {branding.platformName[0]}
                  </span>
                </div>
                <div>
                  <h3
                    className="text-xl font-bold"
                    style={{ color: branding.primaryColor }}
                  >
                    {branding.platformName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {branding.tagline}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  style={{ backgroundColor: branding.primaryColor }}
                  className="text-white"
                >
                  Primary Button
                </Button>
                <Button
                  variant="outline"
                  style={{
                    borderColor: branding.secondaryColor,
                    color: branding.secondaryColor,
                  }}
                >
                  Secondary Button
                </Button>
                <Badge style={{ backgroundColor: branding.accentColor }}>
                  Accent Badge
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Success Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle>Settings Saved</DialogTitle>
            <DialogDescription>
              Your global settings have been updated successfully.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
