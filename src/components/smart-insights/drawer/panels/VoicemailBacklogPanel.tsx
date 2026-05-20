"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Voicemail, Play, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "../shared/DrawerFooter";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 8.1 Take Action — voicemail backlog list with playback + mark
 * handled.
 */

interface VoicemailRow {
  id: string;
  caller: string;
  matchedClient?: string;
  matchedClientId?: string;
  receivedAt: string;
  ageHours: number;
  durationSec: number;
  transcriptPreview: string;
}

const VOICEMAILS: VoicemailRow[] = [
  { id: "VM-1", caller: "+1 514-555-0211", matchedClient: "Hannah Patel", matchedClientId: "c-1202", receivedAt: "2 days ago", ageHours: 61, durationSec: 42, transcriptPreview: "Hi, wanted to reschedule Layla's grooming…" },
  { id: "VM-2", caller: "+1 438-555-0344", receivedAt: "2 days ago", ageHours: 53, durationSec: 28, transcriptPreview: "Looking for boarding rates for July long weekend…" },
  { id: "VM-3", caller: "+1 514-555-0703", matchedClient: "Owen Park", matchedClientId: "c-811", receivedAt: "Yesterday", ageHours: 33, durationSec: 51, transcriptPreview: "My number is on file, just need to confirm Luna's…" },
  { id: "VM-4", caller: "+1 514-555-0824", matchedClient: "Sara Khan", matchedClientId: "c-1104", receivedAt: "Yesterday", ageHours: 24, durationSec: 19, transcriptPreview: "Can you call me back when you have a moment…" },
  { id: "VM-5", caller: "+1 514-555-0911", receivedAt: "12h ago", ageHours: 12, durationSec: 34, transcriptPreview: "First-time caller, looking to start daycare for my…" },
  { id: "VM-6", caller: "+1 514-555-1042", matchedClient: "Mike Cho", matchedClientId: "c-1109", receivedAt: "8h ago", ageHours: 8, durationSec: 22, transcriptPreview: "Hey, quick question about the training package…" },
  { id: "VM-7", caller: "+1 438-555-1158", receivedAt: "4h ago", ageHours: 4, durationSec: 47, transcriptPreview: "Calling about your boarding waiver requirements…" },
  { id: "VM-8", caller: "+1 514-555-1231", matchedClient: "Iris Khoury", matchedClientId: "c-1013", receivedAt: "2h ago", ageHours: 2, durationSec: 31, transcriptPreview: "Hi, I think I left my keys at pickup yesterday…" },
];

export function VoicemailBacklogPanel({
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
      <div className="rounded-lg border bg-red-50 p-3 text-sm">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-900">
          <Voicemail className="size-3.5" />
          {VOICEMAILS.length} unlistened voicemails
        </div>
        <p className="text-red-900">
          {VOICEMAILS.filter((v) => v.ageHours >= 48).length} voicemails are
          older than 48 hours.
        </p>
      </div>

      <ul className="max-h-[26rem] space-y-2 overflow-y-auto">
        {VOICEMAILS.map((v) => {
          const isHandled = handled.has(v.id);
          const isOld = v.ageHours >= 48;
          return (
            <li
              key={v.id}
              data-handled={isHandled}
              data-old={isOld}
              className="space-y-2 rounded-md border p-3 text-sm data-[handled=true]:bg-emerald-50/50 data-[old=true]:border-red-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {v.matchedClient && v.matchedClientId ? (
                        <Link
                          href={insightLinks.client(v.matchedClientId)}
                          className="hover:text-primary hover:underline"
                        >
                          {v.matchedClient}
                        </Link>
                      ) : (
                        <span className="italic">{v.caller}</span>
                      )}
                    </p>
                    {isHandled ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-800"
                      >
                        <Check className="size-3" />
                        Handled
                      </Badge>
                    ) : isOld ? (
                      <Badge
                        variant="outline"
                        className="border-red-300 bg-red-50 text-red-800"
                      >
                        {v.ageHours}h old
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {v.caller} · {v.receivedAt} · {v.durationSec}s
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-1 text-xs italic">
                    "{v.transcriptPreview}"
                  </p>
                </div>
              </div>
              <div className="flex gap-2 border-t pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isHandled}
                >
                  <Play className="mr-1.5 size-3.5" />
                  Play
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isHandled}
                  onClick={() => markHandled(v.id)}
                >
                  <Check className="mr-1.5 size-3.5" />
                  Mark handled
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        href={insightLinks.calling("voicemail")}
        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 self-start text-xs hover:underline"
      >
        <ExternalLink className="size-3" />
        Open full Voicemail tab in Calling module
      </Link>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel={`Done — ${handled.size}/${VOICEMAILS.length} handled`}
          onPrimary={() => onComplete()}
          primaryDisabled={handled.size === 0}
          onSecondary={onCancel}
        />
      </div>
    </div>
  );
}
