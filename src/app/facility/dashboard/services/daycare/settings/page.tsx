"use client";

import { useState } from "react";
import Image from "next/image";
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
import { Save, RotateCcw, Plus, Image as ImageIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DefaultInclusion {
  id: string;
  name: string;
  description: string;
}

export default function DaycareSettingsPage() {
  const [settings, setSettings] = useState({
    // Service Information
    moduleDescription:
      "Our daycare service provides a safe, fun, and supervised environment for your pets. We offer spacious play areas, trained staff, and personalized attention to ensure your pet has the best day possible.",
    heroImage: "/images/daycare-hero.jpg",

    // General Settings
    enabled: true,
    allowDropIns: true,
    requireReservation: false,
    maxDailyCapacity: 30,

    // Operating Hours & Thresholds
    openTime: "07:00",
    closeTime: "19:00",
    halfDayCutoffTime: "12:00",
    halfDayThresholdHours: 4,
    fullDayThresholdHours: 4,

    // Default Inclusions
    defaultInclusions: [
      {
        id: "1",
        name: "Supervised Playtime",
        description: "Continuous staff supervision during play",
      },
      {
        id: "2",
        name: "Climate-Controlled Environment",
        description: "Comfortable temperature year-round",
      },
      {
        id: "3",
        name: "Water Access",
        description: "Fresh water available at all times",
      },
      {
        id: "4",
        name: "Rest Periods",
        description: "Scheduled quiet time for rest",
      },
      {
        id: "5",
        name: "Daily Report Card",
        description: "Photo updates and activity summary",
      },
    ] as DefaultInclusion[],

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
    maxPetAge: 0,

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

  const [inclusionDialogOpen, setInclusionDialogOpen] = useState(false);
  const [inclusionForm, setInclusionForm] = useState({
    name: "",
    description: "",
  });

  const handleSave = () => {
    // TODO: Save to backend
    setIsEditing(false);
  };

  const handleReset = () => {
    // TODO: Reset to saved values
    setIsEditing(false);
  };

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, heroImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addInclusion = () => {
    if (inclusionForm.name.trim()) {
      setSettings({
        ...settings,
        defaultInclusions: [
          ...settings.defaultInclusions,
          { id: `inc-${Date.now()}`, ...inclusionForm },
        ],
      });
      setInclusionForm({ name: "", description: "" });
      setInclusionDialogOpen(false);
    }
  };

  const deleteInclusion = (id: string) => {
    setSettings({
      ...settings,
      defaultInclusions: settings.defaultInclusions.filter((i) => i.id !== id),
    });
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
        {/* Service Information */}
        <Card>
          <CardHeader>
            <CardTitle>Service Information</CardTitle>
            <CardDescription>
              Client-facing description and imagery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Service Description</Label>
              <Textarea
                value={settings.moduleDescription}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    moduleDescription: e.target.value,
                  })
                }
                disabled={!isEditing}
                rows={4}
                placeholder="Describe your daycare service to potential clients..."
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Hero Image</Label>
              <div className="flex gap-4">
                {settings.heroImage && (
                  <div className="relative w-48 h-32 rounded-lg overflow-hidden border">
                    <Image
                      src={settings.heroImage}
                      alt="Hero"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isEditing}
                    onClick={() =>
                      document.getElementById("heroImageUpload")?.click()
                    }
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {settings.heroImage ? "Change Image" : "Upload Image"}
                  </Button>
                  <input
                    id="heroImageUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeroImageUpload}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Operating Hours & Day Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours & Day Thresholds</CardTitle>
            <CardDescription>
              Set daycare hours and define half-day vs full-day duration
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
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Half-Day Threshold (hours)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.halfDayThresholdHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        halfDayThresholdHours: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Bookings under this duration count as half-day
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Full-Day Threshold (hours)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={settings.fullDayThresholdHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fullDayThresholdHours: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Bookings over this duration count as full-day
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Inclusions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Default Inclusions</CardTitle>
                <CardDescription>
                  What&apos;s included by default in the daycare service
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setInclusionDialogOpen(true)}
                disabled={!isEditing}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Inclusion
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {settings.defaultInclusions.map((inclusion) => (
                <div
                  key={inclusion.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{inclusion.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {inclusion.description}
                    </p>
                  </div>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteInclusion(inclusion.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours & Day Thresholds */}
        {/* Play Groups */}
        <Card>
          <CardHeader>
            <CardTitle>Play Groups</CardTitle>
            <CardDescription>Configure play group settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Play Groups</Label>
                <p className="text-sm text-muted-foreground">
                  Organize pets into supervised play groups
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
            <Separator />
            <div className="space-y-2">
              <Label>Maximum Dogs per Group</Label>
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
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Separate by Size</Label>
                <p className="text-sm text-muted-foreground">
                  Group pets by size category
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
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Separate by Temperament</Label>
                <p className="text-sm text-muted-foreground">
                  Group pets by temperament compatibility
                </p>
              </div>
              <Switch
                checked={settings.separateByTemperament}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, separateByTemperament: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pet Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Pet Requirements</CardTitle>
            <CardDescription>
              Vaccination and health requirements for daycare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Vaccination Records</Label>
                <p className="text-sm text-muted-foreground">
                  Pets must have up-to-date vaccinations
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
                  New pets must pass temperament evaluation
                </p>
              </div>
              <Switch
                checked={settings.requireTemperamentTest}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    requireTemperamentTest: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
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
            <CardDescription>
              Additional care services for pets with special needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Feeding</Label>
                <p className="text-sm text-muted-foreground">
                  Offer feeding services during daycare
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
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Medication Administration</Label>
                <p className="text-sm text-muted-foreground">
                  Staff can administer medications during daycare
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
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Automated notifications for clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Drop-off Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Notify clients when pet is checked in
                </p>
              </div>
              <Switch
                checked={settings.sendDropOffConfirmation}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    sendDropOffConfirmation: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Pick-up Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Remind clients before closing time
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
            <div className="space-y-2">
              <Label>Reminder Minutes Before Closing</Label>
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
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Daily Report Card</Label>
                <p className="text-sm text-muted-foreground">
                  Send end-of-day activity summary
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Photos in Report Card</Label>
                <p className="text-sm text-muted-foreground">
                  Add photos to the daily report card
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
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
            <CardDescription>Terms and conditions for daycare</CardDescription>
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
              <Label>Late Pick-up Policy</Label>
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

      {/* Inclusion Dialog */}
      <Dialog open={inclusionDialogOpen} onOpenChange={setInclusionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Default Inclusion</DialogTitle>
            <DialogDescription>
              Add a service that&apos;s included by default
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={inclusionForm.name}
                onChange={(e) =>
                  setInclusionForm({ ...inclusionForm, name: e.target.value })
                }
                placeholder="e.g., Supervised Playtime"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={inclusionForm.description}
                onChange={(e) =>
                  setInclusionForm({
                    ...inclusionForm,
                    description: e.target.value,
                  })
                }
                placeholder="Brief description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInclusionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={addInclusion}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
