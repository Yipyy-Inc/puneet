"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  List,
  Mic,
  Network,
  Phone,
  PhoneCall,
  PhoneMissed,
  Radio,
  Settings,
  Voicemail,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { useTwilioConfig } from "@/hooks/use-twilio-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  lookupFacilityByPhone,
  supportCallQueue,
  supportMissedCalls,
} from "@/data/support-calls";
import type {
  SupportMissedCall,
  SupportQueuedCall,
} from "@/types/support-call";
import { IvrRoutingTab } from "./ivr-routing-tab";
import { LiveTab } from "./live-tab";

const TABS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "live", label: "Live", icon: Radio },
  { value: "dialer", label: "Dialer", icon: Phone },
  { value: "log", label: "Call Log", icon: List },
  { value: "voicemail", label: "Voicemail", icon: Voicemail },
  { value: "recordings", label: "Recordings", icon: Mic },
  { value: "ivr", label: "IVR & Routing", icon: Network },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "settings", label: "Settings", icon: Settings },
];

function callerLabel(number: string): string {
  return lookupFacilityByPhone(number)?.facilityName ?? number;
}

// Voicemail and call-volume counts have no real call-record source yet, so they
// render a loading skeleton rather than a fabricated number (global rule).
function PendingTile({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border">
      <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {label}
          </p>
          <Skeleton className="h-6 w-12" />
          <p className="text-muted-foreground text-[10px]">
            Awaiting call records
          </p>
        </div>
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

export function SupportCallingClient() {
  const [queue, setQueue] = useState<SupportQueuedCall[]>(() => [
    ...supportCallQueue,
  ]);
  const [missed, setMissed] = useState<SupportMissedCall[]>(() => [
    ...supportMissedCalls,
  ]);
  const [waitTick, setWaitTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWaitTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const twilio = useTwilioConfig();
  const missedCount = missed.length;

  function onAnswer(c: SupportQueuedCall) {
    setQueue((q) => q.filter((x) => x.id !== c.id));
    toast.success(`Connected to ${callerLabel(c.callerNumber)}`);
  }
  function onCallBack(c: SupportMissedCall) {
    setMissed((m) =>
      m.map((x) => (x.id === c.id ? { ...x, status: "called_back" } : x)),
    );
    toast.success(`Calling back ${callerLabel(c.callerNumber)}…`);
  }
  function onMarkHandled(c: SupportMissedCall) {
    setMissed((m) => m.filter((x) => x.id !== c.id));
    toast.success("Call marked as handled");
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Yipyy Support Calls
        </h1>
        <p className="text-muted-foreground">
          Phone support for facilities
          {twilio.connected && twilio.phoneNumbers[0] && (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">
              · Connected via Twilio · {twilio.phoneNumbers[0]}
            </span>
          )}
        </p>
      </div>

      {!twilio.connected && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="text-rose-700 dark:text-rose-300">
            Twilio isn&apos;t configured — calling features are disabled until
            the integration is connected.
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link href="/dashboard/system-admin/integrations">
              Configure in Integrations
            </Link>
          </Button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="System Status"
          value={twilio.connected ? "Online" : "Offline"}
          hint={
            twilio.connected ? "Connected via Twilio" : "Twilio not configured"
          }
          icon={Radio}
          tone={twilio.connected ? "emerald" : "rose"}
        />
        <KpiTile
          label="Missed"
          value={missedCount}
          icon={PhoneMissed}
          tone={missedCount > 0 ? "amber" : "slate"}
          alert={
            missedCount > 0
              ? { label: "Needs callback", tone: "amber" }
              : undefined
          }
        />
        <PendingTile label="Voicemails" icon={Voicemail} />
        <PendingTile label="Today" icon={PhoneCall} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="live">
        <TabsList className="overflow-x-auto border-b px-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value}>
                <Icon className="size-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="live" className="pt-4">
          <LiveTab
            queue={queue}
            missed={missed}
            waitTick={waitTick}
            onAnswer={onAnswer}
            onCallBack={onCallBack}
            onMarkHandled={onMarkHandled}
          />
        </TabsContent>

        {TABS.filter((t) => t.value !== "live").map((t) => (
          <TabsContent key={t.value} value={t.value} className="pt-4">
            {t.value === "ivr" ? (
              <IvrRoutingTab />
            ) : (
              <TabPlaceholder icon={t.icon} title={t.label} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function TabPlaceholder({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
          <Icon className="size-6" />
        </span>
        <div className="space-y-1">
          <h3 className="font-semibold tracking-tight">{title}</h3>
          <p className="text-muted-foreground text-sm">
            This section is coming soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
