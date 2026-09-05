"use client";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFacilityProfile,
  useUpdateFacilityProfile,
} from "@/lib/api/facility-profile";

import { FacilityLogoField } from "@/components/facility/FacilityLogoField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// Business Profile — the facility's own name, contact details and address.
//
// This is the one settings section that reads POSTGRES rather than
// `src/data/settings.ts`. Every facility used to render the fixture — "PawCare
// Facility", contact@pawcare.com, 123 Pet Street, San Francisco — with no code
// path that could have shown anything else, however new and however real the
// business was.
//
// `weatherRules` still comes from the settings context, because it has not been
// converted yet and the temperature-unit change below has to convert its
// thresholds. Reading two sources here is the honest half-way state, and the
// alternative is holding this fix back until twenty other domains land.
// ============================================================================
export function BusinessProfileCard() {
  const { weatherRules, updateWeatherRules } = useSettings();
  const { profile, isPending } = useFacilityProfile();
  const saveProfile = useUpdateFacilityProfile();

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

  const handleSaveProfile = async (nextProfile: typeof profile) => {
    const previousUnit = profile.preferences.temperatureUnit;
    const nextUnit = nextProfile.preferences.temperatureUnit;

    // The profile write goes FIRST, and the rest only runs if it succeeded.
    // Converting the weather thresholds for a unit change that was then
    // refused would leave the rules measuring in a unit the facility is not
    // using — a silent corruption behind a visible failure.
    await saveProfile.mutateAsync(nextProfile);

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
  };

  // Blank fields before the row arrives would read as "this facility has no
  // address", which is a claim. A skeleton says only that we do not know yet.
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-14 rounded-lg" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

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
            <FacilityLogoField
              businessName={localProfile.businessName}
              logo={localProfile.logo ?? ""}
              disabled={!isEditing}
              onChange={(logo: string) =>
                setLocalProfile({ ...localProfile, logo })
              }
            />
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
