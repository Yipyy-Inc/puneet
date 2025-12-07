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

export default function VetSettingsPage() {
  const [settings, setSettings] = useState({
    // General Settings
    enabled: true,
    allowOnlineBooking: true,
    requireReferral: false,
    acceptNewPatients: true,

    // Appointment Settings
    defaultAppointmentDuration: 30,
    minAdvanceBookingHours: 2,
    maxAdvanceBookingDays: 90,
    bufferBetweenAppointments: 10,
    allowSameDayAppointments: true,
    allowWalkIns: false,

    // Operating Hours
    openTime: "08:00",
    closeTime: "18:00",
    emergencyHoursEnabled: true,
    emergencyOpenTime: "18:00",
    emergencyCloseTime: "08:00",

    // Pricing
    consultationFee: 60,
    emergencyFee: 150,
    followUpFee: 40,
    enablePaymentPlans: true,
    requireDepositForSurgery: true,
    surgeryDepositPercentage: 50,

    // Medical Records
    requireMedicalHistory: true,
    retainRecordsYears: 7,
    enablePatientPortal: true,
    allowRecordDownload: true,

    // Prescriptions
    enablePrescriptions: true,
    enableRefillRequests: true,
    refillRequestAdvanceDays: 7,
    enablePharmacyIntegration: false,

    // Lab & Diagnostics
    enableInHouseLab: true,
    enableExternalLabIntegration: false,
    labResultsNotification: true,
    autoSendLabResults: false,

    // Vaccination
    enableVaccinationReminders: true,
    vaccinationReminderDaysBefore: 14,
    trackVaccinationHistory: true,

    // Pet Requirements
    requirePetRegistration: true,
    requireEmergencyContact: true,
    requireInsuranceInfo: false,

    // Notifications
    sendAppointmentConfirmation: true,
    sendAppointmentReminder: true,
    reminderHoursBefore: 24,
    sendFollowUpReminder: true,
    followUpReminderDays: 7,

    // Telemedicine
    enableTelemedicine: false,
    telemedicineConsultationFee: 45,
    telemedicineMaxDuration: 30,

    // Policies
    cancellationPolicy:
      "Appointments must be cancelled at least 24 hours in advance. Late cancellations or no-shows may be charged a fee equal to the consultation cost.",
    emergencyPolicy:
      "For life-threatening emergencies, please call ahead so we can prepare for your arrival. After-hours emergencies may incur additional fees.",
    paymentPolicy:
      "Payment is due at the time of service. We accept all major credit cards, cash, and offer payment plans for major procedures.",
    medicalRecordsPolicy:
      "Medical records can be requested through the patient portal or by contacting our office. Records transfer may take 3-5 business days.",
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
            Veterinary Settings
          </h2>
          <p className="text-muted-foreground">
            Configure veterinary service preferences and policies
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
              Basic veterinary service configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Veterinary Service</Label>
                <p className="text-sm text-muted-foreground">
                  Allow veterinary appointments and services
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
                  Clients can book appointments online
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
                <Label>Accept New Patients</Label>
                <p className="text-sm text-muted-foreground">
                  Accept new pet registrations
                </p>
              </div>
              <Switch
                checked={settings.acceptNewPatients}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, acceptNewPatients: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Referral</Label>
                <p className="text-sm text-muted-foreground">
                  New patients require a referral
                </p>
              </div>
              <Switch
                checked={settings.requireReferral}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireReferral: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appointment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Settings</CardTitle>
            <CardDescription>Configure appointment scheduling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  value={settings.bufferBetweenAppointments}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bufferBetweenAppointments: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
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
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Same-Day Appointments</Label>
                <p className="text-sm text-muted-foreground">
                  Accept appointments for the current day
                </p>
              </div>
              <Switch
                checked={settings.allowSameDayAppointments}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    allowSameDayAppointments: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Walk-Ins</Label>
                <p className="text-sm text-muted-foreground">
                  Accept patients without appointments
                </p>
              </div>
              <Switch
                checked={settings.allowWalkIns}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowWalkIns: checked })
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
            <CardDescription>Set clinic and emergency hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Emergency Hours</Label>
                <p className="text-sm text-muted-foreground">
                  Offer after-hours emergency services
                </p>
              </div>
              <Switch
                checked={settings.emergencyHoursEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, emergencyHoursEnabled: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.emergencyHoursEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emergency Hours Start</Label>
                  <Input
                    type="time"
                    value={settings.emergencyOpenTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emergencyOpenTime: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Hours End</Label>
                  <Input
                    type="time"
                    value={settings.emergencyCloseTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emergencyCloseTime: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Configure service fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Consultation Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.consultationFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      consultationFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.emergencyFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emergencyFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Follow-Up Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.followUpFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      followUpFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Payment Plans</Label>
                <p className="text-sm text-muted-foreground">
                  Offer payment plans for major procedures
                </p>
              </div>
              <Switch
                checked={settings.enablePaymentPlans}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enablePaymentPlans: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Surgery Deposit</Label>
                <p className="text-sm text-muted-foreground">
                  Collect deposit before surgical procedures
                </p>
              </div>
              <Switch
                checked={settings.requireDepositForSurgery}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    requireDepositForSurgery: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.requireDepositForSurgery && (
              <div className="space-y-2">
                <Label>Surgery Deposit (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.surgeryDepositPercentage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        surgeryDepositPercentage: parseInt(e.target.value) || 0,
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

        {/* Medical Records */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Records</CardTitle>
            <CardDescription>
              Configure medical records handling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Medical History</Label>
                <p className="text-sm text-muted-foreground">
                  New patients must provide medical history
                </p>
              </div>
              <Switch
                checked={settings.requireMedicalHistory}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireMedicalHistory: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Record Retention Period (years)</Label>
              <Input
                type="number"
                value={settings.retainRecordsYears}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    retainRecordsYears: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Patient Portal</Label>
                <p className="text-sm text-muted-foreground">
                  Allow clients to access records online
                </p>
              </div>
              <Switch
                checked={settings.enablePatientPortal}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enablePatientPortal: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Record Download</Label>
                <p className="text-sm text-muted-foreground">
                  Clients can download medical records
                </p>
              </div>
              <Switch
                checked={settings.allowRecordDownload}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowRecordDownload: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Prescriptions</CardTitle>
            <CardDescription>Configure prescription settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Prescriptions</Label>
                <p className="text-sm text-muted-foreground">
                  Manage and issue prescriptions
                </p>
              </div>
              <Switch
                checked={settings.enablePrescriptions}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enablePrescriptions: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enablePrescriptions && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Refill Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow online prescription refill requests
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableRefillRequests}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        enableRefillRequests: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                {settings.enableRefillRequests && (
                  <div className="space-y-2">
                    <Label>Refill Request Advance (days)</Label>
                    <Input
                      type="number"
                      value={settings.refillRequestAdvanceDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          refillRequestAdvanceDays:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                      className="w-32"
                    />
                    <p className="text-sm text-muted-foreground">
                      Days before prescription runs out that refill can be
                      requested
                    </p>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Pharmacy Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Send prescriptions directly to pharmacy
                    </p>
                  </div>
                  <Switch
                    checked={settings.enablePharmacyIntegration}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        enablePharmacyIntegration: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lab & Diagnostics */}
        <Card>
          <CardHeader>
            <CardTitle>Lab & Diagnostics</CardTitle>
            <CardDescription>Configure laboratory settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable In-House Lab</Label>
                <p className="text-sm text-muted-foreground">
                  Perform lab tests on-site
                </p>
              </div>
              <Switch
                checked={settings.enableInHouseLab}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableInHouseLab: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>External Lab Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Connect with external laboratory services
                </p>
              </div>
              <Switch
                checked={settings.enableExternalLabIntegration}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    enableExternalLabIntegration: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lab Results Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify clients when lab results are ready
                </p>
              </div>
              <Switch
                checked={settings.labResultsNotification}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, labResultsNotification: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Send Lab Results</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send results to client portal
                </p>
              </div>
              <Switch
                checked={settings.autoSendLabResults}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoSendLabResults: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vaccination */}
        <Card>
          <CardHeader>
            <CardTitle>Vaccination</CardTitle>
            <CardDescription>Configure vaccination tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Track Vaccination History</Label>
                <p className="text-sm text-muted-foreground">
                  Maintain vaccination records for all patients
                </p>
              </div>
              <Switch
                checked={settings.trackVaccinationHistory}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, trackVaccinationHistory: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Vaccination Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Send reminders for upcoming vaccinations
                </p>
              </div>
              <Switch
                checked={settings.enableVaccinationReminders}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    enableVaccinationReminders: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableVaccinationReminders && (
              <div className="space-y-2">
                <Label>Reminder Days Before Due</Label>
                <Input
                  type="number"
                  value={settings.vaccinationReminderDaysBefore}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      vaccinationReminderDaysBefore:
                        parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telemedicine */}
        <Card>
          <CardHeader>
            <CardTitle>Telemedicine</CardTitle>
            <CardDescription>
              Configure virtual consultation settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Telemedicine</Label>
                <p className="text-sm text-muted-foreground">
                  Offer virtual veterinary consultations
                </p>
              </div>
              <Switch
                checked={settings.enableTelemedicine}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableTelemedicine: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableTelemedicine && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telemedicine Fee ($)</Label>
                    <Input
                      type="number"
                      value={settings.telemedicineConsultationFee}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          telemedicineConsultationFee:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.telemedicineMaxDuration}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          telemedicineMaxDuration:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure client notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Appointment Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Send confirmation when appointment is booked
                </p>
              </div>
              <Switch
                checked={settings.sendAppointmentConfirmation}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    sendAppointmentConfirmation: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Appointment Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Send reminder before scheduled appointment
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
                <Label>Follow-Up Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Remind clients to schedule follow-up visits
                </p>
              </div>
              <Switch
                checked={settings.sendFollowUpReminder}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendFollowUpReminder: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.sendFollowUpReminder && (
              <div className="space-y-2">
                <Label>Follow-Up Reminder (days after visit)</Label>
                <Input
                  type="number"
                  value={settings.followUpReminderDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      followUpReminderDays: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
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
              Define veterinary policies displayed to clients
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
              <Label>Emergency Policy</Label>
              <Textarea
                value={settings.emergencyPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, emergencyPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Policy</Label>
              <Textarea
                value={settings.paymentPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, paymentPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Medical Records Policy</Label>
              <Textarea
                value={settings.medicalRecordsPolicy}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    medicalRecordsPolicy: e.target.value,
                  })
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
