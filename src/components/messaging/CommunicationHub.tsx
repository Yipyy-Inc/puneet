"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Inbox,
  BarChart3,
  Settings,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageCenter } from "./MessageCenter";
import { facilities } from "@/data/facilities";

const MessagingAnalyticsView = dynamic(() =>
  import("./MessagingAnalyticsView").then((m) => m.MessagingAnalyticsView),
);
const MessagingSettingsView = dynamic(() =>
  import("./MessagingSettingsView").then((m) => m.MessagingSettingsView),
);

type HubTab = "inbox" | "analytics" | "settings";

const facility = facilities.find((f) => f.id === 11);
const credits = (facility as Record<string, unknown>)?.smsCredits as
  | { monthlyAllowance: number; used: number; purchased: number; autoReloadThreshold: number }
  | undefined;
const smsTotal = credits ? credits.monthlyAllowance + (credits.purchased ?? 0) : 0;
const smsRemaining = credits ? smsTotal - credits.used : 0;
const smsLow = credits ? smsRemaining / smsTotal < 0.1 : false;

const NAV_ITEMS: { key: HubTab; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

export function CommunicationHub() {
  const [tab, setTab] = useState<HubTab>("inbox");

  return (
    <div className="flex h-full flex-col">
      {/* Low SMS credit alert */}
      {smsLow && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Smartphone className="size-4 shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700">
            <strong>SMS credits running low</strong> — {smsRemaining.toLocaleString()} remaining (
            {Math.round((smsRemaining / smsTotal) * 100)}%). Auto-purchase or top up in Settings.
          </p>
          <AlertTriangle className="size-4 shrink-0 text-red-400" />
        </div>
      )}

      {/* Sub-navigation */}
      <nav className="flex items-center gap-1 border-b bg-white px-6 pt-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-b-blue-600 bg-blue-50/50 text-blue-700"
                  : "border-b-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {tab === "inbox" && (
          <div className="flex min-h-0 w-full flex-1 overflow-hidden p-4">
            <MessageCenter mode="facility" />
          </div>
        )}
        {tab === "analytics" && (
          <div className="flex-1 overflow-y-auto p-6">
            <MessagingAnalyticsView />
          </div>
        )}
        {tab === "settings" && (
          <div className="flex-1 overflow-y-auto p-6">
            <MessagingSettingsView />
          </div>
        )}
      </div>
    </div>
  );
}
