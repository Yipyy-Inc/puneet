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
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    (typeof emailTemplates)[0] | null
  >(null);

  const handleUpdateRates = () => {
    setIsUpdatingRates(true);
    // Simulate API call
    setTimeout(() => {
      setCurrencies((prev) =>
        prev.map((curr) => ({
          ...curr,
          exchangeRate:
            curr.code === "USD"
              ? 1.0
              : curr.exchangeRate * (0.98 + Math.random() * 0.04),
        })),
      );
      setIsUpdatingRates(false);
    }, 1500);
  };

  const handleBrandingChange = (
    field: keyof BrandingSettings,
    value: BrandingSettings[keyof BrandingSettings],
  ) => {
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

  const handleDefaultsChange = (
    field: keyof SystemDefaults,
    value: SystemDefaults[keyof SystemDefaults],
  ) => {
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
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            <Settings className="size-5" />
            Global Settings
          </h3>
          <p className="text-muted-foreground text-sm">
            Configure branding, languages, currencies, and system defaults
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unsavedChanges && (
            <Badge
              variant="secondary"
              className="gap-1 bg-yellow-100 text-yellow-700"
            >
              <AlertTriangle className="size-3" />
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 size-4" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={!unsavedChanges}>
            <Save className="mr-2 size-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Active Languages
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {enabledLanguagesCount}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  of {languages.length} available
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                }}
              >
                <Languages className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Active Currencies
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {enabledCurrenciesCount}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  of {currencies.length} available
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <DollarSign className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Email Templates
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {emailTemplates.filter((e) => e.enabled).length}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Active templates
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                }}
              >
                <Mail className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  System Status
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-green-600">
                  {defaults.maintenanceMode ? "Maintenance" : "Online"}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {defaults.registrationEnabled
                    ? "Registration open"
                    : "Registration closed"}
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: defaults.maintenanceMode
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                }}
              >
                <Globe className="size-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:inline-grid lg:w-auto">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="size-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="localization" className="gap-2">
            <Globe className="size-4" />
            Localization
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Settings className="size-4" />
            System Defaults
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Platform Identity */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="size-5" />
                  Platform Identity
                </CardTitle>
                <p className="text-muted-foreground text-sm">
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
                      <Link className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
                    <div className="border-muted-foreground/25 hover:border-primary/50 cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors">
                      <Upload className="text-muted-foreground mx-auto mb-2 size-8" />
                      <p className="text-muted-foreground text-xs">
                        Click to upload
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <div className="border-muted-foreground/25 hover:border-primary/50 cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors">
                      <Upload className="text-muted-foreground mx-auto mb-2 size-8" />
                      <p className="text-muted-foreground text-xs">32x32 PNG</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Colors & Theme */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Palette className="size-5" />
                  Colors & Theme
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Customize the platform color scheme
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-8 cursor-pointer rounded-lg border"
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
                        className="size-8 cursor-pointer rounded-lg border"
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
                        className="size-8 cursor-pointer rounded-lg border"
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

                <div className="border-t pt-4">
                  <Label className="mb-3 block">Color Presets</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        className="hover:bg-muted flex flex-col items-center gap-1 rounded-lg p-2 transition-colors"
                        onClick={() => applyColorPreset(preset)}
                      >
                        <div className="flex gap-1">
                          <div
                            className="size-4 rounded-sm"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div
                            className="size-4 rounded-sm"
                            style={{ backgroundColor: preset.secondary }}
                          />
                          <div
                            className="size-4 rounded-sm"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <span className="text-muted-foreground text-[10px]">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Moon className="size-4" />
                      Dark Mode
                    </Label>
                    <p className="text-muted-foreground text-xs">
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Mail className="size-5" />
                  Support Contact
                </CardTitle>
                <p className="text-muted-foreground text-sm">
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Link className="size-5" />
                  Social Links
                </CardTitle>
                <p className="text-muted-foreground text-sm">
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Languages className="size-5" />
                  Supported Languages
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Enable languages for your platform
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {languages.map((lang) => (
                    <div
                      key={lang.code}
                      className={`flex items-center justify-between rounded-lg p-3 transition-colors ${lang.enabled ? "bg-primary/5" : "bg-muted/50"} `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground w-8 shrink-0 text-center font-mono text-xs uppercase">
                          {lang.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{lang.name}</span>
                            <span className="text-muted-foreground text-sm">
                              ({lang.nativeName})
                            </span>
                            {lang.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                              <div
                                className="bg-primary h-full rounded-full"
                                style={{
                                  width: `${lang.completionPercentage}%`,
                                }}
                              />
                            </div>
                            <span className="text-muted-foreground text-xs">
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <DollarSign className="size-5" />
                  Supported Currencies
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Enable currencies for transactions
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currencies.map((curr) => (
                    <div
                      key={curr.code}
                      className={`flex items-center justify-between rounded-lg p-3 transition-colors ${curr.enabled ? "bg-primary/5" : "bg-muted/50"} `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-muted flex h-8 w-12 shrink-0 items-center justify-center rounded-sm font-mono text-sm font-bold">
                          {curr.symbol}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{curr.code}</span>
                            <span className="text-muted-foreground text-sm">
                              {curr.name}
                            </span>
                            {curr.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs">
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
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-muted-foreground text-sm">
                    Exchange rates last updated
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleUpdateRates}
                    disabled={isUpdatingRates}
                  >
                    <RefreshCw
                      className={`size-4 ${isUpdatingRates ? "animate-spin" : ""} `}
                    />
                    {isUpdatingRates ? "Updating..." : "Update Rates"}
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="size-5" />
                  Date & Time Settings
                </CardTitle>
                <p className="text-muted-foreground text-sm">
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Shield className="size-5" />
                  Security Settings
                </CardTitle>
                <p className="text-muted-foreground text-sm">
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
                    <p className="text-muted-foreground text-xs">
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
                    <p className="text-muted-foreground text-xs">
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="size-5" />
                  Registration & Trials
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  User registration and trial settings
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Registration</Label>
                    <p className="text-muted-foreground text-xs">
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
                  <p className="text-muted-foreground text-xs">
                    Duration of free trial for new facilities
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Mode */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <AlertTriangle className="size-5" />
                  Maintenance Mode
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Control system availability
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Maintenance Mode</Label>
                    <p className="text-muted-foreground text-xs">
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Bell className="size-5" />
                  Notification Channels
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Enable/disable notification methods
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                      <Mail className="size-5 text-blue-600" />
                    </div>
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-muted-foreground text-xs">
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
                <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
                      <Bell className="size-5 text-green-600" />
                    </div>
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-muted-foreground text-xs">
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
                <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100">
                      <Bell className="size-5 text-purple-600" />
                    </div>
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-muted-foreground text-xs">
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
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="size-5" />
                  Email Templates
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Manage email notification templates
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {emailTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-lg p-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {template.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {template.description}
                        </p>
                      </div>
                      <div className="ml-2 flex items-center gap-2">
                        {template.enabled ? (
                          <CheckCircle className="size-4 text-green-500" />
                        ) : (
                          <X className="text-muted-foreground size-4" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowEditTemplateModal(true);
                          }}
                        >
                          <Edit className="size-4" />
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
        <DialogContent className="min-w-5xl">
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
                  className="hover:border-primary size-8 rounded-lg border-2 border-transparent transition-colors"
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
                className="h-10 w-full"
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
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Preview Changes</DialogTitle>
            <DialogDescription>
              See how your branding changes will look
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="rounded-lg p-6"
              style={{ backgroundColor: branding.primaryColor + "10" }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex size-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  <span className="text-xl font-bold text-white">
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
                  <p className="text-muted-foreground text-sm">
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
        <DialogContent className="min-w-5xl">
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="size-8 text-green-600" />
            </div>
            <DialogTitle>Settings Saved</DialogTitle>
            <DialogDescription>
              Your global settings have been updated successfully.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Email Template Modal */}
      <Dialog
        open={showEditTemplateModal}
        onOpenChange={setShowEditTemplateModal}
      >
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-5" />
              Edit Email Template
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input defaultValue={selectedTemplate.name} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  defaultValue={selectedTemplate.description}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input defaultValue={selectedTemplate.subject} />
              </div>
              <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">Template Enabled</p>
                  <p className="text-muted-foreground text-xs">
                    Allow this template to be sent
                  </p>
                </div>
                <Switch defaultChecked={selectedTemplate.enabled} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditTemplateModal(false);
                setSelectedTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowEditTemplateModal(false);
                setSelectedTemplate(null);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
