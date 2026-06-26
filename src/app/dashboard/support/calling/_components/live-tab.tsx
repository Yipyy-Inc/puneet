"use client";

import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneMissed,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  SupportMissedCall,
  SupportQueuedCall,
} from "@/types/support-call";
import { CallerIdentity } from "./caller-identity";
import {
  MISSED_STATUS_META,
  formatMinutesAgo,
  formatWait,
} from "./support-calling-utils";

interface LiveTabProps {
  queue: SupportQueuedCall[];
  missed: SupportMissedCall[];
  waitTick: number;
  onAnswer: (call: SupportQueuedCall) => void;
  onCallBack: (call: SupportMissedCall) => void;
  onMarkHandled: (call: SupportMissedCall) => void;
}

export function LiveTab({
  queue,
  missed,
  waitTick,
  onAnswer,
  onCallBack,
  onMarkHandled,
}: LiveTabProps) {
  return (
    <div className="space-y-6">
      {queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <PhoneCall className="size-4" />
              </span>
              Call Queue
              <Badge variant="secondary">{queue.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <PhoneCall className="size-4 animate-pulse" />
                  </span>
                  <CallerIdentity number={c.callerNumber} />
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 tabular-nums dark:text-amber-400">
                    <Clock className="size-3.5" />
                    {formatWait(c.waitSeconds + waitTick)}
                  </span>
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => onAnswer(c)}
                  >
                    <PhoneCall className="mr-2 size-4" />
                    Answer
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <PhoneMissed className="size-4" />
            </span>
            Unanswered Calls
            <Badge variant="secondary">{missed.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {missed.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
              No unanswered calls — you&apos;re all caught up.
            </p>
          ) : (
            missed.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                    <PhoneMissed className="size-4" />
                  </span>
                  <CallerIdentity number={m.callerNumber} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatMinutesAgo(m.minutesAgo)}
                  </span>
                  {m.autoSmsSent && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-sky-500/20 bg-sky-500/10 text-[10px] text-sky-600 dark:text-sky-300"
                    >
                      <MessageSquare className="size-2.5" />
                      Auto-SMS sent
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(MISSED_STATUS_META[m.status].className)}
                  >
                    {MISSED_STATUS_META[m.status].label}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCallBack(m)}
                  >
                    <Phone className="mr-1.5 size-3.5" />
                    Call Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkHandled(m)}
                  >
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    Mark as Handled
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
