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

export default function BoardingSettingsPage() {
  const [settings, setSettings] = useState({
    // General Settings
    enabled: true,
    requiresDeposit: true,
    depositPercentage: 25,
    allowSameDayBooking: false,
    minAdvanceBookingHours: 24,
    maxAdvanceBookingDays: 90,

    // Capacity Settings
    maxKennelCapacity: 50,
    overbookingAllowed: false,
    overbookingPercentage: 10,

    // Check-in/Check-out
    defaultCheckInTime: "14:00",
    defaultCheckOutTime: "11:00",
    lateCheckOutFee: 25,
    earlyCheckInFee: 15,
    gracePeriodMinutes: 30,

    // Pet Requirements
    requireVaccinationRecords: true,
    requiredVaccinations: ["Rabies", "DHPP", "Bordetella"],
    requireSpayNeuterProof: false,
    minPetAge: 4,

    // Notifications
    sendBookingConfirmation: true,
    sendCheckInReminder: true,
    reminderHoursBefore: 24,
    sendDailyUpdates: true,

    // Policies
    cancellationPolicy:
      "Cancellations must be made 48 hours in advance for a full refund. Late cancellations may incur a fee.",
    petPolicyNotes:
      "All pets must be current on vaccinations. Aggressive animals may be refused boarding.",
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
            Boarding Settings
          </h2>
          <p className="text-muted-foreground">
            Configure boarding service preferences and policies
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
              Basic boarding service configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Boarding Service</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to book boarding reservations
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
                <Label>Require Deposit</Label>
                <p className="text-sm text-muted-foreground">
                  Collect a deposit at time of booking
                </p>
              </div>
              <Switch
                checked={settings.requiresDeposit}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requiresDeposit: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.requiresDeposit && (
              <div className="grid gap-2">
                <Label>Deposit Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.depositPercentage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        depositPercentage: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Advance Booking (hours)</Label>
                <Input
                  type="number"
                  value={settings.minAdvanceBookingHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minAdvanceBookingHours: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Advance Booking (days)</Label>
                <Input
                  type="number"
                  value={settings.maxAdvanceBookingDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxAdvanceBookingDays: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Capacity Settings</CardTitle>
            <CardDescription>
              Manage kennel capacity and availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Maximum Kennel Capacity</Label>
              <Input
                type="number"
                value={settings.maxKennelCapacity}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxKennelCapacity: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Overbooking</Label>
                <p className="text-sm text-muted-foreground">
                  Accept bookings beyond capacity (for cancellation buffer)
                </p>
              </div>
              <Switch
                checked={settings.overbookingAllowed}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, overbookingAllowed: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.overbookingAllowed && (
              <div className="grid gap-2">
                <Label>Overbooking Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.overbookingPercentage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        overbookingPercentage: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-in/Check-out Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Check-in / Check-out</CardTitle>
            <CardDescription>
              Configure timing and fees for arrivals and departures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Check-in Time</Label>
                <Input
                  type="time"
                  value={settings.defaultCheckInTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultCheckInTime: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Check-out Time</Label>
                <Input
                  type="time"
                  value={settings.defaultCheckOutTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultCheckOutTime: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Early Check-in Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.earlyCheckInFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      earlyCheckInFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Late Check-out Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.lateCheckOutFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lateCheckOutFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Grace Period (minutes)</Label>
                <Input
                  type="number"
                  value={settings.gracePeriodMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      gracePeriodMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pet Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Pet Requirements</CardTitle>
            <CardDescription>
              Set requirements for pets using the boarding service
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Vaccination Records</Label>
                <p className="text-sm text-muted-foreground">
                  Pets must have up-to-date vaccination records on file
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
                <Label>Require Spay/Neuter Proof</Label>
                <p className="text-sm text-muted-foreground">
                  Pets must be spayed or neutered
                </p>
              </div>
              <Switch
                checked={settings.requireSpayNeuterProof}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireSpayNeuterProof: checked })
                }
                disabled={!isEditing}
              />
            </div>
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

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure automated notifications for boarding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Booking Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Email confirmation when a booking is made
                </p>
              </div>
              <Switch
                checked={settings.sendBookingConfirmation}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendBookingConfirmation: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Check-in Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Remind customers before their scheduled check-in
                </p>
              </div>
              <Switch
                checked={settings.sendCheckInReminder}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendCheckInReminder: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.sendCheckInReminder && (
              <div className="space-y-2">
                <Label>Reminder Time (hours before)</Label>
                <Input
                  type="number"
                  value={settings.reminderHoursBefore}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reminderHoursBefore: parseInt(e.target.value) || 0,
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
                <Label>Send Daily Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Send daily updates to pet owners during their stay
                </p>
              </div>
              <Switch
                checked={settings.sendDailyUpdates}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendDailyUpdates: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
            <CardDescription>
              Define boarding policies displayed to customers
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
              <Label>Pet Policy Notes</Label>
              <Textarea
                value={settings.petPolicyNotes}
                onChange={(e) =>
                  setSettings({ ...settings, petPolicyNotes: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
