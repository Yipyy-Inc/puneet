"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Bell,
  CheckCircle2,
  ExternalLink,
  Mic,
  MessageSquare,
  Network,
  Phone,
  PhoneForwarded,
  Save,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTwilioConfig } from "@/hooks/use-twilio-config";
import {
  updateSupportSettings,
  useSupportCallingSettings,
} from "@/lib/support-calling-settings-store";
import { AvailabilityCard } from "./availability-card";
import { BusinessHoursCard } from "./business-hours-card";
import {
  DISPATCH_OPTIONS,
  FORWARDING_OPTIONS,
  RETENTION_LABELS,
  RINGTONE_OPTIONS,
} from "./settings-utils";
import { StaffPermissionsCard } from "./staff-permissions-card";

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label>{label}</Label>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function SettingsTab() {
  const s = useSupportCallingSettings();
  const twilio = useTwilioConfig();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Calling Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configure how the Yipyy support line routes, records, and handles
            calls.
          </p>
        </div>
        <Button
          className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => toast.success("Calling settings saved")}
        >
          <Save className="size-4" />
          Save Settings
        </Button>
      </div>

      {/* Business Phone Number + Port Your Number */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="size-4 text-emerald-600" />
              Business Phone Number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-lg font-semibold tabular-nums">
                {twilio.phoneNumbers[0] ?? "Not configured"}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  twilio.connected
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
                )}
              >
                <CheckCircle2 className="size-3" />
                {twilio.connected ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              The number facilities call to reach Yipyy support. Credentials are
              managed in{" "}
              <Link
                href="/dashboard/system-admin/integrations"
                className="inline-flex items-center gap-0.5 font-medium hover:underline"
              >
                Integrations
                <ExternalLink className="size-3" />
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowLeftRight className="size-4 text-sky-600" />
              Port Your Number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Already have a support line? Port your existing number to Yipyy
              and keep it. Porting typically completes in 7–10 business days
              with no downtime.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                toast.success(
                  "Porting request started — our team will email you the next steps.",
                )
              }
            >
              <ArrowLeftRight className="size-4" />
              Start Porting
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Call Dispatch Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="size-4 text-violet-600" />
            Call Dispatch Mode
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            How incoming calls are distributed to available agents.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {DISPATCH_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = s.dispatchMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    updateSupportSettings({ dispatchMode: opt.value })
                  }
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "hover:border-muted-foreground/30 hover:bg-muted/40",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 rounded-lg p-1.5",
                      active ? "bg-primary/15" : "bg-muted",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          active && "text-primary",
                        )}
                      >
                        {opt.label}
                      </p>
                      {opt.recommended && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-300"
                        >
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {opt.description}
                    </p>
                  </div>
                  {active && (
                    <span className="border-primary bg-primary mt-0.5 size-4 shrink-0 rounded-full border-2" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Call Availability */}
      <AvailabilityCard />

      {/* Ring & Alert + Call Forwarding */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-amber-500" />
              Ring &amp; Alert Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm">Ringtone</Label>
              <Select
                value={s.ringTone}
                onValueChange={(v) =>
                  updateSupportSettings({
                    ringTone: v as typeof s.ringTone,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RINGTONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <ToggleRow
                label="Visual Flash"
                hint="Flash the top bar for noisy environments"
                checked={s.visualFlash}
                onCheckedChange={(v) =>
                  updateSupportSettings({ visualFlash: v })
                }
              />
              <ToggleRow
                label="Desktop Sync"
                hint="Ring the desktop app for signed-in agents"
                checked={s.desktopSync}
                onCheckedChange={(v) =>
                  updateSupportSettings({ desktopSync: v })
                }
              />
              <ToggleRow
                label="Mobile Sync"
                hint="Answer on one device — stops ringing everywhere"
                checked={s.mobileSync}
                onCheckedChange={(v) =>
                  updateSupportSettings({ mobileSync: v })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PhoneForwarded className="size-4 text-indigo-600" />
              Call Forwarding
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Forward calls to an external number.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm">Forwarding Mode</Label>
              <Select
                value={s.callForwardingMode}
                onValueChange={(v) =>
                  updateSupportSettings({
                    callForwardingMode: v as typeof s.callForwardingMode,
                  })
                }
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORWARDING_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {s.callForwardingMode !== "disabled" && (
              <div>
                <Label className="mb-2 block text-sm">
                  Forwarding Phone Number
                </Label>
                <Input
                  className="max-w-xs font-mono"
                  placeholder="+1 (415) 555-0142"
                  value={s.callForwardingNumber}
                  onChange={(e) =>
                    updateSupportSettings({
                      callForwardingNumber: e.target.value,
                    })
                  }
                />
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Enter the full number including country code.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ring Duration + Recording */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="size-4 text-orange-500" />
              Ring Duration
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              How long to ring before routing to voicemail.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={s.ringDurationSeconds}
                  onChange={(e) =>
                    updateSupportSettings({
                      ringDurationSeconds: Number(e.target.value),
                    })
                  }
                  aria-label="Ring duration in seconds"
                  className="accent-primary w-full"
                />
                <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                  <span>5s</span>
                  <span>120s</span>
                </div>
              </div>
              <div className="bg-muted/30 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums">
                <Timer className="text-muted-foreground size-3.5" />
                {s.ringDurationSeconds}s
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              After <strong>{s.ringDurationSeconds} seconds</strong> without an
              answer, the caller is sent to voicemail.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="size-4 text-red-500" />
              Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <ToggleRow
                label="Auto-Record All Calls"
                hint="AES-256 encrypted recordings"
                checked={s.autoRecord}
                onCheckedChange={(v) =>
                  updateSupportSettings({ autoRecord: v })
                }
              />
              <ToggleRow
                label="Auto-Transcribe"
                hint="Transcribe every call to searchable text"
                checked={s.autoTranscription}
                onCheckedChange={(v) =>
                  updateSupportSettings({ autoTranscription: v })
                }
              />
              <ToggleRow
                label="Compliance Notice"
                hint='Play "This call may be recorded" greeting'
                checked={s.complianceNotice}
                onCheckedChange={(v) =>
                  updateSupportSettings({ complianceNotice: v })
                }
              />
            </div>
            <div className="bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Recording Retention</p>
                <p className="text-muted-foreground text-xs">
                  Determined by your subscription plan
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {RETENTION_LABELS[s.recordingStorage]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missed Call Auto-Response */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-blue-600" />
            Missed Call Auto-Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Send Auto-SMS on Missed Call"
            hint="Instantly let the caller know you'll be in touch"
            checked={s.missedCallAutoSMS}
            onCheckedChange={(v) =>
              updateSupportSettings({ missedCallAutoSMS: v })
            }
          />
          {s.missedCallAutoSMS && (
            <div>
              <Label className="mb-2 block text-sm">SMS Template</Label>
              <Textarea
                rows={3}
                className="text-sm"
                value={s.missedCallSMSTemplate}
                onChange={(e) =>
                  updateSupportSettings({
                    missedCallSMSTemplate: e.target.value,
                  })
                }
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Use{" "}
                <code className="bg-muted rounded-sm px-1">{"{{name}}"}</code>{" "}
                for the caller&apos;s facility name.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Hours */}
      <BusinessHoursCard />

      {/* Staff Permissions */}
      <StaffPermissionsCard />
    </div>
  );
}
