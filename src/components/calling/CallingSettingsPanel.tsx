"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Smartphone,
  Monitor,
  Users,
  Radio,
  Bell,
  Mic,
  Shield,
  MessageSquare,
  Clock,
  Save,
  MapPin,
  Shuffle,
} from "lucide-react";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import type { CallingSettings, DispatchMode } from "@/types/calling";

const dispatchOptions: {
  value: DispatchMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "ring_all", label: "Ring All Devices", description: "All connected devices ring simultaneously", icon: Radio },
  { value: "desktop_first", label: "Desktop First", description: "Ring desktop for 5s, then mobile", icon: Monitor },
  { value: "mobile_first", label: "Mobile First", description: "Mobile rings first, desktop as fallback", icon: Smartphone },
  { value: "reception_only", label: "Reception Only", description: "Only the reception station receives calls", icon: Phone },
  { value: "specific_group", label: "Specific Staff Group", description: "Route to a defined group of staff", icon: Users },
  { value: "location_based", label: "Location-Based", description: "Route by caller's area code or location", icon: MapPin },
  { value: "round_robin", label: "Round-Robin", description: "Distribute evenly across available staff", icon: Shuffle },
];

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
const DAY_LABELS: Record<typeof DAYS[number], string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

interface CallingSettingsPanelProps {
  settings: CallingSettings;
}

export function CallingSettingsPanel({ settings: initial }: CallingSettingsPanelProps) {
  const [settings, setSettings] = useState<CallingSettings>(initial);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof CallingSettings>(key: K, value: CallingSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const updateHours = (
    day: typeof DAYS[number],
    field: "open" | "close" | "enabled",
    value: string | boolean,
  ) =>
    setSettings((s) => ({
      ...s,
      businessHours: {
        ...s.businessHours,
        [day]: { ...s.businessHours[day], [field]: value },
      },
    }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Business Number */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="size-4 text-blue-600" />
            Business Phone Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              className="max-w-xs font-mono text-base"
              value={settings.businessNumber}
              onChange={(e) => update("businessNumber", e.target.value)}
            />
            <Badge variant="outline" className="gap-1.5">
              <div className="size-2 rounded-full bg-green-500" />
              Active via Twilio
            </Badge>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Outbound calls will display this number to recipients.
          </p>
        </CardContent>
      </Card>

      {/* Dispatch Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="size-4 text-purple-600" />
            Call Dispatch Mode
          </CardTitle>
          <p className="text-sm text-muted-foreground">How incoming calls are distributed to staff</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {dispatchOptions.map((opt) => {
              const Icon = opt.icon;
              const active = settings.dispatchMode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => update("dispatchMode", opt.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "hover:border-muted-foreground/30 hover:bg-muted/40",
                  )}
                >
                  <div className={cn("mt-0.5 rounded-lg p-1.5", active ? "bg-primary/15" : "bg-muted")}>
                    <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", active && "text-primary")}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  {active && (
                    <div className="ml-auto mt-0.5 size-4 rounded-full border-2 border-primary bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Simultaneous Call Handling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-teal-600" />
            Multiple Simultaneous Calls
          </CardTitle>
          <p className="text-sm text-muted-foreground">What happens when a second call arrives</p>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.simultaneousCallHandling}
            onValueChange={(v) =>
              update("simultaneousCallHandling", v as CallingSettings["simultaneousCallHandling"])
            }
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allow_waiting">Allow call waiting (staff sees second call)</SelectItem>
              <SelectItem value="next_available">Send to next available staff member</SelectItem>
              <SelectItem value="direct_voicemail">Send directly to voicemail</SelectItem>
              <SelectItem value="queue_system">Queue system — caller hears their position</SelectItem>
            </SelectContent>
          </Select>
          {settings.simultaneousCallHandling === "queue_system" && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <Radio className="size-3.5 shrink-0" />
              Callers will hear: <em>"You are caller #2. Estimated wait: 2 minutes."</em>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ring & Alert Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-amber-500" />
            Ring &amp; Alert Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm">Ringtone</Label>
              <Select
                value={settings.ringTone}
                onValueChange={(v) => update("ringTone", v as CallingSettings["ringTone"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic Ring</SelectItem>
                  <SelectItem value="soft_chime">Soft Chime</SelectItem>
                  <SelectItem value="loud_alert">Loud Alert</SelectItem>
                  <SelectItem value="repeating">Repeating Notification</SelectItem>
                  <SelectItem value="silent">Silent (visual only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Visual Flash Header</Label>
                <p className="text-xs text-muted-foreground">Flashes the top bar for busy environments</p>
              </div>
              <Switch
                checked={settings.visualFlash}
                onCheckedChange={(v) => update("visualFlash", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Desktop + Mobile Sync</Label>
                <p className="text-xs text-muted-foreground">Answer on one device — stops ringing everywhere</p>
              </div>
              <Switch
                checked={settings.mobileSync}
                onCheckedChange={(v) => update("mobileSync", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recording */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="size-4 text-red-500" />
            Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Record All Calls</Label>
                <p className="text-xs text-muted-foreground">AES-256 encrypted recordings</p>
              </div>
              <Switch
                checked={settings.autoRecord}
                onCheckedChange={(v) => update("autoRecord", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Transcription</Label>
                <p className="text-xs text-muted-foreground">Transcribe every call to searchable text</p>
              </div>
              <Switch
                checked={settings.autoTranscription}
                onCheckedChange={(v) => update("autoTranscription", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Compliance Notice</Label>
                <p className="text-xs text-muted-foreground">Play "This call may be recorded" greeting</p>
              </div>
              <Switch
                checked={settings.complianceNotice}
                onCheckedChange={(v) => update("complianceNotice", v)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Recording Retention</p>
              <p className="text-xs text-muted-foreground">Determined by your subscription plan</p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {settings.recordingStorage === "30_days"
                ? "30 days — Basic"
                : settings.recordingStorage === "90_days"
                  ? "90 days — Pro"
                  : "Unlimited — Enterprise"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Missed Call Workflow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-blue-600" />
            Missed Call Auto-Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Send Auto-SMS on Missed Call</Label>
              <p className="text-xs text-muted-foreground">Instantly notify the caller you&apos;ll be in touch</p>
            </div>
            <Switch
              checked={settings.missedCallAutoSMS}
              onCheckedChange={(v) => update("missedCallAutoSMS", v)}
            />
          </div>
          {settings.missedCallAutoSMS && (
            <div>
              <Label className="mb-2 block text-sm">SMS Template</Label>
              <Textarea
                rows={3}
                className="text-sm"
                value={settings.missedCallSMSTemplate}
                onChange={(e) => update("missedCallSMSTemplate", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use <code className="rounded bg-muted px-1">{"{{name}}"}</code> for client name.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-green-600" />
            Business Hours
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Calls outside these hours route to after-hours voicemail
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DAYS.map((day) => {
              const h = settings.businessHours[day];
              return (
                <div key={day} className="flex items-center gap-3">
                  <Switch
                    checked={h.enabled}
                    onCheckedChange={(v) => updateHours(day, "enabled", v)}
                  />
                  <span className={cn("w-9 text-sm font-semibold", !h.enabled && "text-muted-foreground")}>
                    {DAY_LABELS[day]}
                  </span>
                  {h.enabled ? (
                    <div className="flex items-center gap-2">
                      <TimePickerLux
                        value={h.open}
                        onValueChange={(v) => updateHours(day, "open", v)}
                        displayMode="popover"
                        stepMinutes={15}
                      />
                      <span className="text-muted-foreground">—</span>
                      <TimePickerLux
                        value={h.close}
                        onValueChange={(v) => updateHours(day, "close", v)}
                        displayMode="popover"
                        stepMinutes={15}
                        min={h.open}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Staff Permissions Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-slate-600" />
            Staff Permissions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Role-based access is managed in Settings → Team → Roles
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              "Receive calls",
              "Make outbound calls",
              "Access recordings",
              "Download recordings",
              "Delete recordings",
              "Change IVR settings",
            ].map((perm) => (
              <div
                key={perm}
                className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs font-medium"
              >
                <Shield className="size-3 text-muted-foreground" />
                {perm}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3">
            Manage Role Permissions →
          </Button>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" onClick={handleSave}>
        <Save className="size-4" />
        {saved ? "Settings Saved!" : "Save Settings"}
      </Button>
    </div>
  );
}
