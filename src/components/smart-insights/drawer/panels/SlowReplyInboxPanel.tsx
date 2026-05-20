"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, MessageSquare, Reply, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "../shared/DrawerFooter";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 8.2 Take Action — Messaging Inbox filtered to conversations with
 * no staff reply in the past 24 hours.
 */

interface Conversation {
  id: string;
  clientId: string;
  client: string;
  petName?: string;
  lastInboundAt: string;
  hoursOpen: number;
  preview: string;
  channel: "sms" | "email";
}

const CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1401",
    clientId: "c-1201",
    client: "Pierre Lavoie",
    petName: "Otis",
    lastInboundAt: "2 days ago",
    hoursOpen: 47,
    preview: "Can you confirm if Otis's full groom on Saturday is still on?",
    channel: "sms",
  },
  {
    id: "conv-1402",
    clientId: "c-1102",
    client: "Maya Brown",
    petName: "Luna",
    lastInboundAt: "Yesterday",
    hoursOpen: 31,
    preview: "Hi, is Luna OK to come in even though her bordetella expired last week?",
    channel: "email",
  },
  {
    id: "conv-1403",
    clientId: "c-1113",
    client: "Henry Kim",
    lastInboundAt: "26h ago",
    hoursOpen: 26,
    preview: "Looking for daycare rates for two dogs — multi-dog discount?",
    channel: "sms",
  },
];

export function SlowReplyInboxPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [handled, setHandled] = useState<Set<string>>(new Set());

  const markHandled = (id: string) => {
    setHandled((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-amber-50/60 p-3 text-sm">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
          <MessageSquare className="size-3.5" />
          {CONVERSATIONS.length} conversations open over 24 hours
        </div>
        <p className="text-amber-900">
          Average response time has slipped to 5.2 hours — these are the
          oldest threads pulling the average up.
        </p>
      </div>

      <ul className="space-y-2">
        {CONVERSATIONS.map((c) => {
          const isHandled = handled.has(c.id);
          return (
            <li
              key={c.id}
              data-handled={isHandled}
              className="space-y-2 rounded-md border p-3 text-sm data-[handled=true]:bg-emerald-50/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      <Link
                        href={insightLinks.client(c.clientId)}
                        className="hover:text-primary hover:underline"
                      >
                        {c.client}
                      </Link>
                      {c.petName ? ` · ${c.petName}` : ""}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {c.channel.toUpperCase()}
                    </Badge>
                    {isHandled && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-800"
                      >
                        <Check className="size-3" />
                        Replied
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Last reply needed {c.lastInboundAt}
                  </p>
                  <p className="text-muted-foreground mt-1 italic">
                    "{c.preview}"
                  </p>
                </div>
                <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                  {c.hoursOpen}h
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isHandled}
                  onClick={() => markHandled(c.id)}
                >
                  <Reply className="mr-1.5 size-3.5" />
                  Mark replied
                </Button>
                <Button type="button" size="sm" variant="ghost" asChild>
                  <Link href={insightLinks.messaging(c.id)}>
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Open thread
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel={`Done — ${handled.size}/${CONVERSATIONS.length} replied`}
          onPrimary={() => onComplete()}
          primaryDisabled={handled.size === 0}
          onSecondary={onCancel}
        />
      </div>
    </div>
  );
}
