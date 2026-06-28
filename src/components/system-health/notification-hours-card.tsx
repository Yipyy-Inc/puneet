"use client";

import { useState } from "react";

import { Clock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { supportAgents } from "@/data/support-tickets";
import { cn } from "@/lib/utils";
import {
  setRouteAfterHoursToOnCall,
  toggleOnCallAgent,
  updateNotifBusinessHours,
  useNotificationSettings,
  type NotifDayKey,
} from "@/lib/notification-settings-store";

const DAYS: NotifDayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABELS: Record<NotifDayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};
const AGENT_STATUS_DOT: Record<string, string> = {
  Available: "bg-emerald-500",
  Busy: "bg-amber-500",
  Away: "bg-orange-500",
  Offline: "bg-slate-400",
};

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
}

export function NotificationHoursCard() {
  const settings = useNotificationSettings();
  // Capture "now" once (React Compiler bans Date in render) — recomputed
  // against live settings below using plain numbers.
  const [now] = useState(() => {
    const d = new Date();
    return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  });

  const todayKey = DAYS[(now.day + 6) % 7];
  const today = settings.businessHours[todayKey];
  const isOpenNow =
    today.enabled &&
    now.minutes >= toMin(today.open) &&
    now.minutes < toMin(today.close);

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="size-5" />
          Business Hours &amp; On-Call
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Alerts that fire outside business hours route to your on-call agents.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business hours */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Business hours</h4>
            <Badge variant={isOpenNow ? "default" : "secondary"}>
              {isOpenNow ? "Open now" : "After hours now"}
            </Badge>
          </div>
          <div className="space-y-2">
            {DAYS.map((d) => {
              const h = settings.businessHours[d];
              return (
                <div key={d} className="flex items-center gap-3">
                  <Switch
                    checked={h.enabled}
                    onCheckedChange={(v) =>
                      updateNotifBusinessHours(d, { enabled: v })
                    }
                    aria-label={`${DAY_LABELS[d]} open`}
                  />
                  <span
                    className={cn(
                      "w-9 text-sm font-semibold",
                      !h.enabled && "text-muted-foreground",
                    )}
                  >
                    {DAY_LABELS[d]}
                  </span>
                  {h.enabled ? (
                    <div className="flex items-center gap-2">
                      <TimePickerLux
                        value={h.open}
                        onValueChange={(v) =>
                          updateNotifBusinessHours(d, { open: v })
                        }
                        displayMode="popover"
                        stepMinutes={15}
                      />
                      <span className="text-muted-foreground">—</span>
                      <TimePickerLux
                        value={h.close}
                        onValueChange={(v) =>
                          updateNotifBusinessHours(d, { close: v })
                        }
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
        </div>

        {/* On-call */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground size-4" />
              <h4 className="text-sm font-semibold">
                On-call agents (after hours)
              </h4>
            </div>
            <Switch
              checked={settings.routeAfterHoursToOnCall}
              onCheckedChange={setRouteAfterHoursToOnCall}
              aria-label="Route after-hours alerts to on-call agents"
            />
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            When an alert fires outside business hours, notify these agents.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {supportAgents.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm"
              >
                <Checkbox
                  checked={settings.onCallAgentIds.includes(a.id)}
                  onCheckedChange={() => toggleOnCallAgent(a.id)}
                  aria-label={`On-call: ${a.name}`}
                />
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground text-xs">{a.role}</span>
                <span
                  className={cn(
                    "ml-auto size-2 rounded-full",
                    AGENT_STATUS_DOT[a.status] ?? "bg-slate-400",
                  )}
                  title={a.status}
                  aria-label={a.status}
                />
              </label>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {settings.onCallAgentIds.length} agent(s) on call
            {!settings.routeAfterHoursToOnCall && " — after-hours routing off"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
