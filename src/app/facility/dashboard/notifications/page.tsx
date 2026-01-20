"use client";

import * as React from "react";
import { Bell, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function FacilityNotificationsPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            // Frontend-only testing helper:
            // increment unread alerts so the badge updates on next poll/focus.
            const current = Number(localStorage.getItem("unread_alerts_count") ?? "0");
            localStorage.setItem("unread_alerts_count", String(current + 1));
            window.dispatchEvent(
              new StorageEvent("storage", { key: "unread_alerts_count" }),
            );
          }}
          aria-label="Add unread alert"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

