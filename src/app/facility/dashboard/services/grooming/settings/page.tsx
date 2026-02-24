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

export default function GroomingSettingsPage() {
  const [settings, setSettings] = useState({
    // General Settings
    enabled: true,
    allowOnlineBooking: true,
    requireDeposit: false,
    depositAmount: 20,

    // Scheduling
    minAdvanceBookingHours: 4,
    maxAdvanceBookingDays: 60,
    defaultAppointmentDuration: 60,
    bufferTimeBetweenAppointments: 15,
    allowSameDayBooking: true,

    // Operating Hours
    openTime: "09:00",
    closeTime: "18:00",
    lastAppointmentTime: "16:00",

    // Pricing
    baseGroomingPrice: 50,
    bathOnlyPrice: 25,
    additionalServiceFee: 10,
    largeDogSurcharge: 15,
    matRemovalFee: 20,

    // Pet Requirements
    requireVaccinationRecords: true,
    requiredVaccinations: ["Rabies", "DHPP", "Bordetella"],
    maxPetWeight: 150,
    acceptAggressivePets: false,

    // Stylist Settings
    allowStylistSelection: true,
    autoAssignStylist: true,
    showStylistAvailability: true,
    maxDogsPerStylistPerDay: 8, // Maximum appointments per stylist per day
    allowParallelGrooming: false, // Allow stylist to groom multiple dogs simultaneously

    // Add-on Services
    enableNailTrimming: true,
    nailTrimmingPrice: 12,
    enableTeethBrushing: true,
    teethBrushingPrice: 8,
    enableEarCleaning: true,
    earCleaningPrice: 10,
    enableDeShedding: true,
    deSheddingPrice: 25,
    enableFleaTreatment: true,
    fleaTreatmentPrice: 15,

    // Operational Flow Controls
    requireCheckInBeforeGroom: true, // Require check-in before groom can start
    requireDepositPerPackage: false, // Allow deposit requirement to be set per package (overrides global)
    autoReadyForPickupSMS: true, // Automatically send SMS when status changes to "ready-for-pickup"
    autoReadyForPickupEmail: true, // Automatically send Email when status changes to "ready-for-pickup"

    // Notifications
    sendBookingConfirmation: true,
    sendAppointmentReminder: true,
    reminderHoursBefore: 24,
    sendCompletionNotification: true,
    includeBeforeAfterPhotos: true,

    // Policies
    cancellationPolicy:
      "Cancellations must be made at least 24 hours in advance. Late cancellations or no-shows may be charged a fee.",
    groomingNotes:
      "Please inform us of any matting, skin conditions, or behavioral issues before the appointment. Additional charges may apply for severely matted coats.",
    lateArrivalPolicy:
      "Appointments more than 15 minutes late may need to be rescheduled.",
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
            Grooming Settings
          </h2>
          <p className="text-muted-foreground">
            Configure grooming service preferences and policies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/facility/dashboard/services/grooming/settings/booking-rules">
              Booking Rules Engine
            </a>
          </Button>
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
              Basic grooming service configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Grooming Service</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to book grooming appointments
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
                <Label>Allow Online Booking</Label>
                <p className="text-sm text-muted-foreground">
                  Customers can book appointments through the website
                </p>
              </div>
              <Switch
                checked={settings.allowOnlineBooking}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowOnlineBooking: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Deposit</Label>
                <p className="text-sm text-muted-foreground">
                  Collect a deposit when booking
                </p>
              </div>
              <Switch
                checked={settings.requireDeposit}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireDeposit: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.requireDeposit && (
              <div className="space-y-2">
                <Label>Deposit Amount ($)</Label>
                <Input
                  type="number"
                  value={settings.depositAmount}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      depositAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduling</CardTitle>
            <CardDescription>
              Configure appointment scheduling options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Appointment Duration (minutes)</Label>
                <Input
                  type="number"
                  value={settings.defaultAppointmentDuration}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultAppointmentDuration: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Buffer Between Appointments (minutes)</Label>
                <Input
                  type="number"
                  value={settings.bufferTimeBetweenAppointments}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bufferTimeBetweenAppointments:
                        parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Same-Day Booking</Label>
                <p className="text-sm text-muted-foreground">
                  Accept appointments for the current day
                </p>
              </div>
              <Switch
                checked={settings.allowSameDayBooking}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowSameDayBooking: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
            <CardDescription>Set grooming salon hours</CardDescription>
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
                <Label>Last Appointment Time</Label>
                <Input
                  type="time"
                  value={settings.lastAppointmentTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lastAppointmentTime: e.target.value,
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
            <CardTitle>Base Pricing</CardTitle>
            <CardDescription>Configure base grooming rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Grooming Price ($)</Label>
                <Input
                  type="number"
                  value={settings.baseGroomingPrice}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      baseGroomingPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Bath Only Price ($)</Label>
                <Input
                  type="number"
                  value={settings.bathOnlyPrice}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bathOnlyPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Large Dog Surcharge ($)</Label>
                <Input
                  type="number"
                  value={settings.largeDogSurcharge}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      largeDogSurcharge: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Mat Removal Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.matRemovalFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      matRemovalFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add-on Services */}
        <Card>
          <CardHeader>
            <CardTitle>Add-on Services</CardTitle>
            <CardDescription>
              Configure additional grooming services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nail Trimming</Label>
                <p className="text-sm text-muted-foreground">
                  Offer nail trimming service
                </p>
              </div>
              <div className="flex items-center gap-4">
                {settings.enableNailTrimming && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={settings.nailTrimmingPrice}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          nailTrimmingPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                )}
                <Switch
                  checked={settings.enableNailTrimming}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableNailTrimming: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Teeth Brushing</Label>
                <p className="text-sm text-muted-foreground">
                  Offer teeth brushing service
                </p>
              </div>
              <div className="flex items-center gap-4">
                {settings.enableTeethBrushing && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={settings.teethBrushingPrice}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          teethBrushingPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                )}
                <Switch
                  checked={settings.enableTeethBrushing}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableTeethBrushing: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ear Cleaning</Label>
                <p className="text-sm text-muted-foreground">
                  Offer ear cleaning service
                </p>
              </div>
              <div className="flex items-center gap-4">
                {settings.enableEarCleaning && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={settings.earCleaningPrice}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          earCleaningPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                )}
                <Switch
                  checked={settings.enableEarCleaning}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableEarCleaning: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>De-shedding Treatment</Label>
                <p className="text-sm text-muted-foreground">
                  Offer de-shedding treatment
                </p>
              </div>
              <div className="flex items-center gap-4">
                {settings.enableDeShedding && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={settings.deSheddingPrice}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          deSheddingPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                )}
                <Switch
                  checked={settings.enableDeShedding}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableDeShedding: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Flea Treatment</Label>
                <p className="text-sm text-muted-foreground">
                  Offer flea treatment service
                </p>
              </div>
              <div className="flex items-center gap-4">
                {settings.enableFleaTreatment && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={settings.fleaTreatmentPrice}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          fleaTreatmentPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                )}
                <Switch
                  checked={settings.enableFleaTreatment}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableFleaTreatment: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stylist Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Stylist Settings</CardTitle>
            <CardDescription>
              Configure stylist assignment options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Stylist Selection</Label>
                <p className="text-sm text-muted-foreground">
                  Let customers choose their preferred stylist
                </p>
              </div>
              <Switch
                checked={settings.allowStylistSelection}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowStylistSelection: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Assign Stylist</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign available stylist if none selected
                </p>
              </div>
              <Switch
                checked={settings.autoAssignStylist}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoAssignStylist: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Stylist Availability</Label>
                <p className="text-sm text-muted-foreground">
                  Display stylist availability to customers
                </p>
              </div>
              <Switch
                checked={settings.showStylistAvailability}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showStylistAvailability: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Max Dogs Per Stylist Per Day</Label>
              <Input
                type="number"
                value={settings.maxDogsPerStylistPerDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxDogsPerStylistPerDay: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of appointments a stylist can handle per day. Set to 0 for no limit (uses stylist capacity).
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Parallel Grooming</Label>
                <p className="text-sm text-muted-foreground">
                  Allow stylists to groom multiple dogs simultaneously (requires multiple grooming stations)
                </p>
              </div>
              <Switch
                checked={settings.allowParallelGrooming}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowParallelGrooming: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operational Flow Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Operational Flow Controls</CardTitle>
            <CardDescription>
              Configure workflow and operational requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Check-In Before Groom Starts</Label>
                <p className="text-sm text-muted-foreground">
                  Appointment must be checked in before status can change to "in-progress"
                </p>
              </div>
              <Switch
                checked={settings.requireCheckInBeforeGroom}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireCheckInBeforeGroom: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Deposit Per Package</Label>
                <p className="text-sm text-muted-foreground">
                  Allow deposit requirement to be configured per package (overrides global deposit setting)
                </p>
              </div>
              <Switch
                checked={settings.requireDepositPerPackage}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireDepositPerPackage: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.requireDepositPerPackage && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  When enabled, you can set deposit requirements individually for each package in the Packages page. 
                  Package-specific deposits will override the global deposit setting.
                </p>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto "Ready for Pickup" SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send SMS notification when appointment status changes to "ready-for-pickup"
                </p>
              </div>
              <Switch
                checked={settings.autoReadyForPickupSMS}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoReadyForPickupSMS: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.autoReadyForPickupSMS && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Customers will automatically receive an SMS when their pet's grooming is complete and ready for pickup.
                </p>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto "Ready for Pickup" Email</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send Email notification when appointment status changes to "ready-for-pickup"
                </p>
              </div>
              <Switch
                checked={settings.autoReadyForPickupEmail}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoReadyForPickupEmail: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.autoReadyForPickupEmail && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Customers will automatically receive an Email when their pet's grooming is complete and ready for pickup.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pet Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Pet Requirements</CardTitle>
            <CardDescription>
              Set requirements for pets using grooming services
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
            <div className="space-y-2">
              <Label>Maximum Pet Weight (lbs)</Label>
              <Input
                type="number"
                value={settings.maxPetWeight}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxPetWeight: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Set to 0 for no limit
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Accept Aggressive Pets</Label>
                <p className="text-sm text-muted-foreground">
                  Allow pets with known aggressive behavior
                </p>
              </div>
              <Switch
                checked={settings.acceptAggressivePets}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, acceptAggressivePets: checked })
                }
                disabled={!isEditing}
              />
            </div>
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
                <Label>Send Booking Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Email confirmation when an appointment is booked
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
                <Label>Send Appointment Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Remind customers before their appointment
                </p>
              </div>
              <Switch
                checked={settings.sendAppointmentReminder}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendAppointmentReminder: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.sendAppointmentReminder && (
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
                <Label>Send Completion Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Email notification when grooming is complete and ready for pickup
                </p>
              </div>
              <Switch
                checked={settings.sendCompletionNotification}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    sendCompletionNotification: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Note: SMS notifications for "Ready for Pickup" are controlled separately in Operational Flow Controls.
            </p>
            {settings.sendCompletionNotification && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Before/After Photos</Label>
                  <p className="text-sm text-muted-foreground">
                    Attach photos showing the transformation
                  </p>
                </div>
                <Switch
                  checked={settings.includeBeforeAfterPhotos}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      includeBeforeAfterPhotos: checked,
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
              Define grooming policies displayed to customers
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
              <Label>Grooming Notes</Label>
              <Textarea
                value={settings.groomingNotes}
                onChange={(e) =>
                  setSettings({ ...settings, groomingNotes: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Late Arrival Policy</Label>
              <Textarea
                value={settings.lateArrivalPolicy}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lateArrivalPolicy: e.target.value,
                  })
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
