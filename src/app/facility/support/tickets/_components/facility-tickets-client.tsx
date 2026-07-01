"use client";

import Link from "next/link";
import { ChevronLeft, LifeBuoy, Plus, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FACILITY_TICKET_STATUS_META,
  useFacilityTickets,
} from "@/lib/facility-tickets-store";
import { openSupportDrawer } from "@/lib/support-drawer-store";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FacilityTicketsClient() {
  const tickets = useFacilityTickets();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <Link
          href="/facility/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          Back to dashboard
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Support Tickets
            </h1>
            <p className="text-muted-foreground text-sm">
              Tickets you&apos;ve submitted to the Yipyy support team.
            </p>
          </div>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => openSupportDrawer("ticket")}
          >
            <Plus className="mr-1.5 size-4" />
            New ticket
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="size-4" />
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <LifeBuoy className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">No tickets yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSupportDrawer("ticket")}
              >
                Submit a ticket
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {tickets.map((t) => {
                const meta = FACILITY_TICKET_STATUS_META[t.status];
                return (
                  <li
                    key={t.id}
                    className="hover:bg-muted/40 flex items-center gap-4 px-4 py-3 transition-colors"
                  >
                    <span className="text-muted-foreground w-[72px] shrink-0 font-mono text-xs">
                      {t.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.subject}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {t.category}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 text-xs", meta.badge)}
                    >
                      {meta.label}
                    </Badge>
                    <span className="text-muted-foreground hidden w-24 shrink-0 text-right text-xs sm:block">
                      {formatDate(t.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
