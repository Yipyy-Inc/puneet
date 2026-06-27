"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  Sparkles,
  Voicemail as VoicemailIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lookupFacilityByPhone } from "@/data/support-calls";
import { recordOutboundCall } from "@/lib/dialer-store";
import {
  markVoicemailPlayed,
  setVoicemailStatus,
} from "@/lib/support-voicemail-store";
import { useTwilioConfig } from "@/hooks/use-twilio-config";
import { placeOutboundCall } from "@/lib/twilio-dialer";
import type { SupportVoicemail } from "@/types/support-call";
import { FacilityAvatar } from "../../chat/_components/facility-avatar";
import { AudioBar } from "./audio-bar";
import { formatDuration } from "./call-log-utils";

function formatReceived(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VoicemailRow({ voicemail }: { voicemail: SupportVoicemail }) {
  const twilio = useTwilioConfig();
  const facility = lookupFacilityByPhone(voicemail.callerNumber);
  const resolved = voicemail.status === "resolved";

  async function onCallBack() {
    if (!twilio.connected) {
      toast.error("Twilio isn't connected — configure it in Integrations.");
      return;
    }
    const result = await placeOutboundCall({
      to: voicemail.callerNumber,
      from: twilio.phoneNumbers[0] ?? "",
    });
    if (!result.ok) {
      toast.error(result.error ?? "The call could not be placed.");
      return;
    }
    toast.success(
      `Calling ${facility?.facilityName ?? voicemail.callerNumber}…`,
    );
    if (facility) {
      recordOutboundCall({
        facilityId: facility.facilityId,
        facilityName: facility.facilityName,
        number: voicemail.callerNumber,
      });
    }
  }

  return (
    <div
      data-new={voicemail.isNew}
      className={cn(
        "bg-card rounded-xl border p-3.5 transition-all",
        resolved && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {facility ? (
            <FacilityAvatar
              name={facility.facilityName}
              id={facility.facilityId}
              size="sm"
            />
          ) : (
            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-xl">
              <VoicemailIcon className="size-4" />
            </span>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {facility ? (
                <Link
                  href={`/dashboard/facilities/${facility.facilityId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  {facility.facilityName}
                  <ExternalLink className="size-3 shrink-0 opacity-60" />
                </Link>
              ) : (
                <span className="text-muted-foreground text-sm font-semibold">
                  Unknown Caller
                </span>
              )}
              {voicemail.isNew && (
                <Badge className="h-4 gap-1 bg-blue-600 px-1.5 text-[10px] text-white hover:bg-blue-600">
                  <VoicemailIcon className="size-2.5" />
                  NEW
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground font-mono text-xs">
              {voicemail.callerNumber || "—"}
            </p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              <Clock className="size-3" />
              {formatReceived(voicemail.receivedAt)}
              <span aria-hidden>·</span>
              <span className="tabular-nums">
                {formatDuration(voicemail.durationSeconds)}
              </span>
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn(
            "shrink-0 capitalize",
            resolved
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
          )}
        >
          {voicemail.status}
        </Badge>
      </div>

      {/* AI transcription (below the caller info) */}
      <div className="bg-muted/40 mt-3 rounded-lg border p-2.5">
        <p className="text-muted-foreground mb-1 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
          <Sparkles className="size-3 text-violet-500" />
          AI transcription
        </p>
        <p className="text-foreground/90 text-sm">
          &ldquo;{voicemail.transcription}&rdquo;
        </p>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AudioBar
          durationSeconds={voicemail.durationSeconds}
          onPlay={() => markVoicemailPlayed(voicemail.id)}
        />
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onCallBack}
        >
          <Phone className="size-3.5" />
          Call Back
        </Button>
        {!resolved && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
            onClick={() => {
              setVoicemailStatus(voicemail.id, "resolved");
              toast.success("Voicemail marked resolved");
            }}
          >
            <CheckCircle2 className="size-3.5" />
            Mark Resolved
          </Button>
        )}
      </div>
    </div>
  );
}
