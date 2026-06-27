"use client";

import { Building2, Clock, History, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRecentCalls } from "@/lib/dialer-store";
import type { RecentCall } from "@/types/dialer";
import { formatMinutesAgo } from "./support-calling-utils";

export function RecentContacts({
  nowMs,
  onRedial,
}: {
  nowMs: number;
  onRedial: (call: RecentCall) => void;
}) {
  const recents = useRecentCalls();
  const hydrated = useHydrated();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-lg">
            <History className="size-4" />
          </span>
          Recent Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hydrated ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : recents.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            No recent calls yet — dialed facilities will appear here.
          </p>
        ) : (
          recents.map((c) => {
            const minutes = Math.max(
              0,
              Math.round((nowMs - new Date(c.at).getTime()) / 60_000),
            );
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.facilityName}</p>
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <span className="tabular-nums">{c.number}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        called {formatMinutesAgo(minutes)}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRedial(c)}
                  className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                >
                  <Phone className="mr-1.5 size-3.5" />
                  Redial
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
