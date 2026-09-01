"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
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
  PhoneForwarded,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { PERMISSION_GROUPS } from "@/types/facility-staff";
import { cn } from "@/lib/utils";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
  type FacilitySettings,
} from "@/lib/api/facility-settings";
import type { SettingDomain } from "@/lib/settings/domains";
import type { BusinessHours } from "@/types/facility";
import type {
  CallingSettings,
  CallForwardingMode,
  DispatchMode,
} from "@/types/calling";
import { NumberPortingWizard } from "@/components/calling/NumberPortingWizard";
import { CallAvailabilitySettings } from "@/components/calling/CallAvailabilitySettings";
import { CallTagsSettings } from "@/components/calling/CallTagsSettings";

const dispatchOptions: {
  value: DispatchMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "ring_all",
    label: "Ring All Devices",
    description: "All connected devices ring simultaneously",
    icon: Radio,
  },
  {
    value: "desktop_first",
    label: "Desktop First",
    description: "Ring desktop for 5s, then mobile",
    icon: Monitor,
  },
  {
    value: "mobile_first",
    label: "Mobile First",
    description: "Mobile rings first, desktop as fallback",
    icon: Smartphone,
  },
  {
    value: "reception_only",
    label: "Reception Only",
    description: "Only the reception station receives calls",
    icon: Phone,
  },
  {
    value: "specific_group",
    label: "Specific Staff Group",
    description: "Route to a defined group of staff",
    icon: Users,
  },
  {
    value: "location_based",
    label: "Location-Based",
    description: "Route by caller's area code or location",
    icon: MapPin,
  },
  {
    value: "round_robin",
    label: "Round-Robin",
    description: "Distribute evenly across available staff",
    icon: Shuffle,
  },
];

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// ── THE TWO SHAPES OF "WHEN ARE YOU OPEN" ─────────────────────────────────
//
// The facility's `business_hours` domain stores {isOpen, openTime, closeTime};
// this panel's controls were written against {enabled, open, close}. One of
// them had to give, and it was not going to be the domain the Settings page,
// the booking flow and the roster already read.
//
// So the shapes are mapped here, at the edge, rather than a second copy of the
// hours being kept — which is exactly what CallingSettings did, seeded from its
// own fixture, giving a facility two answers that disagreed on Sunday.
function fromFacilityHours(
  hours: BusinessHours,
): CallingSettings["businessHours"] {
  const day = (d: (typeof DAYS)[number]) => ({
    open: hours[d].openTime,
    close: hours[d].closeTime,
    enabled: hours[d].isOpen,
  });
  return {
    monday: day("monday"),
    tuesday: day("tuesday"),
    wednesday: day("wednesday"),
    thursday: day("thursday"),
    friday: day("friday"),
    saturday: day("saturday"),
    sunday: day("sunday"),
  };
}

function toFacilityHours(
  hours: CallingSettings["businessHours"],
): BusinessHours {
  const day = (d: (typeof DAYS)[number]) => ({
    isOpen: hours[d].enabled,
    openTime: hours[d].open,
    closeTime: hours[d].close,
  });
  return {
    monday: day("monday"),
    tuesday: day("tuesday"),
    wednesday: day("wednesday"),
    thursday: day("thursday"),
    friday: day("friday"),
    saturday: day("saturday"),
    sunday: day("sunday"),
  };
}

/** The five domains, reassembled into the shape this panel's controls edit. */
function fromDomains(facility: FacilitySettings): CallingSettings {
  return {
    ...facility.calling_number_prefs.value,
    ...facility.calling_dispatch.value,
    ...facility.calling_recording.value,
    ...facility.calling_follow_up.value,
    businessHours: fromFacilityHours(facility.business_hours.value),
  };
}

// ============================================================================
// ── WHAT SAVE USED TO DO ──────────────────────────────────────────────────
//
//   const handleSave = () => {
//     setSaved(true);
//     setTimeout(() => setSaved(false), 2000);
//   };
//
// Every control worked, the button said "Saved", and nothing left the
// component. A reload restored the fixture — including the recording switch,
// the retention period and the missed-call SMS text.
//
// ── FOUR WRITES, NOT ONE ──────────────────────────────────────────────────
//
// The sections are four settings domains (see lib/settings/calling.ts), so Save
// issues four PATCHes. Reported individually: RLS refuses these for anyone
// without `manage_settings`, and a partial failure must not be able to show the
// same toast as a success. On any failure the draft is KEPT, so the edits that
// did not land are still on screen to retry rather than silently discarded.
//
// Business hours are the facility's own `business_hours` domain, mapped at the
// edges. Calling used to carry a second copy in a different shape.
// ============================================================================

/**
 * The calling permissions, taken from the catalogue rather than retyped.
 *
 * Only the `calling_` keys: the catalogue group is "Calling & messages" and the
 * messaging half is a different module's screen.
 */
const CALLING_PERMISSIONS =
  PERMISSION_GROUPS.find(
    (g) => g.id === "calling_messages",
  )?.permissions.filter((p) => p.key.startsWith("calling_")) ?? [];

/** The four domains this panel writes, and how to cut its draft into them. */
const SECTIONS: {
  domain: SettingDomain;
  label: string;
  value: (s: CallingSettings) => unknown;
}[] = [
  {
    domain: "calling_number_prefs",
    label: "business number",
    value: (s) => ({ businessNumber: s.businessNumber }),
  },
  {
    domain: "calling_dispatch",
    label: "call routing",
    value: (s) => ({
      dispatchMode: s.dispatchMode,
      ringTone: s.ringTone,
      visualFlash: s.visualFlash,
      mobileSync: s.mobileSync,
      simultaneousCallHandling: s.simultaneousCallHandling,
      callForwardingMode: s.callForwardingMode,
      callForwardingNumber: s.callForwardingNumber,
      ringDurationSeconds: s.ringDurationSeconds,
    }),
  },
  {
    domain: "calling_recording",
    label: "recording",
    value: (s) => ({
      autoRecord: s.autoRecord,
      recordingStorage: s.recordingStorage,
      complianceNotice: s.complianceNotice,
      autoTranscription: s.autoTranscription,
      aiSummaryEnabled: s.aiSummaryEnabled,
    }),
  },
  {
    domain: "calling_follow_up",
    label: "missed-call follow-up",
    value: (s) => ({
      missedCallAutoSMS: s.missedCallAutoSMS,
      missedCallSMSTemplate: s.missedCallSMSTemplate,
      tags: s.tags,
    }),
  },
];

export function CallingSettingsPanel() {
  const { settings: facility, isPending } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();

  // The stored value, assembled from the domains. Derived from the server and
  // never seeded into state, so a save by a colleague is picked up rather than
  // shadowed by whatever this browser loaded first.
  const stored = useMemo<CallingSettings>(
    () => fromDomains(facility),
    [facility],
  );

  const [draft, setDraft] = useState<CallingSettings | null>(null);
  const settings = draft ?? stored;
  const dirty = draft !== null;

  // ── NOTHING MAY BE EDITED BEFORE THE FACILITY'S VALUES ARRIVE ────────────
  //
  // `useFacilitySettings` returns the documented DEFAULTS while the request is
  // in flight — deliberately, so the booking modals can render a whole form.
  // Here that is a trap: a draft seeded from those defaults keeps shadowing the
  // real values once they land (`draft ?? stored`), and Save writes EVERY
  // domain. One toggle flipped a second too early silently replaces the
  // facility's business hours, dispatch mode and recording policy with the
  // fallbacks.
  //
  // Not hypothetical. It overwrote this database's real hours — Monday
  // 06:15-21:45 with the weekend closed — with the fixture's 07:00-19:00 and an
  // open weekend, during the verification run for this very change.
  //
  // So the panel does not exist until it knows what it is editing.
  if (isPending) {
    return (
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="py-10">
              <div
                data-slot="skeleton"
                className="bg-muted h-4 w-48 animate-pulse rounded-sm"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const update = <K extends keyof CallingSettings>(
    key: K,
    value: CallingSettings[K],
  ) => setDraft((prev) => ({ ...(prev ?? stored), [key]: value }));

  const updateHours = (
    day: (typeof DAYS)[number],
    field: "open" | "close" | "enabled",
    value: string | boolean,
  ) =>
    setDraft((prev) => {
      const base = prev ?? stored;
      return {
        ...base,
        businessHours: {
          ...base.businessHours,
          [day]: { ...base.businessHours[day], [field]: value },
        },
      };
    });

  const handleSave = async () => {
    // Unreachable while the early return above stands, and kept anyway: this is
    // the function that writes five domains at once, and the cost of it running
    // against unloaded values is somebody's opening hours.
    if (isPending || !dirty) return;
    const attempts = await Promise.allSettled(
      SECTIONS.map((section) =>
        saveSetting.mutateAsync({
          domain: section.domain,
          value: section.value(settings),
        }),
      ),
    );
    const hoursAttempt = await Promise.allSettled([
      saveSetting.mutateAsync({
        domain: "business_hours",
        value: toFacilityHours(settings.businessHours),
      }),
    ]);

    const failed = [
      ...SECTIONS.filter((_, i) => attempts[i].status === "rejected").map(
        (s) => s.label,
      ),
      ...(hoursAttempt[0].status === "rejected" ? ["business hours"] : []),
    ];

    if (failed.length > 0) {
      // The draft stays. Clearing it would drop the edits that did not land.
      toast.error(`Could not save ${failed.join(", ")}`);
      return;
    }
    setDraft(null);
    toast.success("Calling settings saved");
  };

  const saved = saveSetting.isSuccess && !dirty;

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
            {/* "Active" used to be unconditional, beside a fixture number.
                With nothing configured it claimed a live line that does not
                exist — the same defect as the System Status card. */}
            {settings.businessNumber.trim() ? (
              <Badge variant="outline" className="gap-1.5">
                <div className="size-2 rounded-full bg-green-500" />
                Set
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1.5"
              >
                <div className="bg-muted-foreground/40 size-2 rounded-full" />
                Not set
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            Outbound calls will display this number to recipients. Yipyy has not
            provisioned a number for this facility yet, so this is what the
            screens show rather than a line we bought.
          </p>
        </CardContent>
      </Card>

      {/* Number Porting */}
      <NumberPortingWizard />

      {/* Dispatch Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="size-4 text-purple-600" />
            Call Dispatch Mode
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            How incoming calls are distributed to staff
          </p>
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
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        active && "text-primary",
                      )}
                    >
                      {opt.label}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {opt.description}
                    </p>
                  </div>
                  {active && (
                    <div className="border-primary bg-primary mt-0.5 ml-auto size-4 rounded-full border-2" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-Staff Call Availability */}
      <CallAvailabilitySettings />

      {/* Call Tags / Categories */}
      <CallTagsSettings />

      {/* Simultaneous Call Handling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-teal-600" />
            Multiple Simultaneous Calls
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            What happens when a second call arrives
          </p>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.simultaneousCallHandling}
            onValueChange={(v) =>
              update(
                "simultaneousCallHandling",
                v as CallingSettings["simultaneousCallHandling"],
              )
            }
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allow_waiting">
                Allow call waiting (staff sees second call)
              </SelectItem>
              <SelectItem value="next_available">
                Send to next available staff member
              </SelectItem>
              <SelectItem value="direct_voicemail">
                Send directly to voicemail
              </SelectItem>
              <SelectItem value="queue_system">
                Queue system — caller hears their position
              </SelectItem>
            </SelectContent>
          </Select>
          {settings.simultaneousCallHandling === "queue_system" && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <Radio className="size-3.5 shrink-0" />
              Callers will hear:{" "}
              <em>&quot;You are caller #2. Estimated wait: 2 minutes.&quot;</em>
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
                onValueChange={(v) =>
                  update("ringTone", v as CallingSettings["ringTone"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic Ring</SelectItem>
                  <SelectItem value="soft_chime">Soft Chime</SelectItem>
                  <SelectItem value="loud_alert">Loud Alert</SelectItem>
                  <SelectItem value="repeating">
                    Repeating Notification
                  </SelectItem>
                  <SelectItem value="silent">Silent (visual only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Visual Flash Header</Label>
                <p className="text-muted-foreground text-xs">
                  Flashes the top bar for busy environments
                </p>
              </div>
              <Switch
                checked={settings.visualFlash}
                onCheckedChange={(v) => update("visualFlash", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Desktop + Mobile Sync</Label>
                <p className="text-muted-foreground text-xs">
                  Answer on one device — stops ringing everywhere
                </p>
              </div>
              <Switch
                checked={settings.mobileSync}
                onCheckedChange={(v) => update("mobileSync", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Forwarding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneForwarded className="size-4 text-indigo-600" />
            Call Forwarding
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Forward calls to an external number
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm">Forwarding Mode</Label>
            <Select
              value={settings.callForwardingMode}
              onValueChange={(v) =>
                update("callForwardingMode", v as CallForwardingMode)
              }
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">
                  Disabled — no forwarding
                </SelectItem>
                <SelectItem value="always">Always forward all calls</SelectItem>
                <SelectItem value="on_no_answer">
                  Forward on no answer
                </SelectItem>
                <SelectItem value="on_busy">Forward when busy</SelectItem>
                <SelectItem value="on_no_answer_or_busy">
                  Forward on no answer or busy
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {settings.callForwardingMode !== "disabled" && (
            <div>
              <Label className="mb-2 block text-sm">
                Forwarding Phone Number
              </Label>
              <Input
                className="max-w-xs font-mono"
                placeholder="+1 (323) 968-7848"
                value={settings.callForwardingNumber}
                onChange={(e) => update("callForwardingNumber", e.target.value)}
              />
              <p className="text-muted-foreground mt-1.5 text-xs">
                Enter the full phone number including country code.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ring Duration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="size-4 text-orange-500" />
            Ring Duration
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            How long to ring before routing to voicemail
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="max-w-xs flex-1">
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={settings.ringDurationSeconds}
                onChange={(e) =>
                  update("ringDurationSeconds", Number(e.target.value))
                }
                className="accent-primary w-full"
              />
              <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                <span>5s</span>
                <span>120s</span>
              </div>
            </div>
            <div className="bg-muted/30 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums">
              <Timer className="text-muted-foreground size-3.5" />
              {settings.ringDurationSeconds}s
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            After <strong>{settings.ringDurationSeconds} seconds</strong>{" "}
            without an answer, the caller is sent to voicemail.
          </p>
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
                <p className="text-muted-foreground text-xs">
                  AES-256 encrypted recordings
                </p>
              </div>
              <Switch
                checked={settings.autoRecord}
                onCheckedChange={(v) => update("autoRecord", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Transcription</Label>
                <p className="text-muted-foreground text-xs">
                  Transcribe every call to searchable text
                </p>
              </div>
              <Switch
                checked={settings.autoTranscription}
                onCheckedChange={(v) => update("autoTranscription", v)}
              />
            </div>
            {/* aiSummaryEnabled was in the type and the fixture with no control
                on any screen, so it could be neither seen nor changed. It sends
                call content to a third-party model, which is not something to
                leave switched on invisibly. */}
            <div className="flex items-center justify-between">
              <div>
                <Label>AI Call Summaries</Label>
                <p className="text-muted-foreground text-xs">
                  Summarise recorded calls and score sentiment
                </p>
              </div>
              <Switch
                checked={settings.aiSummaryEnabled}
                disabled={!settings.autoTranscription}
                onCheckedChange={(v) => update("aiSummaryEnabled", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Compliance Notice</Label>
                <p className="text-muted-foreground text-xs">
                  Play &quot;This call may be recorded&quot; greeting
                </p>
              </div>
              <Switch
                checked={settings.complianceNotice}
                onCheckedChange={(v) => update("complianceNotice", v)}
              />
            </div>
          </div>
          <div className="bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Recording Retention</p>
              <p className="text-muted-foreground text-xs">
                Determined by your subscription plan
              </p>
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
              <p className="text-muted-foreground text-xs">
                Instantly notify the caller you&apos;ll be in touch
              </p>
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
                onChange={(e) =>
                  update("missedCallSMSTemplate", e.target.value)
                }
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Use{" "}
                <code className="bg-muted rounded-sm px-1">{"{{name}}"}</code>{" "}
                for client name.
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
          <p className="text-muted-foreground text-sm">
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
                  <span
                    className={cn(
                      "w-9 text-sm font-semibold",
                      !h.enabled && "text-muted-foreground",
                    )}
                  >
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
                    <span className="text-muted-foreground text-sm">
                      Closed
                    </span>
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
          <p className="text-muted-foreground text-sm">
            Role-based access is managed in Settings → Team → Roles
          </p>
        </CardHeader>
        <CardContent>
          {/* Rendered from the catalogue the role editor actually reads.
              These were six hand-typed strings, and they had drifted: two of
              them — "Download recordings" and "Delete recordings" — name
              permissions that do not exist, so a manager sent here to grant one
              would search the role editor and never find it. A third,
              calling_view_voicemail, was real and missing. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CALLING_PERMISSIONS.map((perm) => (
              <div
                key={perm.key}
                className="bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
                title={perm.hint}
              >
                <Shield className="text-muted-foreground size-3" />
                {perm.label}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/facility/dashboard/settings?section=roles-permissions">
              Manage Role Permissions →
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Button
        className="w-full gap-2"
        onClick={() => void handleSave()}
        disabled={isPending || saveSetting.isPending || !dirty}
      >
        <Save className="size-4" />
        {saveSetting.isPending
          ? "Saving…"
          : dirty
            ? "Save Settings"
            : saved
              ? "Settings Saved!"
              : "Save Settings"}
      </Button>
    </div>
  );
}
