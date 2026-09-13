"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CircleAlert, Info } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingMissedSession } from "@/lib/api/mappers/training-makeups";
import {
  trainingMakeupQueries,
  useMakeupAction,
} from "@/lib/api/training-makeups";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong, formatTime } from "@/lib/i18n/format";
import { NO_ITEMS } from "@/lib/no-items";

type CustomerText = ReturnType<typeof useCustomerText>;

type Confirming = {
  kind: "ask" | "skip" | "decline";
  session: TrainingMissedSession;
} | null;

/** The Make-up sessions tab on the customer's training page — each session
 *  one of their dogs missed, and what happens next.
 *
 *  ── WHAT CHANGED (2026-09-13) ────────────────────────────────────────────
 *
 *  It was mock data end to end: an invented dog's absence, a $40 price from a
 *  fixture config, and "request" and "skip" buttons that waited a second and
 *  toasted. It reads /api/training/makeups now — the sessions the owner's
 *  dogs were booked into and never checked in to — and asking, skipping and
 *  declining are rows the facility reads. A make-up is a free seat the
 *  facility books in another class of the same course, so nothing is priced. */
export function MakeupSessionsTab() {
  const text = useCustomerText("training");
  const { t, fill } = text;
  const { data, error, isPending } = useQuery(trainingMakeupQueries.all());
  const action = useMakeupAction();
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [note, setNote] = useState("");

  function close() {
    setConfirming(null);
    setNote("");
  }

  async function confirm() {
    if (!confirming) return;
    const { kind, session } = confirming;
    try {
      if (kind === "ask") {
        await action.mutateAsync({
          bookingId: session.bookingId,
          action: "request",
          note: note.trim() || undefined,
        });
        toast.success(fill("mkAsked", { pet: session.petName }));
      } else if (kind === "skip") {
        await action.mutateAsync({
          bookingId: session.bookingId,
          action: "skip",
        });
        toast.success(
          fill("mkSkippedToast", { number: session.sessionNumber }),
        );
      } else if (session.makeup) {
        await action.mutateAsync({
          bookingId: session.bookingId,
          action: "decline",
          makeupId: session.makeup.id,
        });
        toast.success(t("mkDeclinedToast"));
      }
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const sessions = data ?? NO_ITEMS;

  return (
    <div className="space-y-6">
      <Alert>
        <Info aria-hidden className="size-4" />
        <AlertTitle>{t("mkExplainerTitle")}</AlertTitle>
        <AlertDescription>{t("mkExplainer")}</AlertDescription>
      </Alert>

      {error ? (
        // §5d2's ladder: a panel that would not load takes `error`.
        <RouteState
          surface="card"
          className="min-h-0 p-0"
          pose="error"
          icon={CircleAlert}
          inkClassName="text-destructive"
          title={t("mkLoadFailedTitle")}
          description={t("mkLoadFailed")}
        />
      ) : isPending ? (
        <div className="space-y-3" aria-busy>
          <span className="sr-only">{t("mkLoading")}</span>
          <Skeleton className="h-32 rounded-2xl motion-reduce:animate-none" />
        </div>
      ) : sessions.length === 0 ? (
        // Never had data: training's pose is `idea` (§5d2).
        <RouteState
          surface="card"
          className="min-h-0 p-0"
          pose="idea"
          icon={CalendarCheck}
          inkClassName="text-ink-secondary"
          title={t("noMissedSessions")}
          description={t("allYourTrainingSessionsHave")}
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <MissedSessionCard
              key={session.bookingId}
              session={session}
              text={text}
              onAsk={() => setConfirming({ kind: "ask", session })}
              onSkip={() => setConfirming({ kind: "skip", session })}
              onDecline={() => setConfirming({ kind: "decline", session })}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        confirming={confirming}
        note={note}
        onNoteChange={setNote}
        busy={action.isPending}
        text={text}
        onCancel={close}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}

function MissedSessionCard({
  session,
  text,
  onAsk,
  onSkip,
  onDecline,
}: {
  session: TrainingMissedSession;
  text: CustomerText;
  onAsk: () => void;
  onSkip: () => void;
  onDecline: () => void;
}) {
  const { t, fill, locale } = text;
  const makeup = session.makeup;
  const status = makeup?.status;
  const seat = status === "offered" ? makeup?.seat : null;

  const line =
    status === "requested"
      ? t("mkRequested")
      : status === "offered" && seat?.startAt
        ? fill("mkOffered", {
            pet: session.petName,
            number: seat.sessionNumber ?? "",
            series: seat.seriesName ?? "",
            date: formatDateLong(seat.startAt, locale),
            time: formatTime(seat.startAt, locale),
          })
        : status === "declined"
          ? t("mkDeclined")
          : status === "skipped"
            ? t("mkSkipped")
            : status === "ineligible"
              ? makeup?.ineligibleReason
                ? fill("mkIneligibleReason", {
                    reason: makeup.ineligibleReason,
                  })
                : t("mkIneligible")
              : t("mkNone");

  const canAsk = !status || status === "declined" || status === "skipped";
  const canSkip = !status || status === "requested" || status === "declined";

  return (
    <li className="bg-card border-line shadow-card space-y-3 rounded-2xl border p-5">
      <div className="space-y-1">
        <p className="text-body-strong text-body-ink">{session.petName}</p>
        <p className="text-meta text-ink-secondary">
          {fill("mkMissed", {
            number: session.sessionNumber,
            series: session.seriesName,
            date: formatDateLong(session.sessionStartAt, locale),
          })}
        </p>
      </div>
      <p className="text-body text-body-ink">{line}</p>
      {canAsk || canSkip || status === "offered" ? (
        <div className="flex flex-wrap gap-2">
          {canAsk ? (
            <Button onClick={onAsk}>
              {fill("mkAsk", { pet: session.petName })}
            </Button>
          ) : null}
          {canSkip ? (
            <Button variant="outline" onClick={onSkip}>
              {fill("mkSkip", { number: session.sessionNumber })}
            </Button>
          ) : null}
          {status === "offered" ? (
            <Button variant="outline" onClick={onDecline}>
              {t("mkDecline")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function ConfirmDialog({
  confirming,
  note,
  onNoteChange,
  busy,
  text,
  onCancel,
  onConfirm,
}: {
  confirming: Confirming;
  note: string;
  onNoteChange: (note: string) => void;
  busy: boolean;
  text: CustomerText;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t, fill, locale } = text;
  const session = confirming?.session;
  const seat = session?.makeup?.seat;

  return (
    <Dialog
      open={confirming !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {confirming && session ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {confirming.kind === "ask"
                  ? fill("mkAskTitle", { pet: session.petName })
                  : confirming.kind === "skip"
                    ? fill("mkSkipTitle", {
                        number: session.sessionNumber,
                        series: session.seriesName,
                      })
                    : fill("mkDeclineTitle", { pet: session.petName })}
              </DialogTitle>
              <DialogDescription>
                {confirming.kind === "ask"
                  ? fill("mkAskBody", { course: session.courseName })
                  : confirming.kind === "skip"
                    ? fill("mkSkipBody", { pet: session.petName })
                    : fill("mkDeclineBody", {
                        number: seat?.sessionNumber ?? "",
                        series: seat?.seriesName ?? "",
                        date: seat?.startAt
                          ? formatDateLong(seat.startAt, locale)
                          : "",
                      })}
              </DialogDescription>
            </DialogHeader>
            {confirming.kind === "ask" ? (
              <div className="space-y-2">
                <Label htmlFor="makeup-request-note">{t("mkNoteLabel")}</Label>
                <Textarea
                  id="makeup-request-note"
                  rows={3}
                  maxLength={1000}
                  value={note}
                  onChange={(event) => onNoteChange(event.target.value)}
                />
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={onCancel}>
                {t("cancel")}
              </Button>
              <Button onClick={onConfirm} loading={busy}>
                {confirming.kind === "ask"
                  ? t("mkSendAsk")
                  : confirming.kind === "skip"
                    ? t("mkConfirmSkip")
                    : t("mkConfirmDecline")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
