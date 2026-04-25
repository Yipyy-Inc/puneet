"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Zap,
  Plus,
  Smartphone,
  Mail,
  Clock,
  CheckCircle2,
  Settings,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { automations as defaultAutomations } from "@/data/messaging";
import type { Automation } from "@/types/messaging";

const TRIGGER_LABELS: Record<string, string> = {
  booking_confirmed: "Booking Confirmed",
  boarding_check_in: "Boarding Check-In",
  boarding_check_out: "Boarding Check-Out",
  vaccine_expiring_30d: "Vaccine Expiring (30 days)",
  vaccine_expiring_7d: "Vaccine Expiring (7 days)",
  missed_call: "Missed Call",
  abandoned_booking: "Abandoned Booking",
  payment_overdue: "Payment Overdue",
  birthday: "Pet Birthday",
  post_visit_24h: "Post Visit (24h)",
  inactive_90d: "Inactive 90+ Days",
};

const TRIGGER_CATEGORIES: Record<string, { category: string; color: string }> = {
  booking_confirmed: { category: "Booking", color: "bg-blue-50 text-blue-700 border-blue-200" },
  boarding_check_in: { category: "Boarding", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  boarding_check_out: { category: "Boarding", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vaccine_expiring_30d: { category: "Health", color: "bg-amber-50 text-amber-700 border-amber-200" },
  vaccine_expiring_7d: { category: "Health", color: "bg-red-50 text-red-700 border-red-200" },
  missed_call: { category: "Communication", color: "bg-violet-50 text-violet-700 border-violet-200" },
  abandoned_booking: { category: "Booking", color: "bg-orange-50 text-orange-700 border-orange-200" },
  payment_overdue: { category: "Billing", color: "bg-red-50 text-red-700 border-red-200" },
  birthday: { category: "Engagement", color: "bg-pink-50 text-pink-700 border-pink-200" },
  post_visit_24h: { category: "Feedback", color: "bg-teal-50 text-teal-700 border-teal-200" },
  inactive_90d: { category: "Engagement", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function delayLabel(minutes: number): string {
  if (minutes === 0) return "Immediately";
  if (minutes < 0) return `${Math.abs(minutes / 60)}h before`;
  if (minutes < 60) return `${minutes}m after`;
  const h = minutes / 60;
  if (h < 24) return `${h}h after`;
  return `${h / 24}d after`;
}

export function AutomationsView() {
  const [automations, setAutomations] = useState<Automation[]>(defaultAutomations);

  const enabledCount = automations.filter((a) => a.enabled).length;
  const totalSent = automations.reduce((s, a) => s + a.sentCount, 0);

  const toggleEnabled = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a, enabled: !a.enabled };
        toast.success(
          next.enabled ? `"${a.name}" automation enabled` : `"${a.name}" automation paused`,
        );
        return next;
      }),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Automations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Trigger-based messages sent automatically at the right moment
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          New Automation
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Zap className="size-4 text-amber-500" />
              Active Automations
            </div>
            <p className="mt-1 text-3xl font-bold text-slate-800">
              {enabledCount}
              <span className="text-lg text-slate-400">/{automations.length}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <TrendingUp className="size-4 text-emerald-500" />
              Messages Sent (All Time)
            </div>
            <p className="mt-1 text-3xl font-bold text-emerald-600">
              {totalSent.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <CheckCircle2 className="size-4 text-blue-500" />
              Avg. per Automation
            </div>
            <p className="mt-1 text-3xl font-bold text-blue-600">
              {Math.round(totalSent / automations.length).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-4">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-slate-700">How Automations Work</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Each automation follows: <strong>Trigger → Delay → Channel → Template</strong>. When a
              trigger fires (e.g. boarding check-in), the message is sent automatically after the
              configured delay. Toggle any automation on/off without deleting it.
            </p>
          </div>
        </div>
      </div>

      {/* Automation list */}
      <div className="space-y-3">
        {automations.map((auto) => {
          const triggerMeta = TRIGGER_CATEGORIES[auto.trigger];
          const ChannelIcon = auto.channel === "sms" ? Smartphone : Mail;

          return (
            <Card
              key={auto.id}
              className={cn(
                "transition-all",
                !auto.enabled && "opacity-60",
              )}
            >
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  {/* Enable toggle */}
                  <Switch
                    checked={auto.enabled}
                    onCheckedChange={() => toggleEnabled(auto.id)}
                    className="mt-1 shrink-0"
                  />

                  {/* Icon */}
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                      auto.channel === "sms" ? "bg-blue-50 border-blue-200" : "bg-violet-50 border-violet-200",
                    )}
                  >
                    <ChannelIcon
                      className={cn("size-5", auto.channel === "sms" ? "text-blue-600" : "text-violet-600")}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-800">{auto.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              triggerMeta?.color ?? "bg-slate-100 text-slate-600 border-slate-200",
                            )}
                          >
                            <Zap className="size-2.5" />
                            {TRIGGER_LABELS[auto.trigger] ?? auto.trigger}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="size-3" />
                            {delayLabel(auto.delayMinutes)}
                          </span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">
                            via {auto.channel === "sms" ? "SMS" : "Email"}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-full text-slate-400 hover:text-slate-600"
                      >
                        <Settings className="size-4" />
                      </Button>
                    </div>

                    {/* Message preview */}
                    <p className="mt-2 truncate text-sm text-slate-400">{auto.message}</p>

                    {/* Stats */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="size-3 text-emerald-500" />
                        <span className="font-semibold text-slate-600">
                          {auto.sentCount.toLocaleString()}
                        </span>{" "}
                        sent
                      </span>
                      {auto.lastTriggered && (
                        <>
                          <span>·</span>
                          <span>Last triggered {relTime(auto.lastTriggered)}</span>
                        </>
                      )}
                      {!auto.enabled && (
                        <Badge variant="secondary" className="text-[10px]">
                          Paused
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
