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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw } from "lucide-react";

export default function DaycareSettingsPage() {
  const [settings, setSettings] = useState({
    // General Settings
    enabled: true,
    allowDropIns: true,
    requireReservation: false,
    maxDailyCapacity: 30,

    // Operating Hours
    openTime: "07:00",
    closeTime: "19:00",
    halfDayCutoffTime: "12:00",

    // Pricing
    fullDayRate: 35,
    halfDayRate: 22,
    multiPetDiscount: 10,
    packageDiscountEnabled: true,

    // Play Groups
    enablePlayGroups: true,
    maxDogsPerGroup: 10,
    separateBySize: true,
    separateByTemperament: true,

    // Pet Requirements
    requireVaccinationRecords: true,
    requiredVaccinations: ["Rabies", "DHPP", "Bordetella"],
    requireTemperamentTest: true,
    temperamentTestFee: 25,
    minPetAge: 4,
    maxPetAge: 0, // 0 = no max

    // Feeding & Medication
    allowFeeding: true,
    feedingFee: 5,
    allowMedication: true,
    medicationFee: 10,

    // Notifications
    sendDropOffConfirmation: true,
    sendPickUpReminder: true,
    reminderMinutesBefore: 30,
    sendDailyReportCard: true,
    includePhotosInReportCard: true,

    // Policies
    cancellationPolicy:
      "Cancellations must be made by 6 PM the day before. Same-day cancellations may be charged.",
    daycareRules:
      "All dogs must be spayed/neutered if over 6 months. Aggressive behavior will result in dismissal.",
    latePickupPolicy:
      "Late pickups after closing time will incur a $1 per minute fee.",
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // TODO: Save to backend
    setIsEditing(false);
  };

  const handleReset = () => {
    // TODO: Reset to saved values
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Daycare Settings
          </h2>
          <p className="text-muted-foreground">
            Configure daycare service preferences and policies
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Basic daycare service configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Daycare Service</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to book daycare
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enabled: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Drop-ins</Label>
                <p className="text-sm text-muted-foreground">
                  Accept walk-in customers without reservation
                </p>
              </div>
              <Switch
                checked={settings.allowDropIns}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowDropIns: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Maximum Daily Capacity</Label>
              <Input
                type="number"
                value={settings.maxDailyCapacity}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxDailyCapacity: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
            <CardDescription>
              Set daycare hours and half-day cutoff
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Opening Time</Label>
                <Input
                  type="time"
                  value={settings.openTime}
                  onChange={(e) =>
                    setSettings({ ...settings, openTime: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Closing Time</Label>
                <Input
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) =>
                    setSettings({ ...settings, closeTime: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Half-Day Cutoff Time</Label>
                <Input
                  type="time"
                  value={settings.halfDayCutoffTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      halfDayCutoffTime: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>
              Configure daycare rates and discounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Day Rate ($)</Label>
                <Input
                  type="number"
                  value={settings.fullDayRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fullDayRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Half Day Rate ($)</Label>
                <Input
                  type="number"
                  value={settings.halfDayRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      halfDayRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Package Discounts</Label>
                <p className="text-sm text-muted-foreground">
                  Offer discounted rates for daycare packages
                </p>
              </div>
              <Switch
                checked={settings.packageDiscountEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, packageDiscountEnabled: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Multi-Pet Discount (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.multiPetDiscount}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      multiPetDiscount: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-24"
                />
                <span className="text-muted-foreground">
                  % off for additional pets
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Play Groups */}
        <Card>
          <CardHeader>
            <CardTitle>Play Groups</CardTitle>
            <CardDescription>
              Configure how dogs are grouped during play time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Play Groups</Label>
                <p className="text-sm text-muted-foreground">
                  Organize dogs into supervised play groups
                </p>
              </div>
              <Switch
                checked={settings.enablePlayGroups}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enablePlayGroups: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enablePlayGroups && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Maximum Dogs Per Group</Label>
                  <Input
                    type="number"
                    value={settings.maxDogsPerGroup}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxDogsPerGroup: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Separate by Size</Label>
                    <p className="text-sm text-muted-foreground">
                      Group dogs by size (small, medium, large)
                    </p>
                  </div>
                  <Switch
                    checked={settings.separateBySize}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, separateBySize: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Separate by Temperament</Label>
                    <p className="text-sm text-muted-foreground">
                      Group dogs by play style and energy level
                    </p>
                  </div>
                  <Switch
                    checked={settings.separateByTemperament}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        separateByTemperament: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pet Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Pet Requirements</CardTitle>
            <CardDescription>
              Set requirements for pets using daycare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Vaccination Records</Label>
                <p className="text-sm text-muted-foreground">
                  Pets must have up-to-date vaccination records
                </p>
              </div>
              <Switch
                checked={settings.requireVaccinationRecords}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    requireVaccinationRecords: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Temperament Test</Label>
                <p className="text-sm text-muted-foreground">
                  New dogs must pass a temperament evaluation
                </p>
              </div>
              <Switch
                checked={settings.requireTemperamentTest}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireTemperamentTest: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.requireTemperamentTest && (
              <div className="space-y-2">
                <Label>Temperament Test Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.temperamentTestFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      temperamentTestFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <Label>Minimum Pet Age (months)</Label>
              <Input
                type="number"
                value={settings.minPetAge}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minPetAge: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* Feeding & Medication */}
        <Card>
          <CardHeader>
            <CardTitle>Feeding & Medication</CardTitle>
            <CardDescription>Configure add-on services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Feeding</Label>
                <p className="text-sm text-muted-foreground">
                  Offer feeding service during daycare
                </p>
              </div>
              <Switch
                checked={settings.allowFeeding}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowFeeding: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.allowFeeding && (
              <div className="space-y-2">
                <Label>Feeding Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.feedingFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      feedingFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Medication Administration</Label>
                <p className="text-sm text-muted-foreground">
                  Administer medication during daycare
                </p>
              </div>
              <Switch
                checked={settings.allowMedication}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowMedication: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.allowMedication && (
              <div className="space-y-2">
                <Label>Medication Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.medicationFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      medicationFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure automated notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Drop-off Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Notify owners when their pet is checked in
                </p>
              </div>
              <Switch
                checked={settings.sendDropOffConfirmation}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendDropOffConfirmation: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Pick-up Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Remind owners before closing time
                </p>
              </div>
              <Switch
                checked={settings.sendPickUpReminder}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendPickUpReminder: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.sendPickUpReminder && (
              <div className="space-y-2">
                <Label>Reminder Time (minutes before closing)</Label>
                <Input
                  type="number"
                  value={settings.reminderMinutesBefore}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reminderMinutesBefore: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Daily Report Card</Label>
                <p className="text-sm text-muted-foreground">
                  Send a report card after each daycare visit
                </p>
              </div>
              <Switch
                checked={settings.sendDailyReportCard}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendDailyReportCard: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.sendDailyReportCard && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Photos in Report Card</Label>
                  <p className="text-sm text-muted-foreground">
                    Attach photos of the pet during their visit
                  </p>
                </div>
                <Switch
                  checked={settings.includePhotosInReportCard}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      includePhotosInReportCard: checked,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
            <CardDescription>
              Define daycare policies displayed to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cancellation Policy</Label>
              <Textarea
                value={settings.cancellationPolicy}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cancellationPolicy: e.target.value,
                  })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Daycare Rules</Label>
              <Textarea
                value={settings.daycareRules}
                onChange={(e) =>
                  setSettings({ ...settings, daycareRules: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Late Pickup Policy</Label>
              <Textarea
                value={settings.latePickupPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, latePickupPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
