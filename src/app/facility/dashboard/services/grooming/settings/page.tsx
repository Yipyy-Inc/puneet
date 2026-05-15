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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, RotateCcw, Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MobileGroomingSettings } from "@/components/facility/grooming/mobile-grooming-settings";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationChannels = { inApp: boolean; email: boolean; sms: boolean };
type NotificationEvent =
  | "newBooking"
  | "cancelled"
  | "noShow"
  | "checkedIn"
  | "readyForPickup";

type Settings = {
  // 1 · General
  moduleName: string;
  iconColor: string;
  enabled: boolean;
  showOnlineBooking: boolean;

  // 2 · Booking rules
  minAdvanceHours: number;
  maxAdvanceDays: number;
  allowSameDay: boolean;
  onlineRequiresApproval: boolean;

  // 3 · Capacity
  maxAppointmentsPerDay: number;
  maxAppointmentsPerGroomerPerDay: number;
  capacityTiedToStations: boolean;

  // 4 · Check-in & check-out
  checkInWindowMinutes: number;
  sendReadyNotification: boolean;
  readyNotificationTemplateId: string;

  // 5 · Report cards
  autoCreateReportCardDraft: boolean;
  reportCardSendMode: "immediate" | "scheduled" | "manual";
  reportCardSendTime: string;
  reportCardTemplateId: string;

  // 6 · Cancellation policy
  cancellationFeeKind: "flat" | "percentage";
  cancellationFeeAmount: number;
  cancellationPolicyHours: number;
  cancellationAutoApply: boolean;

  // 7 · No-show policy
  noShowFee: number;
  noShowRiskThreshold: number;

  // 9 · Notifications
  notifications: Record<NotificationEvent, NotificationChannels>;
};

const DEFAULTS: Settings = {
  moduleName: "Grooming",
  iconColor: "#ec4899",
  enabled: true,
  showOnlineBooking: true,
  minAdvanceHours: 4,
  maxAdvanceDays: 60,
  allowSameDay: true,
  onlineRequiresApproval: false,
  maxAppointmentsPerDay: 24,
  maxAppointmentsPerGroomerPerDay: 8,
  capacityTiedToStations: false,
  checkInWindowMinutes: 15,
  sendReadyNotification: true,
  readyNotificationTemplateId: "pickup-default",
  autoCreateReportCardDraft: true,
  reportCardSendMode: "immediate",
  reportCardSendTime: "18:00",
  reportCardTemplateId: "report-default",
  cancellationFeeKind: "flat",
  cancellationFeeAmount: 25,
  cancellationPolicyHours: 24,
  cancellationAutoApply: false,
  noShowFee: 35,
  noShowRiskThreshold: 2,
  notifications: {
    newBooking: { inApp: true, email: true, sms: false },
    cancelled: { inApp: true, email: true, sms: false },
    noShow: { inApp: true, email: false, sms: false },
    checkedIn: { inApp: true, email: false, sms: false },
    readyForPickup: { inApp: true, email: false, sms: false },
  },
};

const EVENT_LABELS: Record<NotificationEvent, string> = {
  newBooking: "New booking confirmed",
  cancelled: "Appointment cancelled",
  noShow: "No-show marked",
  checkedIn: "Pet checked in",
  readyForPickup: "Pet ready for pickup",
};

const TEMPLATE_OPTIONS = [
  { id: "pickup-default", label: "Default pickup template" },
  { id: "pickup-friendly", label: "Friendly tone" },
  { id: "pickup-bilingual", label: "FR + EN bilingual" },
];

const REPORT_TEMPLATE_OPTIONS = [
  { id: "report-default", label: "Default report card" },
  { id: "report-photo-heavy", label: "Photo-heavy" },
  { id: "report-minimal", label: "Minimal" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroomingSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [isEditing, setIsEditing] = useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function setChannel(
    event: NotificationEvent,
    channel: keyof NotificationChannels,
    value: boolean,
  ) {
    setSettings((s) => ({
      ...s,
      notifications: {
        ...s.notifications,
        [event]: { ...s.notifications[event], [channel]: value },
      },
    }));
  }

  function handleSave() {
    setIsEditing(false);
    toast.success("Grooming settings saved");
  }

  function handleReset() {
    setSettings(DEFAULTS);
    setIsEditing(false);
    toast.info("Reverted to defaults");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Grooming Settings
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure how the grooming module runs — policies, capacity,
            notifications.
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 size-4" />
                Reset to Defaults
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 size-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
          )}
        </div>
      </div>

      {/* 1 · General */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Identity + on/off for the grooming module.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Module name</Label>
              <Input
                value={settings.moduleName}
                onChange={(e) => update("moduleName", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.iconColor}
                  onChange={(e) => update("iconColor", e.target.value)}
                  disabled={!isEditing}
                  className="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed"
                />
                <span className="text-muted-foreground font-mono text-xs uppercase">
                  {settings.iconColor}
                </span>
              </div>
            </div>
          </div>
          <Separator />
          <ToggleRow
            label="Module enabled"
            hint="Hides the grooming module entirely when off."
            checked={settings.enabled}
            onCheckedChange={(v) => update("enabled", v)}
            disabled={!isEditing}
          />
          <Separator />
          <ToggleRow
            label="Show on online booking page"
            hint="Lets clients book grooming services themselves from the storefront."
            checked={settings.showOnlineBooking}
            onCheckedChange={(v) => update("showOnlineBooking", v)}
            disabled={!isEditing}
          />
        </CardContent>
      </Card>

      {/* 2 · Booking Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Rules</CardTitle>
          <CardDescription>
            How far in advance and how late clients can book.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Minimum advance notice (hours)</Label>
              <Input
                type="number"
                min={0}
                value={settings.minAdvanceHours}
                onChange={(e) =>
                  update("minAdvanceHours", Number(e.target.value) || 0)
                }
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Maximum advance booking (days)</Label>
              <Input
                type="number"
                min={1}
                value={settings.maxAdvanceDays}
                onChange={(e) =>
                  update("maxAdvanceDays", Number(e.target.value) || 1)
                }
                disabled={!isEditing}
              />
            </div>
          </div>
          <Separator />
          <ToggleRow
            label="Allow same-day bookings"
            hint="Clients can book for the same calendar day."
            checked={settings.allowSameDay}
            onCheckedChange={(v) => update("allowSameDay", v)}
            disabled={!isEditing}
          />
          <Separator />
          <ToggleRow
            label="Online bookings require approval"
            hint="New requests land as Pending until a manager confirms."
            checked={settings.onlineRequiresApproval}
            onCheckedChange={(v) => update("onlineRequiresApproval", v)}
            disabled={!isEditing}
          />
        </CardContent>
      </Card>

      {/* 3 · Capacity */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity</CardTitle>
          <CardDescription>Ceilings the booking flow enforces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Maximum appointments per day (facility-wide)</Label>
              <Input
                type="number"
                min={0}
                value={settings.maxAppointmentsPerDay}
                onChange={(e) =>
                  update("maxAppointmentsPerDay", Number(e.target.value) || 0)
                }
                disabled={!isEditing}
              />
              <p className="text-muted-foreground text-[11px]">
                Set to 0 for no overall cap.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Maximum appointments per groomer per day</Label>
              <Input
                type="number"
                min={0}
                value={settings.maxAppointmentsPerGroomerPerDay}
                onChange={(e) =>
                  update(
                    "maxAppointmentsPerGroomerPerDay",
                    Number(e.target.value) || 0,
                  )
                }
                disabled={!isEditing}
              />
              <p className="text-muted-foreground text-[11px]">
                Overrides the per-groomer capacity from the Groomers tab when
                set.
              </p>
            </div>
          </div>
          <Separator />
          <ToggleRow
            label="Use station count to limit capacity"
            hint="When on, the number of active stations also constrains how many parallel appointments can be booked."
            checked={settings.capacityTiedToStations}
            onCheckedChange={(v) => update("capacityTiedToStations", v)}
            disabled={!isEditing}
          />
        </CardContent>
      </Card>

      {/* 4 · Check-in & Check-out */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in &amp; Check-out</CardTitle>
          <CardDescription>
            How early clients can arrive and how pickup notifications fire.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Default check-in window (minutes before start)</Label>
            <Input
              type="number"
              min={0}
              value={settings.checkInWindowMinutes}
              onChange={(e) =>
                update("checkInWindowMinutes", Number(e.target.value) || 0)
              }
              disabled={!isEditing}
              className="w-40"
            />
            <p className="text-muted-foreground text-[11px]">
              How early clients can drop off before their appointment.
            </p>
          </div>
          <Separator />
          <ToggleRow
            label="Send &quot;Ready for pickup&quot; notification"
            hint="Auto-fires when an appointment moves to Ready for Pickup."
            checked={settings.sendReadyNotification}
            onCheckedChange={(v) => update("sendReadyNotification", v)}
            disabled={!isEditing}
          />
          {settings.sendReadyNotification && (
            <div className="space-y-1.5">
              <Label>Pickup notification template</Label>
              <Select
                value={settings.readyNotificationTemplateId}
                onValueChange={(v) => update("readyNotificationTemplateId", v)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5 · Report Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Report Cards</CardTitle>
          <CardDescription>
            Whether to auto-draft a card per completed appointment + when to
            send it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Auto-create draft report card on completion"
            hint="A draft is created automatically — staff still review and send."
            checked={settings.autoCreateReportCardDraft}
            onCheckedChange={(v) => update("autoCreateReportCardDraft", v)}
            disabled={!isEditing}
          />
          <Separator />
          <div className="space-y-1.5">
            <Label>When to send</Label>
            <Select
              value={settings.reportCardSendMode}
              onValueChange={(v) =>
                update(
                  "reportCardSendMode",
                  v as Settings["reportCardSendMode"],
                )
              }
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">
                  Immediately after completion
                </SelectItem>
                <SelectItem value="scheduled">
                  At a scheduled time
                </SelectItem>
                <SelectItem value="manual">Manual send only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {settings.reportCardSendMode === "scheduled" && (
            <div className="space-y-1.5">
              <Label>Daily send time</Label>
              <Input
                type="time"
                value={settings.reportCardSendTime}
                onChange={(e) => update("reportCardSendTime", e.target.value)}
                disabled={!isEditing}
                className="w-32"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Default template</Label>
            <Select
              value={settings.reportCardTemplateId}
              onValueChange={(v) => update("reportCardTemplateId", v)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TEMPLATE_OPTIONS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 6 · Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Policy</CardTitle>
          <CardDescription>
            Fee, threshold, and whether the system applies it automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fee kind</Label>
              <Select
                value={settings.cancellationFeeKind}
                onValueChange={(v) =>
                  update(
                    "cancellationFeeKind",
                    v as Settings["cancellationFeeKind"],
                  )
                }
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat fee ($)</SelectItem>
                  <SelectItem value="percentage">% of service total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Fee amount{" "}
                {settings.cancellationFeeKind === "percentage" ? "(%)" : "($)"}
              </Label>
              <Input
                type="number"
                min={0}
                value={settings.cancellationFeeAmount}
                onChange={(e) =>
                  update(
                    "cancellationFeeAmount",
                    Number(e.target.value) || 0,
                  )
                }
                disabled={!isEditing}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Applies when cancelled within (hours of appointment)</Label>
            <Input
              type="number"
              min={0}
              value={settings.cancellationPolicyHours}
              onChange={(e) =>
                update("cancellationPolicyHours", Number(e.target.value) || 0)
              }
              disabled={!isEditing}
              className="w-40"
            />
            <p className="text-muted-foreground text-[11px]">
              Cancellations made earlier than this don&apos;t incur the fee.
            </p>
          </div>
          <Separator />
          <ToggleRow
            label="Auto-apply the fee"
            hint="When off, the cancellation dialog asks the manager whether to apply the fee each time."
            checked={settings.cancellationAutoApply}
            onCheckedChange={(v) => update("cancellationAutoApply", v)}
            disabled={!isEditing}
          />
        </CardContent>
      </Card>

      {/* 7 · No-show Policy */}
      <Card>
        <CardHeader>
          <CardTitle>No-show Policy</CardTitle>
          <CardDescription>
            Fee and how many no-shows trigger the No-Show Risk flag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>No-show fee ($)</Label>
              <Input
                type="number"
                min={0}
                value={settings.noShowFee}
                onChange={(e) =>
                  update("noShowFee", Number(e.target.value) || 0)
                }
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-1.5">
              <Label>No-shows before risk flag</Label>
              <Input
                type="number"
                min={1}
                value={settings.noShowRiskThreshold}
                onChange={(e) =>
                  update("noShowRiskThreshold", Number(e.target.value) || 1)
                }
                disabled={!isEditing}
              />
              <p className="text-muted-foreground text-[11px]">
                The client gets a <strong>No-Show Risk</strong> tag once they
                hit this count.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8 · Mobile Grooming */}
      <Card>
        <CardHeader>
          <CardTitle>Mobile Grooming</CardTitle>
          <CardDescription>
            Master toggle for mobile operations — controls the Route Planner tab
            and service-area restrictions. Vans, areas, and the arrival window
            are configured inside the section below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MobileGroomingSettings />
        </CardContent>
      </Card>

      {/* 9 · Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Notifications</CardTitle>
          <CardDescription>
            Pick which events page staff and on which channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 text-[11px] font-medium uppercase tracking-wide">
                    Event
                  </th>
                  <th className="py-2 px-2 text-[11px] font-medium uppercase tracking-wide">
                    <Bell className="mx-auto size-3.5" />
                    <span className="sr-only">In-app</span>
                  </th>
                  <th className="py-2 px-2 text-[11px] font-medium uppercase tracking-wide">
                    <Mail className="mx-auto size-3.5" />
                    <span className="sr-only">Email</span>
                  </th>
                  <th className="py-2 px-2 text-[11px] font-medium uppercase tracking-wide">
                    <MessageSquare className="mx-auto size-3.5" />
                    <span className="sr-only">SMS</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(EVENT_LABELS) as NotificationEvent[]).map(
                  (event, idx) => {
                    const chans = settings.notifications[event];
                    return (
                      <tr
                        key={event}
                        className={cn(
                          "border-b last:border-0",
                          idx % 2 === 1 && "bg-muted/30",
                        )}
                      >
                        <td className="py-2 pr-4 font-medium">
                          {EVENT_LABELS[event]}
                        </td>
                        {(
                          ["inApp", "email", "sms"] as const
                        ).map((ch) => (
                          <td key={ch} className="px-2 py-2 text-center">
                            <Switch
                              checked={chans[ch]}
                              onCheckedChange={(v) => setChannel(event, ch, v)}
                              disabled={!isEditing}
                              className="mx-auto"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-3 text-[11px]">
            Per-staff channel preferences (which phone, which email) live on
            each staff profile.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
