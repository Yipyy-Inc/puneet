"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Inbox, BarChart3, Settings, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageCenter } from "./MessageCenter";
import { ScheduledMessagesView } from "./ScheduledMessagesView";
import { LocationScopePicker } from "@/components/hq/LocationScopePicker";
import { useLocationContext } from "@/hooks/use-location-context";
import { SavedRepliesProvider } from "./saved-replies-context";
import {
  ScheduledMessagesProvider,
  useScheduledMessages,
} from "./scheduled-messages-context";
import { ConversationStateProvider } from "./conversation-state-context";
import { SmsCreditBanner } from "./SmsCreditBanner";

const MessagingAnalyticsView = dynamic(() =>
  import("./MessagingAnalyticsView").then((m) => m.MessagingAnalyticsView),
);
const MessagingSettingsView = dynamic(() =>
  import("./MessagingSettingsView").then((m) => m.MessagingSettingsView),
);

type HubTab = "inbox" | "scheduled" | "analytics" | "settings";

const NAV_ITEMS: { key: HubTab; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "scheduled", label: "Scheduled", icon: Clock },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

function HubInner() {
  const [tab, setTab] = useState<HubTab>("inbox");
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const { locations, isMultiLocation } = useLocationContext();
  const { count: scheduledCount } = useScheduledMessages();

  return (
    <div className="flex h-full flex-col">
      <SmsCreditBanner />

      <nav className="flex items-center gap-1 border-b bg-white px-6 pt-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          const showBadge = item.key === "scheduled" && scheduledCount > 0;
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
              {showBadge && (
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-600",
                  )}
                >
                  {scheduledCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {isMultiLocation && tab === "inbox" && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-white/60 px-6 py-2.5">
          <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
            Filter by location
          </span>
          <LocationScopePicker
            locations={locations}
            value={locationFilter}
            onChange={setLocationFilter}
            compact
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {tab === "inbox" && (
          <div className="flex min-h-0 w-full flex-1 overflow-hidden p-4">
            <MessageCenter
              mode="facility"
              locationFilter={locationFilter}
            />
          </div>
        )}
        {tab === "scheduled" && (
          <div className="flex-1 overflow-y-auto p-6">
            <ScheduledMessagesView />
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

export function CommunicationHub() {
  return (
    <SavedRepliesProvider>
      <ScheduledMessagesProvider>
        <ConversationStateProvider>
          <HubInner />
        </ConversationStateProvider>
      </ScheduledMessagesProvider>
    </SavedRepliesProvider>
  );
}
