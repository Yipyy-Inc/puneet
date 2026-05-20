"use client";

import { BarChart3, MessageSquare, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 7.4 Take Action — informational only per spec. Side-by-side
 * SMS vs Email breakdown for the past 90 days.
 */

const CHANNELS = [
  {
    key: "sms",
    icon: <MessageSquare className="size-4" />,
    label: "SMS",
    openRate: 94,
    clickRate: 38,
    bookingConversion: 12,
    sent: 11,
    color: "emerald",
  },
  {
    key: "email",
    icon: <Mail className="size-4" />,
    label: "Email",
    openRate: 22,
    clickRate: 6,
    bookingConversion: 7,
    sent: 14,
    color: "slate",
  },
] as const;

export function MessagingAnalyticsPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
          <BarChart3 className="size-3.5" />
          Channel breakdown · last 90 days
        </div>
        <p className="text-muted-foreground text-xs">
          SMS is outperforming email by 2.4× on opens and 1.8× on booking
          conversion.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CHANNELS.map((c) => (
          <div key={c.key} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2 font-semibold">
              {c.icon}
              {c.label}
            </div>
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Open rate</span>
                <span className="font-semibold">{c.openRate}%</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Click rate</span>
                <span className="font-semibold">{c.clickRate}%</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Booking conv.</span>
                <span className="font-semibold">{c.bookingConversion}%</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Campaigns sent</span>
                <span className="font-semibold">{c.sent}</span>
              </li>
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
        <Badge
          variant="outline"
          className="mb-2 gap-1 border-emerald-300 bg-white text-emerald-800"
        >
          Recommendation
        </Badge>
        <p className="text-emerald-900">
          Shift more of your scheduled campaigns to SMS for the next 90 days.
          Keep email for newsletters and longer-form content where it still
          adds value.
        </p>
      </div>

      <p className="text-muted-foreground text-xs">
        This insight is quarterly — Smart Insights will re-evaluate the
        channel mix in ~90 days.
      </p>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Mark reviewed"
          onPrimary={() => onComplete()}
          onSecondary={onCancel}
        />
      </div>
    </div>
  );
}
