"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useSettings } from "@/hooks/use-settings";
import {
  CUSTOMER_LANGUAGE_OPTIONS,
  getCustomerLanguageLabel,
} from "@/lib/language-settings";
import type {
  ServiceDateBlock,
  ScheduleTimeOverride,
  DropOffPickUpOverride,
} from "@/types/facility";
import { SettingsBlock } from "@/components/ui/settings-block";
import { ReportCardBrandedHeader } from "@/components/shared/ReportCardBrandedHeader";
import { ReportCardBrandedFooter } from "@/components/shared/ReportCardBrandedFooter";
import { businessProfile } from "@/data/settings";
import {
  getApprovalConfig,
  saveApprovalConfig,
  type ServiceApprovalConfig,
} from "@/data/facility-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileAppSettings } from "@/components/additional-features/MobileAppSettings";
import { YipyyGoSettings } from "@/components/yipyygo/YipyyGoSettings";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { FormRequirementsSettings } from "@/components/forms/FormRequirementsSettings";
import { TagNotesSettings } from "@/components/facility-config/TagNotesSettings";
import { BreedManagement } from "@/components/facility/BreedManagement";
import { CareTaskSettings } from "@/components/facility/CareTaskSettings";
import { FeedingMedicationConfig } from "@/components/facility/FeedingMedicationConfig";
import { TaxSettings } from "@/components/facility/TaxSettings";
import { BookingStatusSettings } from "@/components/facility/BookingStatusSettings";
import { RetailSettings } from "@/components/facility/RetailSettings";
import { CheckinRequirementsSettings } from "@/components/facility/CheckinRequirementsSettings";
import { EvaluationSettings } from "@/components/facility/EvaluationSettings";
import { EvaluationBookingWizardSettings } from "@/components/facility/EvaluationBookingWizardSettings";
import { FormNotificationSettings } from "@/components/forms/FormNotificationSettings";
import { ServiceNotificationSettings } from "@/components/facility/ServiceNotificationSettings";
import { TipSettings } from "@/components/facility/TipSettings";
import { SettingsSidebar } from "@/components/facility/SettingsSidebar";
import { EvaluationReportCardBuilder } from "@/components/evaluations/EvaluationReportCardBuilder";
import { EvaluationFormBuilder } from "@/components/evaluations/EvaluationFormBuilder";
import { EstimateFollowUpSettings } from "@/components/estimates/EstimateFollowUpSettings";
import { StatusColorSettings } from "@/components/facility/StatusColorSettings";
import { ServiceColorCard } from "@/components/facility/ServiceColorCard";
import { CustomEmailDomainSettings } from "@/components/facility/CustomEmailDomainSettings";
import { staffMembers } from "@/data/staff";

const AddOnsSettings = dynamic(
  () =>
    import("@/components/facility/AddOnsSettings").then(
      (mod) => mod.AddOnsSettings,
    ),
  { ssr: false },
);
const WeatherWarningSettings = dynamic(
  () =>
    import("@/components/facility/WeatherWarningSettings").then(
      (mod) => mod.WeatherWarningSettings,
    ),
  { ssr: false },
);
const PricingRulesSettings = dynamic(
  () =>
    import("@/components/facility/PricingRulesSettings").then(
      (mod) => mod.PricingRulesSettings,
    ),
  { ssr: false },
);
const FacilityRolesStudio = dynamic(
  () =>
    import("@/components/facility/FacilityRolesStudio").then(
      (mod) => mod.FacilityRolesStudio,
    ),
  { ssr: false },
);
const CameraIntegrationSettings = dynamic(
  () =>
    import("@/components/camera-integration/CameraIntegrationSettings").then(
      (mod) => mod.CameraIntegrationSettings,
    ),
  { ssr: false },
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell,
  DollarSign,
  MapPin,
  Mail,
  Languages,
  Phone,
  Zap,
  Download,
  CalendarX,
  Clock,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  locations,
  paymentGateways,
  taxRates,
  currencySettings,
  subscription,
  auditLog,
  reportCardSectionMeta,
} from "@/data/settings";
import {
  getVaccinationRules,
  syncVaccinationRules,
} from "@/data/vaccination-rules";
import { useCustomServices } from "@/hooks/use-custom-services";
import type {
  ReportCardSectionId,
  ReportCardServiceConfig,
  ReportCardCustomQuestion,
  CustomFeedbackType,
} from "@/types/facility";

// Business Profile Component
function BusinessProfileCard() {
  const { profile, updateProfile, weatherRules, updateWeatherRules } =
    useSettings();

  const convertTemperatureValue = (
    value: number,
    fromUnit: "celsius" | "fahrenheit",
    toUnit: "celsius" | "fahrenheit",
  ) => {
    if (fromUnit === toUnit) return value;
    const converted =
      fromUnit === "celsius" ? value * (9 / 5) + 32 : ((value - 32) * 5) / 9;
    return Math.round(converted * 10) / 10;
  };

  const handleSaveProfile = (nextProfile: typeof profile) => {
    const previousUnit = profile.preferences.temperatureUnit;
    const nextUnit = nextProfile.preferences.temperatureUnit;

    if (previousUnit !== nextUnit) {
      const convertedRules = weatherRules.map((rule) => {
        if (
          ![
            "temperature_below",
            "temperature_above",
            "feels_like_below",
            "feels_like_above",
          ].includes(rule.condition)
        ) {
          return rule;
        }
        if (typeof rule.value !== "number") return rule;

        return {
          ...rule,
          value: convertTemperatureValue(rule.value, previousUnit, nextUnit),
        };
      });

      updateWeatherRules(convertedRules);
    }

    updateProfile(nextProfile);
  };

  return (
    <SettingsBlock
      title="Business Profile"
      data={profile}
      onSave={handleSaveProfile}
    >
      {(isEditing, localProfile, setLocalProfile) => (
        <div className="space-y-4">
          {/* Facility Logo */}
          <div className="space-y-2">
            <Label>Facility Logo</Label>
            <div className="flex items-center gap-4">
              <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-lg text-lg font-semibold">
                {(localProfile.businessName || "F")
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isEditing}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/png,image/jpeg,image/svg+xml";
                    input.click();
                  }}
                >
                  Upload Logo
                </Button>
                <p className="text-muted-foreground text-xs">
                  Recommended: 200×200px, square format
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={localProfile.businessName}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    businessName: e.target.value,
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={localProfile.email}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, email: e.target.value })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={localProfile.phone}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, phone: e.target.value })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={localProfile.website}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, website: e.target.value })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={localProfile.description}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  description: e.target.value,
                })
              }
              rows={3}
              readOnly={!isEditing}
              className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Street Address"
                value={localProfile.address.street}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    address: {
                      ...localProfile.address,
                      street: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="City"
                value={localProfile.address.city}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    address: { ...localProfile.address, city: e.target.value },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="State"
                value={localProfile.address.state}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    address: { ...localProfile.address, state: e.target.value },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="ZIP Code"
                value={localProfile.address.zipCode}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    address: {
                      ...localProfile.address,
                      zipCode: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Social Media</Label>
            <div className="grid grid-cols-3 gap-4">
              <Input
                placeholder="Facebook URL"
                value={localProfile.socialMedia.facebook}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    socialMedia: {
                      ...localProfile.socialMedia,
                      facebook: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="Instagram URL"
                value={localProfile.socialMedia.instagram}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    socialMedia: {
                      ...localProfile.socialMedia,
                      instagram: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="Twitter URL"
                value={localProfile.socialMedia.twitter}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    socialMedia: {
                      ...localProfile.socialMedia,
                      twitter: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Business Preferences</Label>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="clockFormat">Clock Format</Label>
                <Select
                  value={localProfile.preferences.clockFormat}
                  onValueChange={(value) =>
                    setLocalProfile({
                      ...localProfile,
                      preferences: {
                        ...localProfile.preferences,
                        clockFormat: value as "12h" | "24h",
                      },
                    })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger id="clockFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour clock</SelectItem>
                    <SelectItem value="24h">24-hour clock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightUnit">Weight Unit</Label>
                <Select
                  value={localProfile.preferences.weightUnit}
                  onValueChange={(value) =>
                    setLocalProfile({
                      ...localProfile,
                      preferences: {
                        ...localProfile.preferences,
                        weightUnit: value as "lbs" | "kg",
                      },
                    })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger id="weightUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperatureUnit">Temperature Unit</Label>
                <Select
                  value={localProfile.preferences.temperatureUnit}
                  onValueChange={(value) =>
                    setLocalProfile({
                      ...localProfile,
                      preferences: {
                        ...localProfile.preferences,
                        temperatureUnit: value as "celsius" | "fahrenheit",
                      },
                    })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger id="temperatureUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celsius">Celsius (°C)</SelectItem>
                    <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Changing temperature unit automatically converts existing weather
              warning thresholds.
            </p>
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}

function LanguageSettingsCard() {
  const { languageSettings, updateLanguageSettings } = useSettings();

  return (
    <SettingsBlock
      title="Language & Localization"
      description="Choose software languages and configure customer preferred-language support for signup and communications."
      data={languageSettings}
      onSave={updateLanguageSettings}
    >
      {(isEditing, localLanguageSettings, setLocalLanguageSettings) => (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
            <Languages className="mt-0.5 size-4 shrink-0 text-sky-600" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-sky-900">Software Language Mode</p>
              <p className="text-sky-800/90">
                Use English only, or enable bilingual mode (English + French) so
                forms and translated UI content can be used in both languages.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary-language">Primary Language</Label>
              <Select
                value={localLanguageSettings.primaryLocale}
                onValueChange={(value) => {
                  const nextPrimary = value as "en" | "fr";
                  const nextSecondary =
                    localLanguageSettings.secondaryLocale === nextPrimary
                      ? nextPrimary === "en"
                        ? "fr"
                        : "en"
                      : localLanguageSettings.secondaryLocale;

                  setLocalLanguageSettings({
                    ...localLanguageSettings,
                    primaryLocale: nextPrimary,
                    secondaryLocale: nextSecondary,
                  });
                }}
                disabled={!isEditing}
              >
                <SelectTrigger id="primary-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-language">Secondary Language</Label>
              <Select
                value={localLanguageSettings.secondaryLocale}
                onValueChange={(value) =>
                  setLocalLanguageSettings({
                    ...localLanguageSettings,
                    secondaryLocale: value as "en" | "fr",
                  })
                }
                disabled={!isEditing || !localLanguageSettings.secondaryEnabled}
              >
                <SelectTrigger id="secondary-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localLanguageSettings.primaryLocale !== "en" && (
                    <SelectItem value="en">English</SelectItem>
                  )}
                  {localLanguageSettings.primaryLocale !== "fr" && (
                    <SelectItem value="fr">Français</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable Secondary Language</p>
              <p className="text-muted-foreground text-xs">
                Turn this off for English-only operation.
              </p>
            </div>
            <Switch
              checked={localLanguageSettings.secondaryEnabled}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalLanguageSettings({
                  ...localLanguageSettings,
                  secondaryEnabled: checked,
                })
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-900">
                  Customer Preferred Language
                </p>
                <p className="text-xs text-emerald-800/90">
                  When enabled, customers can choose their preferred language
                  during account creation. Staff will see this language in the
                  client profile and messaging views.
                </p>
              </div>
              <Switch
                checked={
                  localLanguageSettings.customerLanguagePreferenceEnabled
                }
                disabled={!isEditing}
                onCheckedChange={(checked) =>
                  setLocalLanguageSettings({
                    ...localLanguageSettings,
                    customerLanguagePreferenceEnabled: checked,
                  })
                }
              />
            </div>

            {localLanguageSettings.customerLanguagePreferenceEnabled && (
              <div className="space-y-2 border-t border-emerald-200/70 pt-3">
                <p className="text-xs font-medium text-emerald-900">
                  Languages available to customers
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CUSTOMER_LANGUAGE_OPTIONS.map((option) => {
                    const checked =
                      localLanguageSettings.customerSupportedLanguages.includes(
                        option.code,
                      );

                    return (
                      <label
                        key={option.code}
                        className="flex items-center justify-between rounded-md border border-emerald-200/80 bg-white/80 px-2.5 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            disabled={!isEditing}
                            onCheckedChange={(nextChecked) => {
                              const hasOption =
                                localLanguageSettings.customerSupportedLanguages.includes(
                                  option.code,
                                );

                              const nextLanguages = hasOption
                                ? localLanguageSettings.customerSupportedLanguages.filter(
                                    (code) => code !== option.code,
                                  )
                                : [
                                    ...localLanguageSettings.customerSupportedLanguages,
                                    option.code,
                                  ];

                              if (
                                nextChecked !== true &&
                                nextLanguages.length === 0
                              ) {
                                return;
                              }

                              setLocalLanguageSettings({
                                ...localLanguageSettings,
                                customerSupportedLanguages: nextLanguages,
                              });
                            }}
                          />
                          <span className="text-sm text-emerald-950">
                            {option.label}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="h-5 border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700"
                        >
                          {option.code.toUpperCase()}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            Current mode:{" "}
            {localLanguageSettings.secondaryEnabled
              ? "Bilingual"
              : "Single language"}
            {" · "}
            Primary:{" "}
            {localLanguageSettings.primaryLocale === "en"
              ? "English"
              : "Français"}
            {localLanguageSettings.secondaryEnabled
              ? ` · Secondary: ${localLanguageSettings.secondaryLocale === "en" ? "English" : "Français"}`
              : ""}
            {localLanguageSettings.customerLanguagePreferenceEnabled
              ? ` · Customer signup options: ${localLanguageSettings.customerSupportedLanguages.map(getCustomerLanguageLabel).join(", ")}`
              : " · Customer preferred language: Disabled"}
          </p>
        </div>
      )}
    </SettingsBlock>
  );
}

// Business Hours Component
function BusinessHoursCard() {
  const { hours, updateHours } = useSettings();

  return (
    <SettingsBlock title="Business Hours" data={hours} onSave={updateHours}>
      {(isEditing, localHours, setLocalHours) => (
        <div className="space-y-3">
          {Object.entries(localHours).map(
            ([day, schedule]: [
              string,
              { isOpen: boolean; openTime: string; closeTime: string },
            ]) => (
              <div
                key={day}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex flex-1 items-center gap-4">
                  <div className="w-32 font-medium capitalize">{day}</div>
                  <Switch
                    checked={schedule.isOpen}
                    disabled={!isEditing}
                    onCheckedChange={(checked) =>
                      setLocalHours({
                        ...localHours,
                        [day]: { ...schedule, isOpen: checked },
                      })
                    }
                  />
                  {schedule.isOpen && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={schedule.openTime}
                        onChange={(e) =>
                          setLocalHours({
                            ...localHours,
                            [day]: { ...schedule, openTime: e.target.value },
                          })
                        }
                        className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                        readOnly={!isEditing}
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={schedule.closeTime}
                        onChange={(e) =>
                          setLocalHours({
                            ...localHours,
                            [day]: { ...schedule, closeTime: e.target.value },
                          })
                        }
                        className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                        readOnly={!isEditing}
                      />
                    </div>
                  )}
                  {!schedule.isOpen && (
                    <Badge variant="secondary">Closed</Badge>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </SettingsBlock>
  );
}

const SERVICE_BLOCK_OPTIONS: { id: string; label: string }[] = [
  { id: "daycare", label: "Daycare" },
  { id: "boarding", label: "Boarding" },
  { id: "grooming", label: "Grooming" },
  { id: "training", label: "Training" },
  { id: "evaluation", label: "Evaluation" },
];

type BlockType = "full" | "check_in" | "check_out";

// Service-Specific Day Blocking (override regular schedule)
function ServiceDayBlockingCard() {
  const { serviceDateBlocks, updateServiceDateBlocks } = useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newBlockType, setNewBlockType] = useState<BlockType>("full");
  const [newClosureMessage, setNewClosureMessage] = useState("");

  const includesBoarding = newServices.includes("boarding");

  const handleAdd = () => {
    if (!newDate || newServices.length === 0) return;
    const block: ServiceDateBlock = {
      id: `block-${Date.now()}`,
      date: newDate,
      services: [...newServices],
      closed: includesBoarding ? newBlockType === "full" : true,
      blockCheckIn: includesBoarding ? newBlockType === "check_in" : undefined,
      blockCheckOut: includesBoarding
        ? newBlockType === "check_out"
        : undefined,
      closureMessage: newClosureMessage.trim() || undefined,
    };
    updateServiceDateBlocks([...serviceDateBlocks, block]);
    setNewDate("");
    setNewServices([]);
    setNewBlockType("full");
    setNewClosureMessage("");
  };

  const handleRemove = (id: string) => {
    updateServiceDateBlocks(serviceDateBlocks.filter((b) => b.id !== id));
  };

  const toggleService = (id: string) => {
    setNewServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="size-5" />
          Service-Specific Day Blocking
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Block specific calendar days for one or more services (e.g. daycare
          closed on Christmas) without changing the regular weekly schedule. On
          blocked dates, customers cannot book and staff cannot create bookings
          unless overridden by admin/manager.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>Add block</Label>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Services affected (per service, multiple, or all)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setNewServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? "Clear all"
                    : "All services"}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`block-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleService(opt.id)}
                    />
                    <Label
                      htmlFor={`block-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {includesBoarding && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Boarding block type
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={newBlockType === "full" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("full")}
                  >
                    Fully close
                  </Button>
                  <Button
                    type="button"
                    variant={
                      newBlockType === "check_in" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("check_in")}
                  >
                    Block check-in only
                  </Button>
                  <Button
                    type="button"
                    variant={
                      newBlockType === "check_out" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("check_out")}
                  >
                    Block check-out only
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Fully close = no check-in or check-out. Or block only check-in
                  or only check-out dates.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Closure message (customer-facing)
              </Label>
              <Input
                value={newClosureMessage}
                onChange={(e) => setNewClosureMessage(e.target.value)}
                placeholder="e.g. Closed for Christmas, Closed for staff training"
                className="max-w-sm"
              />
              <p className="text-muted-foreground text-xs">
                Shown when a customer hovers over or focuses the blocked date in
                the booking calendar.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newDate || newServices.length === 0}
            >
              <Plus className="mr-2 size-4" />
              Add block
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Blocked dates</Label>
          {serviceDateBlocks.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              No service-specific blocks. Add a date and service(s) above.
            </p>
          ) : (
            <ul className="space-y-2">
              {serviceDateBlocks
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((block) => (
                  <li
                    key={block.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {new Date(
                            block.date + "T12:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {block.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                            <Badge variant="secondary" className="text-xs">
                              All services
                            </Badge>
                          ) : (
                            block.services.map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="text-xs"
                              >
                                {SERVICE_BLOCK_OPTIONS.find((o) => o.id === s)
                                  ?.label ?? s}
                              </Badge>
                            ))
                          )}
                        </div>
                        {block.services.includes("boarding") ? (
                          <Badge variant="outline" className="text-xs">
                            {block.closed
                              ? "Fully closed"
                              : block.blockCheckIn && block.blockCheckOut
                                ? "Check-in & check-out blocked"
                                : block.blockCheckIn
                                  ? "Check-in blocked"
                                  : block.blockCheckOut
                                    ? "Check-out blocked"
                                    : "Closed"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Closed</Badge>
                        )}
                      </div>
                      {block.closureMessage && (
                        <p className="text-muted-foreground text-sm">
                          “{block.closureMessage}”
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(block.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// One-Day Schedule Time Override (Special Hours)
function OneDayScheduleOverrideCard() {
  const { scheduleTimeOverrides, updateScheduleTimeOverrides } = useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewScheduleServices] = useState<string[]>([]);
  const [newOpenTime, setNewOpenTime] = useState("08:00");
  const [newCloseTime, setNewCloseTime] = useState("17:00");

  const handleAdd = () => {
    if (!newDate) return;
    const override: ScheduleTimeOverride = {
      id: `override-${Date.now()}`,
      date: newDate,
      services:
        newServices.length === 0 ||
        newServices.length === SERVICE_BLOCK_OPTIONS.length
          ? undefined
          : [...newServices],
      openTime: newOpenTime,
      closeTime: newCloseTime,
    };
    updateScheduleTimeOverrides([...scheduleTimeOverrides, override]);
    setNewDate("");
    setNewScheduleServices([]);
    setNewOpenTime("08:00");
    setNewCloseTime("17:00");
  };

  const handleRemove = (id: string) => {
    updateScheduleTimeOverrides(
      scheduleTimeOverrides.filter((o) => o.id !== id),
    );
  };

  const toggleScheduleService = (id: string) => {
    setNewScheduleServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" />
          One-Day Schedule Time Override (Special Hours)
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Set custom opening and closing times for a specific date (e.g.
          Halloween 10:00 AM – 3:00 PM) without changing the regular weekly
          schedule. Choose per service, multiple services, or all services.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>Add override</Label>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Services (optional — leave empty for all)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setNewScheduleServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? "Clear / All"
                    : "All services"}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`sched-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleScheduleService(opt.id)}
                    />
                    <Label
                      htmlFor={`sched-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Opening time
              </Label>
              <Input
                type="time"
                value={newOpenTime}
                onChange={(e) => setNewOpenTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Closing time
              </Label>
              <Input
                type="time"
                value={newCloseTime}
                onChange={(e) => setNewCloseTime(e.target.value)}
              />
            </div>
            <Button type="button" onClick={handleAdd} disabled={!newDate}>
              <Plus className="mr-2 size-4" />
              Add override
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Special hours</Label>
          {scheduleTimeOverrides.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              No one-day overrides. Add a date and times above.
            </p>
          ) : (
            <ul className="space-y-2">
              {scheduleTimeOverrides
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((override) => (
                  <li
                    key={override.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {new Date(
                            override.date + "T12:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {override.services &&
                        override.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                          <Badge variant="secondary" className="text-xs">
                            All services
                          </Badge>
                        ) : override.services &&
                          override.services.length > 0 ? (
                          override.services.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs"
                            >
                              {SERVICE_BLOCK_OPTIONS.find((o) => o.id === s)
                                ?.label ?? s}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            All services
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {override.openTime} – {override.closeTime}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(override.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Drop-Off & Pick-Up Time Overrides
function DropOffPickUpOverrideCard() {
  const { dropOffPickUpOverrides, updateDropOffPickUpOverrides } =
    useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newDropOffStart, setNewDropOffStart] = useState("07:30");
  const [newDropOffEnd, setNewDropOffEnd] = useState("10:00");
  const [newPickUpStart, setNewPickUpStart] = useState("16:00");
  const [newPickUpEnd, setNewPickUpEnd] = useState("18:00");

  const handleAdd = () => {
    if (!newDate || newServices.length === 0) return;
    const override: DropOffPickUpOverride = {
      id: `dropoff-pickup-${Date.now()}`,
      date: newDate,
      services: [...newServices],
      dropOffStart: newDropOffStart,
      dropOffEnd: newDropOffEnd,
      pickUpStart: newPickUpStart,
      pickUpEnd: newPickUpEnd,
    };
    updateDropOffPickUpOverrides([...dropOffPickUpOverrides, override]);
    setNewDate("");
    setNewServices([]);
    setNewDropOffStart("07:30");
    setNewDropOffEnd("10:00");
    setNewPickUpStart("16:00");
    setNewPickUpEnd("18:00");
  };

  const handleRemove = (id: string) => {
    updateDropOffPickUpOverrides(
      dropOffPickUpOverrides.filter((o) => o.id !== id),
    );
  };

  const toggleService = (id: string) => {
    setNewServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-5" />
          Drop-Off &amp; Pick-Up Time Overrides
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Override drop-off and pick-up windows for specific dates (e.g. holiday
          hours). Customers only see valid time options for each date. Apply
          overrides per service.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>Add override</Label>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Services (per service, multiple, or all)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setNewServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? "Clear all"
                    : "All services"}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`dopo-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleService(opt.id)}
                    />
                    <Label
                      htmlFor={`dopo-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Drop-off start
                </Label>
                <Input
                  type="time"
                  value={newDropOffStart}
                  onChange={(e) => setNewDropOffStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Drop-off end
                </Label>
                <Input
                  type="time"
                  value={newDropOffEnd}
                  onChange={(e) => setNewDropOffEnd(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Pick-up start
                </Label>
                <Input
                  type="time"
                  value={newPickUpStart}
                  onChange={(e) => setNewPickUpStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Pick-up end
                </Label>
                <Input
                  type="time"
                  value={newPickUpEnd}
                  onChange={(e) => setNewPickUpEnd(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newDate || newServices.length === 0}
            >
              <Plus className="mr-2 size-4" />
              Add override
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Overrides</Label>
          {dropOffPickUpOverrides.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              No drop-off/pick-up overrides. Add a date and service(s) above.
            </p>
          ) : (
            <ul className="space-y-2">
              {dropOffPickUpOverrides
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((override) => (
                  <li
                    key={override.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {new Date(
                            override.date + "T12:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {override.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                            <Badge variant="secondary" className="text-xs">
                              All services
                            </Badge>
                          ) : (
                            override.services.map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="text-xs"
                              >
                                {SERVICE_BLOCK_OPTIONS.find((o) => o.id === s)
                                  ?.label ?? s}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        Drop-off {override.dropOffStart}–{override.dropOffEnd} ·
                        Pick-up {override.pickUpStart}–{override.pickUpEnd}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(override.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Vaccination Requirements Component
const VACCINE_SPECIES_OPTIONS = ["Dog", "Cat", "Other"] as const;
const VACCINE_SERVICE_OPTIONS = [
  "boarding",
  "daycare",
  "grooming",
  "training",
  "vet",
] as const;

function VaccinationRequirementsCard() {
  const [species, setSpecies] = useState<string>("Dog");
  const [rules, setRules] = useState(() => getVaccinationRules());
  const [savedRules, setSavedRules] = useState(() => getVaccinationRules());
  const [newName, setNewName] = useState("");
  const [newExpiry, setNewExpiry] = useState(30);

  const isDirty = JSON.stringify(rules) !== JSON.stringify(savedRules);

  const handleSave = () => {
    syncVaccinationRules(rules);
    setSavedRules([...rules]);
  };

  const filtered = rules.filter(
    (r) => r.species.toLowerCase() === species.toLowerCase(),
  );

  const addVaccine = () => {
    const name = newName.trim();
    if (!name) return;
    setRules((prev) => [
      ...prev,
      {
        id: `vax-${Date.now()}`,
        vaccineName: name,
        species,
        required: true,
        expiryWarningDays: newExpiry,
        applicableServices: [],
      },
    ]);
    setNewName("");
    setNewExpiry(30);
  };

  const removeVaccine = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleService = (id: string, service: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const has = r.applicableServices.includes(service);
        return {
          ...r,
          applicableServices: has
            ? r.applicableServices.filter((s) => s !== service)
            : [...r.applicableServices, service],
        };
      }),
    );
  };

  const updateRequired = (id: string, required: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, required } : r)),
    );
  };

  const updateExpiry = (id: string, days: number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, expiryWarningDays: days } : r)),
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Vaccination Requirements</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure which vaccines are required for each animal type.
              Customers will be asked to provide these vaccines and staff will
              verify them before booking.
            </p>
          </div>
          {isDirty && (
            <Button size="sm" onClick={handleSave}>
              Save changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={species} onValueChange={setSpecies}>
          <TabsList>
            {VACCINE_SPECIES_OPTIONS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {s}
              </TabsTrigger>
            ))}
          </TabsList>

          {VACCINE_SPECIES_OPTIONS.map((s) => (
            <TabsContent key={s} value={s} className="space-y-3">
              {filtered.length === 0 && species === s ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                  No vaccines configured for {s}. Add one below.
                </p>
              ) : null}

              {species === s &&
                filtered.map((vax) => (
                  <div key={vax.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={vax.vaccineName}
                            onChange={(e) =>
                              setRules((prev) =>
                                prev.map((r) =>
                                  r.id === vax.id
                                    ? { ...r, vaccineName: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            className="max-w-xs font-semibold"
                          />
                          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={vax.required}
                              onCheckedChange={(v) =>
                                updateRequired(vax.id, Boolean(v))
                              }
                            />
                            Required
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-xs">
                            Expiry warning (days)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={vax.expiryWarningDays}
                            onChange={(e) =>
                              updateExpiry(
                                vax.id,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="h-8 w-24"
                          />
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1.5 block text-xs">
                            Applicable services
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {VACCINE_SERVICE_OPTIONS.map((service) => {
                              const active =
                                vax.applicableServices.includes(service);
                              return (
                                <button
                                  key={service}
                                  type="button"
                                  onClick={() =>
                                    toggleService(vax.id, service)
                                  }
                                  className={
                                    active
                                      ? "bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs capitalize"
                                      : "text-muted-foreground hover:bg-muted rounded-full border px-3 py-1 text-xs capitalize"
                                  }
                                >
                                  {service}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVaccine(vax.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}

              {species === s && (
                <div className="bg-muted/30 flex items-end gap-2 rounded-lg border border-dashed p-3">
                  <div className="flex-1">
                    <Label className="mb-1 block text-xs">Vaccine name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={`e.g. ${s === "Cat" ? "FeLV" : "Leptospirosis"}`}
                      className="h-9"
                    />
                  </div>
                  <div className="w-32">
                    <Label className="mb-1 block text-xs">
                      Expiry warn (days)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={newExpiry}
                      onChange={(e) =>
                        setNewExpiry(parseInt(e.target.value) || 0)
                      }
                      className="h-9"
                    />
                  </div>
                  <Button size="sm" onClick={addVaccine} disabled={!newName.trim()}>
                    <Plus className="mr-1 size-3.5" />
                    Add vaccine
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Booking Rules Component
function BookingRulesCard() {
  const { rules, updateRules } = useSettings();

  return (
    <SettingsBlock
      title="Booking Rules & Policies"
      data={rules}
      onSave={updateRules}
    >
      {(isEditing, localRules, setLocalRules) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Advance Booking (hours)</Label>
              <Input
                type="number"
                value={localRules.minimumAdvanceBooking}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    minimumAdvanceBooking: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Advance Booking (days)</Label>
              <Input
                type="number"
                value={localRules.maximumAdvanceBooking}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    maximumAdvanceBooking: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Cancellation Policy (hours before)</Label>
              <Input
                type="number"
                value={localRules.cancelPolicyHours}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    cancelPolicyHours: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Cancellation Fee (%)</Label>
              <Input
                type="number"
                value={localRules.cancelFeePercentage}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    cancelFeePercentage: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit Percentage (%)</Label>
              <Input
                type="number"
                value={localRules.depositPercentage}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    depositPercentage: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Facility Capacity Limit</Label>
              <Input
                type="number"
                value={localRules.capacityLimit}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    capacityLimit: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Daily Capacity Limit</Label>
            <Input
              type="number"
              value={localRules.dailyCapacityLimit}
              onChange={(e) =>
                setLocalRules({
                  ...localRules,
                  dailyCapacityLimit: parseInt(e.target.value),
                })
              }
              readOnly={!isEditing}
              className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Require Deposit</div>
              <div className="text-muted-foreground text-sm">
                Require deposit at booking
              </div>
            </div>
            <Switch
              checked={localRules.depositRequired}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalRules({ ...localRules, depositRequired: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Allow Overbooking</div>
              <div className="text-muted-foreground text-sm">
                Accept bookings beyond capacity
              </div>
            </div>
            <Switch
              checked={localRules.allowOverBooking}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalRules({ ...localRules, allowOverBooking: checked })
              }
            />
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}

// Booking Approval Settings Component
function BookingApprovalSettingsCard() {
  const BUILT_IN_SERVICES = [
    { key: "boarding", label: "Boarding" },
    { key: "daycare", label: "Daycare" },
    { key: "grooming", label: "Grooming" },
    { key: "training", label: "Training" },
  ];

  const [config, setConfig] = useState(() => getApprovalConfig());
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(config);

  const handleSave = () => {
    saveApprovalConfig(draft);
    setConfig(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(config);
    setIsEditing(false);
  };

  const updateService = (
    key: string,
    updates: Partial<ServiceApprovalConfig>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          enabled: false,
          estimatedResponseTime: 24,
          autoConfirmAfterHours: null,
        }),
        ...updates,
      },
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Booking Approval by Service</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose which services require approval before a booking is
            confirmed. When enabled, customer bookings go to a request queue for
            staff review.
          </p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {BUILT_IN_SERVICES.map(({ key, label }) => {
          const svc = draft[key] ?? {
            enabled: false,
            estimatedResponseTime: 24,
            autoConfirmAfterHours: null,
          };
          return (
            <div key={key} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-muted-foreground text-sm">
                    {svc.enabled
                      ? "Requires approval — bookings go to request queue"
                      : "Direct booking — customers are confirmed instantly"}
                  </div>
                </div>
                <Switch
                  checked={svc.enabled}
                  disabled={!isEditing}
                  onCheckedChange={(checked) =>
                    updateService(key, { enabled: checked })
                  }
                />
              </div>
              {svc.enabled && (
                <div className="mt-3 grid grid-cols-2 gap-4 border-t pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Estimated response time (hours)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={svc.estimatedResponseTime}
                      onChange={(e) =>
                        updateService(key, {
                          estimatedResponseTime: parseInt(e.target.value) || 24,
                        })
                      }
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Auto-confirm after (hours)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Never"
                      value={svc.autoConfirmAfterHours ?? ""}
                      onChange={(e) =>
                        updateService(key, {
                          autoConfirmAfterHours: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                    <p className="text-muted-foreground text-xs">
                      Leave empty to require manual approval
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Evaluation Settings Component
function EvaluationSettingsCard() {
  const { evaluation, updateEvaluation } = useSettings();

  return (
    <SettingsBlock
      title="Evaluation Settings"
      data={evaluation}
      onSave={updateEvaluation}
    >
      {(isEditing, localEvaluation, setLocalEvaluation) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Internal Name (Staff-Facing)</Label>
              <Input
                value={localEvaluation.internalName}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    internalName: e.target.value,
                  })
                }
                placeholder="e.g., Pet Evaluation"
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer-Facing Name</Label>
              <Input
                value={localEvaluation.customerName}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    customerName: e.target.value,
                  })
                }
                placeholder="e.g., Pet Evaluation"
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={localEvaluation.description}
              onChange={(e) =>
                setLocalEvaluation({
                  ...localEvaluation,
                  description: e.target.value,
                })
              }
              rows={3}
              placeholder="Describe the evaluation process..."
              readOnly={!isEditing}
              className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={localEvaluation.price}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0 for free"
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={localEvaluation.duration}
                disabled={!isEditing}
                onValueChange={(value: "half-day" | "full-day" | "custom") =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    duration: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="half-day">Half-Day</SelectItem>
                  <SelectItem value="full-day">Full-Day</SelectItem>
                  <SelectItem value="custom">Custom Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {localEvaluation.duration === "custom" && (
            <div className="space-y-2">
              <Label>Custom Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={localEvaluation.customHours || ""}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    customHours: parseFloat(e.target.value) || undefined,
                  })
                }
                placeholder="e.g., 2.5"
                className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                readOnly={!isEditing}
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Taxable</div>
              <div className="text-muted-foreground text-sm">
                Apply tax to evaluation price
              </div>
            </div>
            <Switch
              checked={localEvaluation.taxSettings.taxable}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalEvaluation({
                  ...localEvaluation,
                  taxSettings: {
                    ...localEvaluation.taxSettings,
                    taxable: checked,
                  },
                })
              }
            />
          </div>
          {localEvaluation.taxSettings.taxable && (
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={localEvaluation.taxSettings.taxRate || ""}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    taxSettings: {
                      ...localEvaluation.taxSettings,
                      taxRate: parseFloat(e.target.value) || undefined,
                    },
                  })
                }
                placeholder="e.g., 8.25"
                className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                readOnly={!isEditing}
              />
            </div>
          )}

          {/* ── Color Code ── */}
          <div className="space-y-2">
            <Label>Color Code</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localEvaluation.colorCode || "#6366f1"}
                disabled={!isEditing}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    colorCode: e.target.value,
                  })
                }
                className="size-9 cursor-pointer rounded-lg border p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div
                className="h-6 flex-1 rounded-md"
                style={{
                  backgroundColor: localEvaluation.colorCode || "#6366f1",
                }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Used in schedules and calendars to distinguish evaluation
              appointments
            </p>
          </div>

          {/* ── Validity Settings ── */}
          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <div className="font-medium">Result Validity</div>
              <div className="text-muted-foreground text-sm">
                How long does a passing evaluation remain valid?
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!isEditing}
                onClick={() =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    validityMode: "always_valid",
                  })
                }
                className={`rounded-lg border p-3 text-left transition-colors ${
                  localEvaluation.validityMode === "always_valid"
                    ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                    : "hover:bg-muted"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <p className="text-sm font-medium">Always valid</p>
                <p className="text-muted-foreground text-xs">
                  Once passed, the evaluation never expires
                </p>
              </button>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    validityMode: "expires_after_inactivity",
                  })
                }
                className={`rounded-lg border p-3 text-left transition-colors ${
                  localEvaluation.validityMode === "expires_after_inactivity"
                    ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                    : "hover:bg-muted"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <p className="text-sm font-medium">Expire after inactivity</p>
                <p className="text-muted-foreground text-xs">
                  Clears pass if pet has no visits within a set period
                </p>
              </button>
            </div>
            {localEvaluation.validityMode === "expires_after_inactivity" && (
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">
                  Expire after
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={localEvaluation.expirationDays ?? 90}
                  onChange={(e) =>
                    setLocalEvaluation({
                      ...localEvaluation,
                      expirationDays: parseInt(e.target.value) || 90,
                    })
                  }
                  readOnly={!isEditing}
                  className={`w-24 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""}`}
                />
                <span className="text-muted-foreground text-sm">
                  days of inactivity
                </span>
              </div>
            )}
          </div>

          {/* ── Staff Assignment ── */}
          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <div className="font-medium">Evaluator Assignment</div>
              <div className="text-muted-foreground text-sm">
                Which staff members can conduct evaluations?
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!isEditing}
                onClick={() =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    staffAssignment: "auto",
                  })
                }
                className={`rounded-lg border p-3 text-left transition-colors ${
                  localEvaluation.staffAssignment === "auto"
                    ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                    : "hover:bg-muted"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <p className="text-sm font-medium">Auto-assign</p>
                <p className="text-muted-foreground text-xs">
                  Any staff with the evaluation skill can be assigned
                </p>
              </button>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    staffAssignment: "manual",
                  })
                }
                className={`rounded-lg border p-3 text-left transition-colors ${
                  localEvaluation.staffAssignment === "manual"
                    ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                    : "hover:bg-muted"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <p className="text-sm font-medium">Specific staff only</p>
                <p className="text-muted-foreground text-xs">
                  Only selected staff members can conduct evaluations
                </p>
              </button>
            </div>
            {localEvaluation.staffAssignment === "manual" && (
              <div className="space-y-2">
                <Label className="text-xs">Approved evaluators</Label>
                <div className="space-y-1.5 rounded-lg border p-2">
                  {staffMembers
                    .filter(
                      (s) => s.isActive && s.skills.includes("evaluation"),
                    )
                    .map((staff) => {
                      const selected =
                        localEvaluation.assignedStaffIds?.includes(staff.id) ??
                        false;
                      return (
                        <label
                          key={staff.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                        >
                          <Checkbox
                            checked={selected}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => {
                              const prev =
                                localEvaluation.assignedStaffIds ?? [];
                              setLocalEvaluation({
                                ...localEvaluation,
                                assignedStaffIds: checked
                                  ? [...prev, staff.id]
                                  : prev.filter((id) => id !== staff.id),
                              });
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium">{staff.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {staff.role}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* ── Booking Window ── */}
          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <div className="font-medium">Booking Window</div>
              <div className="text-muted-foreground text-sm">
                Control how soon and how far in advance clients can book
                evaluations
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Minimum lead time</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={localEvaluation.minLeadTimeHours ?? 24}
                    onChange={(e) =>
                      setLocalEvaluation({
                        ...localEvaluation,
                        minLeadTimeHours: parseInt(e.target.value) || 0,
                      })
                    }
                    readOnly={!isEditing}
                    className={`w-24 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""}`}
                  />
                  <span className="text-muted-foreground text-xs">hours</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Maximum advance booking</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={localEvaluation.maxAdvanceDays ?? 30}
                    onChange={(e) =>
                      setLocalEvaluation({
                        ...localEvaluation,
                        maxAdvanceDays: parseInt(e.target.value) || 30,
                      })
                    }
                    readOnly={!isEditing}
                    className={`w-24 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""}`}
                  />
                  <span className="text-muted-foreground text-xs">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Daily Pet Limits ── */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Daily Pet Limits</div>
                <div className="text-muted-foreground text-sm">
                  Cap how many evaluations can be booked per day
                </div>
              </div>
              <Switch
                checked={localEvaluation.dailyPetLimits?.enabled ?? false}
                disabled={!isEditing}
                onCheckedChange={(checked) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    dailyPetLimits: {
                      ...(localEvaluation.dailyPetLimits ?? {
                        enabled: false,
                        defaultLimit: 4,
                      }),
                      enabled: checked,
                    },
                  })
                }
              />
            </div>
            {localEvaluation.dailyPetLimits?.enabled && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default daily limit</Label>
                  <Input
                    type="number"
                    min={1}
                    value={localEvaluation.dailyPetLimits?.defaultLimit ?? 4}
                    onChange={(e) =>
                      setLocalEvaluation({
                        ...localEvaluation,
                        dailyPetLimits: {
                          ...localEvaluation.dailyPetLimits!,
                          defaultLimit: parseInt(e.target.value) || 4,
                        },
                      })
                    }
                    readOnly={!isEditing}
                    className={`w-24 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Per-day overrides</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {(
                      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
                    ).map((day) => (
                      <div key={day} className="space-y-1 text-center">
                        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                          {day}
                        </p>
                        <Input
                          type="number"
                          min={0}
                          value={
                            localEvaluation.dailyPetLimits?.perDay?.[day] ?? ""
                          }
                          onChange={(e) => {
                            const val = e.target.value
                              ? parseInt(e.target.value)
                              : undefined;
                            setLocalEvaluation({
                              ...localEvaluation,
                              dailyPetLimits: {
                                ...localEvaluation.dailyPetLimits!,
                                perDay: {
                                  ...localEvaluation.dailyPetLimits?.perDay,
                                  [day]: val,
                                },
                              },
                            });
                          }}
                          placeholder="—"
                          readOnly={!isEditing}
                          className={`text-center text-xs ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    Leave blank to use the default limit for that day
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Evaluation Scheduling Rules</div>
                <div className="text-muted-foreground text-sm">
                  Configure duration options, time windows, and slot logic.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration Options (hours)</Label>
                <Input
                  value={localEvaluation.schedule.durationOptionsMinutes
                    .map((m) => m / 60)
                    .join(", ")}
                  onChange={(e) => {
                    const parsed = e.target.value
                      .split(",")
                      .map((v) => Number(v.trim()))
                      .filter((v) => Number.isFinite(v) && v > 0)
                      .map((v) => Math.round(v * 60));
                    setLocalEvaluation({
                      ...localEvaluation,
                      schedule: {
                        ...localEvaluation.schedule,
                        durationOptionsMinutes: parsed,
                        defaultDurationMinutes:
                          localEvaluation.schedule.defaultDurationMinutes ??
                          parsed[0],
                      },
                    });
                  }}
                  placeholder="2, 4"
                  readOnly={!isEditing}
                  className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Duration</Label>
                <Select
                  value={String(
                    localEvaluation.schedule.defaultDurationMinutes ??
                      localEvaluation.schedule.durationOptionsMinutes[0] ??
                      "",
                  )}
                  disabled={!isEditing}
                  onValueChange={(value) =>
                    setLocalEvaluation({
                      ...localEvaluation,
                      schedule: {
                        ...localEvaluation.schedule,
                        defaultDurationMinutes: Number(value),
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {localEvaluation.schedule.durationOptionsMinutes.map(
                      (m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m / 60}h
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allowed Time Windows</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {localEvaluation.schedule.timeWindows.map((window, idx) => (
                  <div key={window.id} className="grid grid-cols-3 gap-2">
                    <Input
                      value={window.label}
                      onChange={(e) => {
                        const next = [...localEvaluation.schedule.timeWindows];
                        next[idx] = {
                          ...window,
                          label: e.target.value,
                        };
                        setLocalEvaluation({
                          ...localEvaluation,
                          schedule: {
                            ...localEvaluation.schedule,
                            timeWindows: next,
                          },
                        });
                      }}
                      placeholder="Label"
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                    <Input
                      type="time"
                      value={window.startTime}
                      onChange={(e) => {
                        const next = [...localEvaluation.schedule.timeWindows];
                        next[idx] = {
                          ...window,
                          startTime: e.target.value,
                        };
                        setLocalEvaluation({
                          ...localEvaluation,
                          schedule: {
                            ...localEvaluation.schedule,
                            timeWindows: next,
                          },
                        });
                      }}
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                    <Input
                      type="time"
                      value={window.endTime}
                      onChange={(e) => {
                        const next = [...localEvaluation.schedule.timeWindows];
                        next[idx] = {
                          ...window,
                          endTime: e.target.value,
                        };
                        setLocalEvaluation({
                          ...localEvaluation,
                          schedule: {
                            ...localEvaluation.schedule,
                            timeWindows: next,
                          },
                        });
                      }}
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                  </div>
                ))}
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = [
                        ...localEvaluation.schedule.timeWindows,
                        {
                          id: `window-${Date.now()}`,
                          label: "New Window",
                          startTime: "09:00",
                          endTime: "12:00",
                        },
                      ];
                      setLocalEvaluation({
                        ...localEvaluation,
                        schedule: {
                          ...localEvaluation.schedule,
                          timeWindows: next,
                        },
                      });
                    }}
                  >
                    Add Time Window
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slot Logic</Label>
                <Select
                  value={localEvaluation.schedule.slotMode}
                  disabled={!isEditing}
                  onValueChange={(value: "fixed" | "window") =>
                    setLocalEvaluation({
                      ...localEvaluation,
                      schedule: {
                        ...localEvaluation.schedule,
                        slotMode: value,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed start times</SelectItem>
                    <SelectItem value="window">
                      Any time within window
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {localEvaluation.schedule.slotMode === "fixed" && (
                <div className="space-y-2">
                  <Label>Fixed Start Times</Label>
                  <Input
                    value={localEvaluation.schedule.fixedStartTimes.join(", ")}
                    onChange={(e) => {
                      const parsed = e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean);
                      setLocalEvaluation({
                        ...localEvaluation,
                        schedule: {
                          ...localEvaluation.schedule,
                          fixedStartTimes: parsed,
                        },
                      });
                    }}
                    placeholder="09:00, 11:00, 13:00"
                    readOnly={!isEditing}
                    className={
                      !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}

function ReportCardSettingsCard() {
  const { reportCards, updateReportCards } = useSettings();
  const { activeModules: customServices } = useCustomServices();
  const [sectionServiceId, setSectionServiceId] = useState("daycare");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] =
    useState<CustomFeedbackType>("text");
  const [newOptionText, setNewOptionText] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newConditionOption, setNewConditionOption] = useState<
    Record<string, string>
  >({});
  const [newFeedbackOption, setNewFeedbackOption] = useState("");

  const themeOptions = [
    { id: "everyday", label: "Everyday" },
    { id: "christmas", label: "Christmas" },
    { id: "halloween", label: "Halloween" },
    { id: "easter", label: "Easter" },
    { id: "thanksgiving", label: "Thanksgiving" },
    { id: "new_year", label: "New Year" },
    { id: "valentines", label: "Valentine’s Day" },
  ] as const;

  const standardServices = [
    { id: "daycare", label: "Daycare" },
    { id: "boarding", label: "Boarding" },
    { id: "grooming", label: "Grooming" },
    { id: "training", label: "Training" },
  ];

  const allServices = [
    ...standardServices,
    ...customServices.map((cs) => ({ id: cs.id, label: cs.name })),
  ];

  const allSectionIds: ReportCardSectionId[] = [
    "todaysVibe",
    "friendsAndFun",
    "careMetrics",
    "holidaySparkle",
    "closingNote",
    "overallFeedback",
    "customFeedback",
    "petCondition",
    "nextAppointment",
    "reviewBooster",
    "photoShowcase",
  ];

  const getServiceConfig = (
    cfg: typeof reportCards,
    serviceId: string,
  ): ReportCardServiceConfig => {
    return (
      cfg.serviceConfigs?.find((s) => s.serviceId === serviceId) ?? {
        serviceId,
        enabled: false,
        enabledSections: [
          "todaysVibe",
          "closingNote",
          "photoShowcase",
        ] as ReportCardSectionId[],
      }
    );
  };

  const updateServiceConfig = (
    cfg: typeof reportCards,
    serviceId: string,
    updates: Partial<ReportCardServiceConfig>,
  ) => {
    const configs = cfg.serviceConfigs ?? [];
    const existing = configs.find((s) => s.serviceId === serviceId);
    if (existing) {
      return {
        ...cfg,
        serviceConfigs: configs.map((s) =>
          s.serviceId === serviceId ? { ...s, ...updates } : s,
        ),
      };
    }
    return {
      ...cfg,
      serviceConfigs: [
        ...configs,
        {
          serviceId,
          enabled: false,
          enabledSections: [
            "todaysVibe",
            "closingNote",
            "photoShowcase",
          ] as ReportCardSectionId[],
          ...updates,
        },
      ],
    };
  };

  return (
    <SettingsBlock
      title="Report Card Builder"
      description="Configure report card themes, sections, feedback, and delivery for each service."
      data={reportCards}
      onSave={updateReportCards}
    >
      {(isEditing, localConfig, setLocalConfig) => {
        const brand = localConfig.brand ?? {
          reportTitle: "Daily Report Card",
          accentColor: "#6366f1",
          showFacilityLogo: true,
          logoPosition: "top_center" as const,
          headerStyle: "centered" as const,
          showFacilityName: true,
          showFacilityPhone: true,
          showFacilityEmail: true,
          showFacilityWebsite: true,
          showSocialLinks: true,
          socialLinksStyle: "icons" as const,
          showBookingCta: true,
          bookingCtaText: "Book Your Next Visit",
          bookingCtaUrl: "",
          footerText: "Thank you for trusting us with your fur baby!",
          showPoweredBy: true,
        };
        const updateBrand = (patch: Partial<typeof brand>) =>
          setLocalConfig({
            ...localConfig,
            brand: { ...brand, ...patch },
          });
        const overallFeedback = localConfig.overallFeedback ?? {
          title: "Overall Experience",
          responseOptions: ["Excellent", "Good", "Fair", "Needs Attention"],
        };
        const customQuestions = localConfig.customQuestions ?? [];
        const petCondition = localConfig.petCondition ?? { categories: [] };
        const reviewBooster = localConfig.reviewBooster ?? {
          ratingThreshold: 4,
          reviewUrl: "",
          reviewPromptText: "",
        };

        return (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="condition">Condition</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            {/* ── General Tab ─────────────────────────────── */}
            <TabsContent value="general" className="space-y-6">
              <div className="space-y-6">
                <Label className="text-base font-semibold">Brand Styling</Label>

                {/* Title + Color */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Report Title</Label>
                    <Input
                      value={brand.reportTitle}
                      readOnly={!isEditing}
                      onChange={(e) =>
                        updateBrand({ reportTitle: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.accentColor}
                        disabled={!isEditing}
                        className="h-9 w-12 cursor-pointer rounded-sm border disabled:cursor-not-allowed"
                        onChange={(e) =>
                          updateBrand({ accentColor: e.target.value })
                        }
                      />
                      <Input
                        value={brand.accentColor}
                        readOnly={!isEditing}
                        className="flex-1"
                        onChange={(e) =>
                          updateBrand({ accentColor: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Header Style */}
                <div className="space-y-2">
                  <Label>Header Style</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["minimal", "banner", "centered"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => updateBrand({ headerStyle: s })}
                        className={`rounded-lg border-2 p-3 text-center text-sm font-medium capitalize transition-all ${
                          brand.headerStyle === s
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/30"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="rc-show-logo"
                      checked={brand.showFacilityLogo}
                      disabled={!isEditing}
                      onCheckedChange={(checked) =>
                        updateBrand({ showFacilityLogo: checked })
                      }
                    />
                    <Label htmlFor="rc-show-logo">Show Facility Logo</Label>
                  </div>
                  {brand.showFacilityLogo && (
                    <div className="space-y-2">
                      <Label>Logo Position</Label>
                      <Select
                        value={brand.logoPosition ?? "top_center"}
                        disabled={!isEditing}
                        onValueChange={(v) =>
                          updateBrand({
                            logoPosition: v as
                              | "top_center"
                              | "top_left"
                              | "top_right",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top_center">Top Center</SelectItem>
                          <SelectItem value="top_left">Top Left</SelectItem>
                          <SelectItem value="top_right">Top Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Contact Info</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rc-name"
                        checked={brand.showFacilityName !== false}
                        disabled={!isEditing}
                        onCheckedChange={(c) =>
                          updateBrand({ showFacilityName: c })
                        }
                      />
                      <Label htmlFor="rc-name">Show Facility Name</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rc-phone"
                        checked={brand.showFacilityPhone !== false}
                        disabled={!isEditing}
                        onCheckedChange={(c) =>
                          updateBrand({ showFacilityPhone: c })
                        }
                      />
                      <Label htmlFor="rc-phone">Show Phone</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rc-email"
                        checked={brand.showFacilityEmail !== false}
                        disabled={!isEditing}
                        onCheckedChange={(c) =>
                          updateBrand({ showFacilityEmail: c })
                        }
                      />
                      <Label htmlFor="rc-email">Show Email</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rc-website"
                        checked={brand.showFacilityWebsite !== false}
                        disabled={!isEditing}
                        onCheckedChange={(c) =>
                          updateBrand({ showFacilityWebsite: c })
                        }
                      />
                      <Label htmlFor="rc-website">Show Website</Label>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="rc-social"
                      checked={brand.showSocialLinks !== false}
                      disabled={!isEditing}
                      onCheckedChange={(c) =>
                        updateBrand({ showSocialLinks: c })
                      }
                    />
                    <Label
                      htmlFor="rc-social"
                      className="text-sm font-semibold"
                    >
                      Show Social Links
                    </Label>
                  </div>
                  {brand.showSocialLinks && (
                    <div className="space-y-2">
                      <Label>Social Links Style</Label>
                      <Select
                        value={brand.socialLinksStyle ?? "icons"}
                        disabled={!isEditing}
                        onValueChange={(v) =>
                          updateBrand({
                            socialLinksStyle: v as
                              | "icons"
                              | "buttons"
                              | "text_links",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="icons">Icons</SelectItem>
                          <SelectItem value="buttons">Buttons</SelectItem>
                          <SelectItem value="text_links">Text Links</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Booking CTA */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="rc-cta"
                      checked={brand.showBookingCta !== false}
                      disabled={!isEditing}
                      onCheckedChange={(c) =>
                        updateBrand({ showBookingCta: c })
                      }
                    />
                    <Label htmlFor="rc-cta" className="text-sm font-semibold">
                      Booking Call-to-Action
                    </Label>
                  </div>
                  {brand.showBookingCta && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Button Text</Label>
                        <Input
                          value={brand.bookingCtaText ?? "Book Your Next Visit"}
                          readOnly={!isEditing}
                          onChange={(e) =>
                            updateBrand({ bookingCtaText: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Button URL</Label>
                        <Input
                          value={brand.bookingCtaUrl ?? ""}
                          readOnly={!isEditing}
                          placeholder="https://..."
                          onChange={(e) =>
                            updateBrand({ bookingCtaUrl: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Footer</Label>
                  <div className="space-y-2">
                    <Label>Custom Footer Text</Label>
                    <Textarea
                      value={brand.footerText ?? ""}
                      readOnly={!isEditing}
                      rows={2}
                      placeholder="Thank you for trusting us with your fur baby!"
                      onChange={(e) =>
                        updateBrand({ footerText: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="rc-powered"
                      checked={brand.showPoweredBy !== false}
                      disabled={!isEditing}
                      onCheckedChange={(c) => updateBrand({ showPoweredBy: c })}
                    />
                    <Label htmlFor="rc-powered">
                      Show &quot;Powered by Yipyy&quot;
                    </Label>
                  </div>
                </div>

                {/* AI Tone */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    AI Summary Tone
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Choose how AI-generated summaries sound on report cards and
                    evaluations.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        value: "warm" as const,
                        label: "Warm",
                        desc: "Friendly, caring, reassuring",
                      },
                      {
                        value: "professional" as const,
                        label: "Professional",
                        desc: "Formal, concise, factual",
                      },
                      {
                        value: "playful" as const,
                        label: "Playful",
                        desc: "Fun, lighthearted, upbeat",
                      },
                    ].map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => updateBrand({ aiTone: t.value })}
                        className={`rounded-lg border-2 p-3 text-left transition-all ${
                          (brand.aiTone ?? "warm") === t.value
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/30"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {t.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Live Preview</Label>
                  <div className="overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-white">
                    <ReportCardBrandedHeader
                      brandConfig={brand}
                      profile={businessProfile}
                      title="Buddy's Daily Report"
                      subtitle="Daycare · Mon, April 5, 2026"
                    />
                    <div className="px-6 py-4">
                      <p className="text-muted-foreground text-center text-xs italic">
                        — report card content would appear here —
                      </p>
                    </div>
                    <div className="border-t">
                      <ReportCardBrandedFooter
                        brandConfig={brand}
                        profile={businessProfile}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Enabled Services
                </Label>
                <p className="text-muted-foreground text-sm">
                  Choose which services can have report cards.
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                  {allServices.map((svc) => {
                    const svcCfg = getServiceConfig(localConfig, svc.id);
                    return (
                      <div key={svc.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`rc-svc-${svc.id}`}
                          checked={svcCfg.enabled}
                          disabled={!isEditing}
                          onCheckedChange={(checked) =>
                            setLocalConfig(
                              updateServiceConfig(localConfig, svc.id, {
                                enabled: checked === true,
                              }),
                            )
                          }
                        />
                        <Label htmlFor={`rc-svc-${svc.id}`}>{svc.label}</Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Enabled Themes
                </Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                  {themeOptions.map((theme) => (
                    <div key={theme.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`theme-${theme.id}`}
                        checked={localConfig.enabledThemes.includes(theme.id)}
                        disabled={!isEditing}
                        onCheckedChange={(checked) => {
                          const enabled = checked === true;
                          setLocalConfig({
                            ...localConfig,
                            enabledThemes: enabled
                              ? [...localConfig.enabledThemes, theme.id]
                              : localConfig.enabledThemes.filter(
                                  (t) => t !== theme.id,
                                ),
                          });
                        }}
                      />
                      <Label htmlFor={`theme-${theme.id}`}>{theme.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Sections Tab ─────────────────────────────── */}
            <TabsContent value="sections" className="space-y-6">
              <div className="space-y-2">
                <Label>Configure sections for</Label>
                <Select
                  value={sectionServiceId}
                  onValueChange={setSectionServiceId}
                >
                  <SelectTrigger className="w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allServices.map((svc) => (
                      <SelectItem key={svc.id} value={svc.id}>
                        {svc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                {allSectionIds.map((sectionId) => {
                  const meta = reportCardSectionMeta[sectionId];
                  const svcCfg = getServiceConfig(
                    localConfig,
                    sectionServiceId,
                  );
                  const isOn = svcCfg.enabledSections.includes(sectionId);
                  return (
                    <div
                      key={sectionId}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {meta?.label ?? sectionId}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {meta?.description}
                        </p>
                      </div>
                      <Switch
                        checked={isOn}
                        disabled={!isEditing}
                        onCheckedChange={(checked) => {
                          const newSections = (
                            checked
                              ? [...svcCfg.enabledSections, sectionId]
                              : svcCfg.enabledSections.filter(
                                  (s) => s !== sectionId,
                                )
                          ) as ReportCardSectionId[];
                          setLocalConfig(
                            updateServiceConfig(localConfig, sectionServiceId, {
                              enabledSections: newSections,
                            }),
                          );
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── Feedback Tab ─────────────────────────────── */}
            <TabsContent value="feedback" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Overall Feedback
                </Label>
                <div className="space-y-2">
                  <Label>Feedback Title</Label>
                  <Input
                    value={overallFeedback.title}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        overallFeedback: {
                          ...overallFeedback,
                          title: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Response Options</Label>
                  <div className="space-y-1">
                    {overallFeedback.responseOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={opt}
                          readOnly={!isEditing}
                          className="flex-1"
                          onChange={(e) => {
                            const updated = [
                              ...overallFeedback.responseOptions,
                            ];
                            updated[idx] = e.target.value;
                            setLocalConfig({
                              ...localConfig,
                              overallFeedback: {
                                ...overallFeedback,
                                responseOptions: updated,
                              },
                            });
                          }}
                        />
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated =
                                overallFeedback.responseOptions.filter(
                                  (_, i) => i !== idx,
                                );
                              setLocalConfig({
                                ...localConfig,
                                overallFeedback: {
                                  ...overallFeedback,
                                  responseOptions: updated,
                                },
                              });
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          placeholder="New option..."
                          value={newFeedbackOption}
                          onChange={(e) => setNewFeedbackOption(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!newFeedbackOption.trim()}
                          onClick={() => {
                            setLocalConfig({
                              ...localConfig,
                              overallFeedback: {
                                ...overallFeedback,
                                responseOptions: [
                                  ...overallFeedback.responseOptions,
                                  newFeedbackOption.trim(),
                                ],
                              },
                            });
                            setNewFeedbackOption("");
                          }}
                        >
                          <Plus className="mr-1 size-4" /> Add
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Custom Questions
                </Label>
                <p className="text-muted-foreground text-sm">
                  Create your own feedback questions that staff fill out per
                  report card.
                </p>
                <div className="space-y-2">
                  {customQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{q.question}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {q.type.replace("_", "/")}
                          </Badge>
                          {q.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {q.type === "select" && q.options && (
                            <span className="text-muted-foreground text-xs">
                              {q.options.length} options
                            </span>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setLocalConfig({
                              ...localConfig,
                              customQuestions: customQuestions.filter(
                                (cq) => cq.id !== q.id,
                              ),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {isEditing && (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <Label className="text-sm font-medium">
                        Add New Question
                      </Label>
                      <Input
                        placeholder="Question text..."
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={newQuestionType}
                            onValueChange={(v) =>
                              setNewQuestionType(v as CustomFeedbackType)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="rating">
                                Rating (1-5)
                              </SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="yes_no">Yes / No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newQuestionType === "select" && (
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Options (comma-separated)
                            </Label>
                            <Input
                              placeholder="Option A, Option B, ..."
                              value={newOptionText}
                              onChange={(e) => setNewOptionText(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!newQuestionText.trim()}
                        onClick={() => {
                          const newQ: ReportCardCustomQuestion = {
                            id: `q-${Date.now()}`,
                            question: newQuestionText.trim(),
                            type: newQuestionType,
                            options:
                              newQuestionType === "select"
                                ? newOptionText
                                    .split(",")
                                    .map((o) => o.trim())
                                    .filter(Boolean)
                                : undefined,
                            required: false,
                          };
                          setLocalConfig({
                            ...localConfig,
                            customQuestions: [...customQuestions, newQ],
                          });
                          setNewQuestionText("");
                          setNewOptionText("");
                        }}
                      >
                        <Plus className="mr-1 size-4" /> Add Question
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ── Condition Tab ─────────────────────────────── */}
            <TabsContent value="condition" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Pet Condition Categories
                </Label>
                <p className="text-muted-foreground text-sm">
                  Document health, coat, skin, and other observations on each
                  report card.
                </p>
                {petCondition.categories.map((cat) => (
                  <Card key={cat.id}>
                    <CardHeader className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{cat.label}</CardTitle>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setLocalConfig({
                                ...localConfig,
                                petCondition: {
                                  categories: petCondition.categories.filter(
                                    (c) => c.id !== cat.id,
                                  ),
                                },
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pt-0 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {cat.options.map((opt, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="gap-1 text-xs"
                          >
                            {opt}
                            {isEditing && (
                              <button
                                className="hover:text-destructive ml-1"
                                onClick={() => {
                                  const updatedCats =
                                    petCondition.categories.map((c) =>
                                      c.id === cat.id
                                        ? {
                                            ...c,
                                            options: c.options.filter(
                                              (_, i) => i !== idx,
                                            ),
                                          }
                                        : c,
                                    );
                                  setLocalConfig({
                                    ...localConfig,
                                    petCondition: { categories: updatedCats },
                                  });
                                }}
                              >
                                x
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                      {isEditing && (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            placeholder="New option..."
                            className="h-8 text-sm"
                            value={newConditionOption[cat.id] ?? ""}
                            onChange={(e) =>
                              setNewConditionOption({
                                ...newConditionOption,
                                [cat.id]: e.target.value,
                              })
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={
                              !(newConditionOption[cat.id] ?? "").trim()
                            }
                            onClick={() => {
                              const updatedCats = petCondition.categories.map(
                                (c) =>
                                  c.id === cat.id
                                    ? {
                                        ...c,
                                        options: [
                                          ...c.options,
                                          (
                                            newConditionOption[cat.id] ?? ""
                                          ).trim(),
                                        ],
                                      }
                                    : c,
                              );
                              setLocalConfig({
                                ...localConfig,
                                petCondition: { categories: updatedCats },
                              });
                              setNewConditionOption({
                                ...newConditionOption,
                                [cat.id]: "",
                              });
                            }}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New category label..."
                      value={newCategoryLabel}
                      onChange={(e) => setNewCategoryLabel(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!newCategoryLabel.trim()}
                      onClick={() => {
                        setLocalConfig({
                          ...localConfig,
                          petCondition: {
                            categories: [
                              ...petCondition.categories,
                              {
                                id: `cat-${Date.now()}`,
                                label: newCategoryLabel.trim(),
                                options: ["Normal"],
                              },
                            ],
                          },
                        });
                        setNewCategoryLabel("");
                      }}
                    >
                      <Plus className="mr-1 size-4" /> Add Category
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Delivery Tab ─────────────────────────────── */}
            <TabsContent value="delivery" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Auto-send Timing
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={localConfig.autoSend.mode}
                    disabled={!isEditing}
                    onValueChange={(value: "immediate" | "scheduled") =>
                      setLocalConfig({
                        ...localConfig,
                        autoSend: { ...localConfig.autoSend, mode: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">
                        Send immediately
                      </SelectItem>
                      <SelectItem value="scheduled">
                        Schedule for time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={localConfig.autoSend.sendTime ?? "18:00"}
                    readOnly={
                      !isEditing || localConfig.autoSend.mode !== "scheduled"
                    }
                    className={
                      !isEditing || localConfig.autoSend.mode !== "scheduled"
                        ? "cursor-not-allowed bg-gray-100"
                        : ""
                    }
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        autoSend: {
                          ...localConfig.autoSend,
                          sendTime: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  {(["email", "message", "sms"] as const).map((ch) => (
                    <div key={ch} className="flex items-center gap-2">
                      <Checkbox
                        id={`rc-send-${ch}`}
                        checked={localConfig.autoSend.channels[ch]}
                        disabled={!isEditing}
                        onCheckedChange={(checked) =>
                          setLocalConfig({
                            ...localConfig,
                            autoSend: {
                              ...localConfig.autoSend,
                              channels: {
                                ...localConfig.autoSend.channels,
                                [ch]: checked === true,
                              },
                            },
                          })
                        }
                      />
                      <Label htmlFor={`rc-send-${ch}`} className="capitalize">
                        {ch}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Review Booster
                </Label>
                <p className="text-muted-foreground text-sm">
                  Prompt happy customers to leave reviews on external platforms.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Min Rating to Show Prompt</Label>
                    <Select
                      value={String(reviewBooster.ratingThreshold)}
                      disabled={!isEditing}
                      onValueChange={(v) =>
                        setLocalConfig({
                          ...localConfig,
                          reviewBooster: {
                            ...reviewBooster,
                            ratingThreshold: Number(v),
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} star{n > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Review Site URL</Label>
                    <Input
                      placeholder="https://g.page/your-business/review"
                      value={reviewBooster.reviewUrl}
                      readOnly={!isEditing}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          reviewBooster: {
                            ...reviewBooster,
                            reviewUrl: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Review Prompt Text</Label>
                  <Textarea
                    value={reviewBooster.reviewPromptText}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        reviewBooster: {
                          ...reviewBooster,
                          reviewPromptText: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Template Wording (by Theme)
                </Label>
                <div className="space-y-4">
                  {themeOptions.map((theme) => (
                    <Card key={theme.id}>
                      <CardHeader className="cursor-pointer px-4 py-3">
                        <CardTitle className="text-sm">{theme.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pt-0 pb-4">
                        {(
                          [
                            "todaysVibe",
                            "friendsAndFun",
                            "careMetrics",
                            "holidaySparkle",
                            "closingNote",
                          ] as const
                        ).map((field) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs capitalize">
                              {field.replace(/([A-Z])/g, " $1").trim()}
                            </Label>
                            <Textarea
                              value={localConfig.templates[theme.id][field]}
                              readOnly={!isEditing}
                              className="min-h-[60px] text-sm"
                              onChange={(e) =>
                                setLocalConfig({
                                  ...localConfig,
                                  templates: {
                                    ...localConfig.templates,
                                    [theme.id]: {
                                      ...localConfig.templates[theme.id],
                                      [field]: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        );
      }}
    </SettingsBlock>
  );
}
// Facility booking access & evaluation requirements
function FacilityBookingFlowCard() {
  const { bookingFlow, updateBookingFlow } = useSettings();

  const serviceOptions = [
    { id: "daycare", label: "Daycare" },
    { id: "boarding", label: "Boarding" },
    { id: "grooming", label: "Grooming" },
    { id: "training", label: "Training" },
  ];

  const toggleService = (
    list: string[],
    serviceId: string,
    checked: boolean,
  ) => {
    if (checked) return [...list, serviceId];
    return list.filter((item) => item !== serviceId);
  };

  return (
    <SettingsBlock
      title="Booking Access & Evaluation Rules"
      description="Control when evaluations are required and which services appear in online booking."
      data={bookingFlow}
      onSave={updateBookingFlow}
    >
      {(isEditing, localFlow, setLocalFlow) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Evaluation Required</div>
              <div className="text-muted-foreground text-sm">
                Require evaluation before any service booking.
              </div>
            </div>
            <Switch
              checked={localFlow.evaluationRequired}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalFlow({ ...localFlow, evaluationRequired: checked })
              }
            />
          </div>

          {localFlow.evaluationRequired ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">
                    Hide Services Until Evaluation Completed
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Show only the Evaluation service until it is completed or
                    booked.
                  </div>
                </div>
                <Switch
                  checked={localFlow.hideServicesUntilEvaluationCompleted}
                  disabled={!isEditing}
                  onCheckedChange={(checked) =>
                    setLocalFlow({
                      ...localFlow,
                      hideServicesUntilEvaluationCompleted: checked,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Custom lock message shown to customers</Label>
                <Textarea
                  rows={3}
                  disabled={!isEditing}
                  placeholder="e.g. This service requires a pet evaluation first. Please book an evaluation so we can get to know your pet."
                  value={localFlow.evaluationLockedMessage ?? ""}
                  onChange={(e) =>
                    setLocalFlow({
                      ...localFlow,
                      evaluationLockedMessage: e.target.value,
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Shown to customers when they try to book a service that
                  requires evaluation.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Services Requiring Evaluation First</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {serviceOptions.map((service) => (
                    <div key={service.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`eval-${service.id}`}
                        checked={localFlow.servicesRequiringEvaluation.includes(
                          service.id,
                        )}
                        disabled={!isEditing}
                        onCheckedChange={(checked) =>
                          setLocalFlow({
                            ...localFlow,
                            servicesRequiringEvaluation: toggleService(
                              localFlow.servicesRequiringEvaluation,
                              service.id,
                              !!checked,
                            ),
                          })
                        }
                      />
                      <Label htmlFor={`eval-${service.id}`}>
                        {service.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hidden From Online Booking</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {serviceOptions.map((service) => (
                    <div key={service.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`hidden-${service.id}`}
                        checked={localFlow.hiddenServices.includes(service.id)}
                        disabled={!isEditing}
                        onCheckedChange={(checked) =>
                          setLocalFlow({
                            ...localFlow,
                            hiddenServices: toggleService(
                              localFlow.hiddenServices,
                              service.id,
                              !!checked,
                            ),
                          })
                        }
                      />
                      <Label htmlFor={`hidden-${service.id}`}>
                        {service.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Booking Request Confirmation Message</Label>
            <Textarea
              rows={4}
              disabled={!isEditing}
              placeholder="e.g. Thank you! We've received your booking request and will verify all the details. You'll receive a confirmation email shortly."
              value={localFlow.bookingRequestConfirmationMessage ?? ""}
              onChange={(e) =>
                setLocalFlow({
                  ...localFlow,
                  bookingRequestConfirmationMessage: e.target.value,
                })
              }
            />
            <p className="text-muted-foreground text-xs">
              Shown to customers on the confirmation screen after they submit a
              booking request.
            </p>
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}

// Notification Settings Component
function NotificationSettingsCard() {
  const { notifications, updateNotifications } = useSettings();

  return (
    <SettingsBlock
      title="Notification Settings"
      description="Configure which notifications are sent and through which channels"
      data={notifications}
      onSave={updateNotifications}
    >
      {(isEditing, localNotifications, setLocalNotifications) => (
        <div>
          {/* Group by category */}
          {["client", "staff", "system"].map((category) => (
            <div key={category} className="mb-6">
              <h3 className="mb-3 font-semibold capitalize">
                {category} Notifications
              </h3>
              <div className="space-y-3">
                {localNotifications
                  .filter((n) => n.category === category)
                  .map((notif) => (
                    <div key={notif.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="font-medium">{notif.name}</div>
                          <div className="text-muted-foreground text-sm">
                            {notif.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground size-4" />
                          <span className="text-sm">Email</span>
                          <Switch
                            checked={notif.email}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, email: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground size-4" />
                          <span className="text-sm">SMS</span>
                          <Switch
                            checked={notif.sms}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, sms: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Bell className="text-muted-foreground size-4" />
                          <span className="text-sm">Push</span>
                          <Switch
                            checked={notif.push}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, push: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsBlock>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedSection = searchParams.get("section");
  const initialSection =
    requestedSection === "form-permissions"
      ? "roles-permissions"
      : (requestedSection ?? "business");
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    if (requestedSection === "form-permissions") {
      router.replace("/facility/dashboard/settings?section=roles-permissions", {
        scroll: false,
      });
    }
  }, [requestedSection, router]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    router.replace(`/facility/dashboard/settings?section=${section}`, {
      scroll: false,
    });
  };

  const { integrations, updateIntegrations, addons, updateAddons } =
    useSettings();

  // Audit Log Columns
  const auditColumns: ColumnDef<(typeof auditLog)[0]>[] = [
    {
      accessorKey: "timestamp",
      header: "Date & Time",
      cell: ({ row }) => (
        <div className="text-sm">
          {new Date(row.original.timestamp).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "userName",
      header: "User",
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.action === "created"
              ? "default"
              : row.original.action === "updated"
                ? "secondary"
                : "destructive"
          }
          className="capitalize"
        >
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: "section",
      header: "Section",
    },
    {
      accessorKey: "settingName",
      header: "Setting",
    },
    {
      accessorKey: "changes",
      header: "Changes",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.oldValue && (
            <div className="text-red-600">
              <s>{row.original.oldValue}</s>
            </div>
          )}
          <div className="font-medium text-green-600">
            {row.original.newValue}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your facility settings and preferences
          </p>
        </div>
      </div>

      {/* Sidebar + Content layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        <div className="min-w-0 flex-1 space-y-6">
          {/* Business Configuration */}
          {activeSection === "business" && (
            <div className="space-y-6">
              <BusinessProfileCard />

              <LanguageSettingsCard />

              <BusinessHoursCard />

              <ServiceDayBlockingCard />
              <OneDayScheduleOverrideCard />
              <DropOffPickUpOverrideCard />

              {/* Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-5" />
                    Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {locations.map((location) => (
                    <div key={location.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            {location.name}
                            {location.isActive && (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            {location.address}
                          </div>
                          <div className="mt-2 text-sm">
                            Phone: {location.phone} • Capacity:{" "}
                            {location.capacity} pets
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            alert(
                              `Edit location "${location.name}" - Opens location editor`,
                            );
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <BookingRulesCard />

              <BookingApprovalSettingsCard />

              <FacilityBookingFlowCard />

              {/* Vaccination Rules */}
              <VaccinationRequirementsCard />


              <ReportCardSettingsCard />
            </div>
          )}

          {/* Pricing Rules */}
          {activeSection === "pricing-rules" && (
            <div className="space-y-6">
              <PricingRulesSettings facilityId={11} />
            </div>
          )}

          {/* Estimate Settings */}
          {activeSection === "estimate-settings" && (
            <div className="space-y-6">
              <EstimateFollowUpSettings />
            </div>
          )}

          {/* Financial Settings */}
          {activeSection === "financial" && (
            <div className="space-y-6">
              <TipSettings />

              {/* Payment Gateways */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Gateways</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentGateways.map((gateway, idx) => (
                    <div key={idx} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold capitalize">
                            {gateway.provider}
                          </div>
                          {gateway.isEnabled && (
                            <Badge variant="default">Active</Badge>
                          )}
                          {gateway.testMode && (
                            <Badge variant="secondary">Test Mode</Badge>
                          )}
                        </div>
                        <Switch checked={gateway.isEnabled} />
                      </div>
                      {gateway.isEnabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">API Key</Label>
                            <Input
                              type="password"
                              value={gateway.apiKey}
                              readOnly
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Webhook Secret</Label>
                            <Input
                              type="password"
                              value={gateway.webhookSecret}
                              readOnly
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Tax Rates */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Rates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {taxRates.map((tax) => (
                    <div key={tax.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{tax.name}</span>
                            {tax.isDefault && (
                              <Badge variant="default">Default</Badge>
                            )}
                          </div>
                          <div className="mt-2 text-2xl font-bold">
                            {tax.rate}%
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tax.applicableServices.map((service, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            alert(
                              `Edit tax rate "${tax.name}" - Opens tax rate editor`,
                            );
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Currency Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Currency Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={currencySettings.currency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">
                            GBP - British Pound
                          </SelectItem>
                          <SelectItem value="CAD">
                            CAD - Canadian Dollar
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Currency Symbol</Label>
                      <Input value={currencySettings.symbol} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Decimal Places</Label>
                      <Input
                        type="number"
                        value={currencySettings.decimalPlaces}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Format Preview</Label>
                      <div className="bg-muted rounded-sm border p-2 font-mono">
                        {currencySettings.symbol}1
                        {currencySettings.thousandSeparator}234
                        {currencySettings.decimalSeparator}56
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Data Lock-down */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Data Lock-down</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Prevent editing of financial records after a certain period
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">
                        Enable Financial Lock-down
                      </div>
                      <div className="text-muted-foreground text-sm">
                        Lock financial data after end of month
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label>Lock Period (days after month end)</Label>
                    <Input type="number" defaultValue={7} />
                    <p className="text-muted-foreground text-xs">
                      Financial records will be locked 7 days after the month
                      ends
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Custom Email Domain */}
          {activeSection === "custom-email-domain" && (
            <div className="space-y-6">
              <CustomEmailDomainSettings />
            </div>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <div className="space-y-6">
              <NotificationSettingsCard />

              <ServiceNotificationSettings />

              {/* Template Editor */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Template Editor</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Customize email and SMS templates (linked to Communications
                    → Templates)
                  </p>
                </CardHeader>
                <CardContent>
                  <Link href="/facility/dashboard/communications">
                    <Button variant="outline">Open Template Editor</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Yipyy Forecast */}
          {activeSection === "weather" && (
            <div className="space-y-6">
              <WeatherWarningSettings />
            </div>
          )}

          {/* Integrations */}
          {activeSection === "integrations" && (
            <div className="space-y-6">
              {/* Communication Integrations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="size-5" />
                    Communication Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations
                    .filter((i) => i.category === "communication")
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">
                              {integration.name}
                            </div>
                            {integration.isEnabled && (
                              <Badge variant="default">Connected</Badge>
                            )}
                          </div>
                          <Switch
                            checked={integration.isEnabled}
                            onCheckedChange={(checked) =>
                              updateIntegrations(
                                integrations.map((i) =>
                                  i.id === integration.id
                                    ? { ...i, isEnabled: checked }
                                    : i,
                                ),
                              )
                            }
                          />
                        </div>
                        {integration.isEnabled && (
                          <div className="text-muted-foreground text-sm">
                            Connected and operational
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Phone Integration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="size-5" />
                    VOIP & Phone System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations
                    .filter((i) => i.category === "phone")
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">
                              {integration.name}
                            </div>
                            {integration.isEnabled && (
                              <Badge variant="default">Connected</Badge>
                            )}
                          </div>
                          <Switch checked={integration.isEnabled} />
                        </div>
                        {integration.isEnabled && (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Phone Number:</strong>{" "}
                              {String(integration.config.phoneNumber)}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <strong>Call Recording:</strong>
                              {integration.config.recordCalls ? (
                                <Badge variant="default" className="text-xs">
                                  Enabled
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Accounting Integration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="size-5" />
                    Accounting Integration
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    QuickBooks Online integration (Phase 2)
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations
                    .filter((i) => i.category === "accounting")
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">
                              {integration.name}
                            </div>
                            {integration.isEnabled ? (
                              <Badge variant="default">Connected</Badge>
                            ) : (
                              <Badge variant="secondary">Not Connected</Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateIntegrations(
                                integrations.map((i) =>
                                  i.id === integration.id
                                    ? { ...i, isEnabled: !i.isEnabled }
                                    : i,
                                ),
                              );
                              alert(
                                `${integration.name} ${integration.isEnabled ? "disconnected" : "connected"} successfully!`,
                              );
                            }}
                          >
                            {integration.isEnabled ? "Disconnect" : "Connect"}
                          </Button>
                        </div>
                        <div className="text-muted-foreground text-sm">
                          Sync frequency: Daily
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* AI Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="size-5" />
                    AI Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations
                    .filter((i) => i.category === "ai")
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">
                              {integration.name}
                            </div>
                            {integration.isEnabled && (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <Switch checked={integration.isEnabled} />
                        </div>
                        {integration.isEnabled && (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Model:</strong>{" "}
                              {String(integration.config.model)}
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                Enabled Features:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(
                                  integration.config.features,
                                ).map(([feature, enabled]) =>
                                  enabled ? (
                                    <Badge
                                      key={feature}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {feature
                                        .replace(/([A-Z])/g, " $1")
                                        .trim()}
                                    </Badge>
                                  ) : null,
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Live Pet Cam */}
          {activeSection === "live-cameras" && (
            <CameraIntegrationSettings />
          )}

          {/* Mobile App */}
          {activeSection === "mobile-app" && (
            <div className="space-y-6">
              <MobileAppSettings />
            </div>
          )}

          {/* Subscription */}
          {activeSection === "subscription" && (
            <div className="space-y-6">
              {/* Current Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between rounded-lg bg-linear-to-br from-blue-50 to-purple-50 p-6">
                    <div>
                      <div className="text-2xl font-bold">
                        {subscription.planName}
                      </div>
                      <div className="text-muted-foreground mt-1 capitalize">
                        {subscription.billingCycle} billing
                      </div>
                      <div className="mt-4">
                        <Badge
                          variant={
                            subscription.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          className="capitalize"
                        >
                          {subscription.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">
                        ${subscription.price}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        per{" "}
                        {subscription.billingCycle === "monthly"
                          ? "month"
                          : "year"}
                      </div>
                      <div className="text-muted-foreground mt-2 text-xs">
                        Next billing:{" "}
                        {new Date(
                          subscription.nextBillingDate,
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        alert(
                          "Opens plan selection modal - Choose from Starter, Professional, and Enterprise plans",
                        );
                      }}
                    >
                      Change Plan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        alert(
                          "Opens billing history - Shows all past invoices and payment history",
                        );
                      }}
                    >
                      Billing History
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Module Add-ons */}
              <Card>
                <CardHeader>
                  <CardTitle>Module Add-ons</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Enable additional modules to extend functionality
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {addons.map((addon) => (
                    <div key={addon.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{addon.name}</span>
                            {addon.isIncludedInPlan && (
                              <Badge variant="default">Included in Plan</Badge>
                            )}
                            {addon.isEnabled && !addon.isIncludedInPlan && (
                              <Badge variant="secondary">Active Add-on</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            {addon.description}
                          </div>
                          {!addon.isIncludedInPlan && (
                            <div className="mt-2 text-sm font-medium">
                              ${addon.monthlyPrice}/month
                            </div>
                          )}
                        </div>
                        <Switch
                          checked={addon.isEnabled}
                          disabled={addon.isIncludedInPlan}
                          onCheckedChange={(checked) =>
                            updateAddons(
                              addons.map((a) =>
                                a.id === addon.id
                                  ? { ...a, isEnabled: checked }
                                  : a,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Audit Log */}
          {activeSection === "audit" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Audit Log</CardTitle>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Complete history of all setting changes
                      </p>
                    </div>
                    <Button variant="outline">
                      <Download className="mr-2 size-4" />
                      Export Log
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={auditColumns}
                    data={auditLog}
                    searchColumn="settingName"
                    searchPlaceholder="Search audit log..."
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* YipyyGo */}
          {activeSection === "yipyygo" && (
            <div className="space-y-6">
              <YipyyGoSettingsWrapper />
            </div>
          )}

          {/* Form Requirements */}
          {activeSection === "form-requirements" && (
            <div className="space-y-6">
              <FormRequirementsSettings />
            </div>
          )}

          {/* Roles & Permissions */}
          {activeSection === "roles-permissions" && (
            <div className="space-y-6">
              <FacilityRolesStudio />
            </div>
          )}

          {/* Form Notifications */}
          {activeSection === "form-notifications" && (
            <div className="space-y-6">
              <FormNotificationSettings />
            </div>
          )}

          {/* Pet Breeds */}
          {activeSection === "pet-breeds" && (
            <div className="space-y-6">
              <BreedManagement />
            </div>
          )}

          {/* Tags & Notes */}
          {activeSection === "tags-notes" && (
            <div className="space-y-6">
              <TagNotesSettings />
            </div>
          )}

          {/* Evaluations */}
          {activeSection === "evaluations" && (
            <div className="space-y-6">
              <EvaluationSettings />
              <EvaluationBookingWizardSettings />
              <EvaluationFormBuilder />
              <EvaluationReportCardBuilder />
            </div>
          )}

          {/* Booking Statuses */}
          {activeSection === "booking-statuses" && (
            <div className="space-y-6">
              <BookingStatusSettings />
              <StatusColorSettings />
            </div>
          )}

          {/* Express Check-in Requirements */}
          {activeSection === "checkin-requirements" && (
            <div className="space-y-6">
              <CheckinRequirementsSettings />
            </div>
          )}

          {/* Retail / POS */}
          {activeSection === "retail" && (
            <div className="space-y-6">
              <RetailSettings />
            </div>
          )}

          {/* Taxes */}
          {activeSection === "taxes" && (
            <div className="space-y-6">
              <TaxSettings />
            </div>
          )}

          {/* Care Tasks */}
          {activeSection === "care-tasks" && (
            <div className="space-y-6">
              <FeedingMedicationConfig />
              <CareTaskSettings />
            </div>
          )}

          {/* Service settings placeholder sections */}
          {activeSection === "boarding" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Boarding Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Boarding module configuration — pricing, evaluation, media,
                    and basic info.
                  </p>
                  <Link
                    href="/facility/dashboard/services/boarding"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Go to Boarding Module →
                  </Link>
                </CardContent>
              </Card>
              <ServiceColorCard service="Boarding" />
            </div>
          )}

          {activeSection === "daycare" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daycare Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Daycare module configuration — pricing, evaluation, media,
                    and basic info.
                  </p>
                  <Link
                    href="/facility/dashboard/services/daycare"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Go to Daycare Module →
                  </Link>
                </CardContent>
              </Card>
              <ServiceColorCard service="Daycare" />
            </div>
          )}

          {activeSection === "grooming" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grooming Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Grooming module configuration — scheduling, pricing,
                    add-ons, stylists, and policies.
                  </p>
                  <Link
                    href="/facility/dashboard/services/grooming"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Go to Grooming Module →
                  </Link>
                </CardContent>
              </Card>
              <ServiceColorCard service="Grooming" />
            </div>
          )}

          {activeSection === "training" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Training Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Training module configuration — courses, session types, and
                    trainer management.
                  </p>
                  <Link
                    href="/facility/dashboard/services/training"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Go to Training Module →
                  </Link>
                </CardContent>
              </Card>
              <ServiceColorCard service="Training" />
            </div>
          )}

          {/* Add-Ons */}
          {activeSection === "addons" && (
            <div className="space-y-6">
              <AddOnsSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// YipyyGo Settings Wrapper Component
function YipyyGoSettingsWrapper() {
  const facilityId = 11; // TODO: Get from auth context
  const [config, setConfig] = useState(() => getYipyyGoConfig(facilityId)!);

  return (
    <YipyyGoSettings
      config={config}
      onConfigChange={setConfig}
      facilityId={facilityId}
    />
  );
}
