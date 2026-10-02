"use client";

import { ClipboardCheck, Mail, MailOpen, MailX } from "lucide-react";

import { EvaluationResultChip } from "@/components/evaluations/result-chip";
import { useEvaluationCardSettings } from "@/components/evaluations/use-evaluation-card-settings";
import { useEvaluationServiceName } from "@/components/evaluations/use-evaluation-service-name";
import { Button } from "@/components/ui/button";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { shortPersonName } from "@/lib/bookings/wizard/staff-slots";
import { openState } from "@/lib/evaluations/delivery";
import type {
  EvaluationsBoard,
  QueueRow,
  SentRow,
} from "@/lib/evaluations/board-types";
import {
  formatDayRelative,
  formatList,
  formatTimeInZone,
} from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { wallClockParts } from "@/lib/time/facility-time";
import { cn } from "@/lib/utils";

// ============================================================================
// Report cards to review — the client's mock (2026-10-02): what Setup says
// happens to a finished card, the cards waiting for a reviewer, and the last
// ones sent, opened or not ("Opened · booked daycare").
// ============================================================================

export function ReviewTab({
  board,
  now,
  onReview,
  onOpen,
  onSetup,
}: {
  board: EvaluationsBoard;
  now: Date;
  onReview: (evaluationId: string) => void;
  onOpen: (evaluationId: string) => void;
  onSetup: () => void;
}) {
  const { t, fill, locale } = useStaffText("evaluations");
  const { card } = useEvaluationCardSettings();
  const serviceName = useEvaluationServiceName();

  const when = (timestamp: string) => {
    const day = wallClockParts(timestamp, board.timeZone).date;
    return fill("dayAtTime", {
      day: formatDayRelative(day, locale, board.today, "start"),
      time: formatTimeInZone(timestamp, locale, board.timeZone),
    });
  };
  const sentDay = (timestamp: string) =>
    formatDayRelative(
      wallClockParts(timestamp, board.timeZone).date,
      locale,
      board.today,
      "start",
    );

  const reviewers = formatList(
    [
      ...card.reviewerRoles.map((role) => t(`role_${role}`)),
      ...(card.evaluatorSelfSend ? [t("theEvaluator")] : []),
    ],
    locale,
    "disjunction",
  );
  const policy =
    card.deliveryMode === "auto"
      ? t("policyAuto")
      : card.deliveryMode === "autoPass"
        ? fill("policyAutoPass", { reviewers })
        : fill("policyReview", { reviewers });

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card border-line flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border px-4 py-3">
        <ClipboardCheck className="text-primary size-5 shrink-0" aria-hidden />
        <p className="text-body text-body-ink min-w-0 flex-1 text-pretty">
          {policy}
        </p>
        <Button type="button" variant="link" onClick={onSetup}>
          {t("changeDelivery")}
        </Button>
      </div>

      <section className="bg-card border-line overflow-hidden rounded-3xl border">
        <h2 className="text-section text-heading border-line border-b px-4 py-3">
          {t("waitingForReview")}
        </h2>
        {board.waiting.length === 0 ? (
          <p className="text-body text-ink-secondary px-4 py-5">
            {t("allCaughtUp")}
          </p>
        ) : (
          <ul className="divide-line divide-y">
            {board.waiting.map((row) => (
              <QueueItem
                key={row.id}
                row={row}
                when={when(row.submittedAt)}
                onReview={() => onReview(row.id)}
                onOpen={() => onOpen(row.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="bg-card border-line overflow-hidden rounded-3xl border">
        <h2 className="text-section text-heading border-line border-b px-4 py-3">
          {t("sentToOwners")}
        </h2>
        {board.sent.length === 0 ? (
          <p className="text-body text-ink-secondary px-4 py-5">
            {t("noneSent")}
          </p>
        ) : (
          <ul className="divide-line divide-y">
            {board.sent.map((row) => (
              <SentItem
                key={row.id}
                row={row}
                day={sentDay(row.sentAt)}
                now={now}
                serviceName={serviceName}
                onOpen={() => onOpen(row.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QueueItem({
  row,
  when,
  onReview,
  onOpen,
}: {
  row: QueueRow;
  when: string;
  onReview: () => void;
  onOpen: () => void;
}) {
  const { t, fill } = useStaffText("evaluations");
  return (
    <li className="flex min-h-14 min-w-0 flex-wrap items-center gap-3 px-4 py-3">
      <PetAvatar name={row.pet.name} src={row.pet.imageUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-body-strong text-body-ink truncate">
          {row.pet.name}
          <span className="text-ink-secondary font-normal">
            {" · "}
            {row.client.name}
          </span>
        </p>
        <p className="text-meta text-ink-secondary truncate">
          {fill("evaluatedBy", { name: row.evaluatorName, when })}
        </p>
      </div>
      {row.result ? <EvaluationResultChip result={row.result} /> : null}
      {row.mayReview ? (
        <Button
          type="button"
          className="yy-cta"
          onClick={onReview}
          aria-label={fill("reviewSendFor", { pet: row.pet.name })}
        >
          {t("reviewSend")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={onOpen}
          aria-label={fill("viewFor", { pet: row.pet.name })}
        >
          {t("view")}
        </Button>
      )}
    </li>
  );
}

function SentItem({
  row,
  day,
  now,
  serviceName,
  onOpen,
}: {
  row: SentRow;
  day: string;
  now: Date;
  serviceName: (service: string) => string;
  onOpen: () => void;
}) {
  const { t, fill } = useStaffText("evaluations");
  const state = openState({
    sentAt: row.sentAt,
    openedAt: row.openedAt,
    bookedService: row.bookedService,
    now,
  });
  const by = row.autoSent
    ? t("autoSent")
    : fill("reviewedBy", {
        name: shortPersonName(row.sentByName ?? t("staffMember")),
      });
  const opened =
    state.kind === "opened"
      ? state.bookedService
        ? fill("openedBooked", { service: serviceName(state.bookedService) })
        : t("opened")
      : state.kind === "delivered"
        ? t("delivered")
        : t("notOpened");
  const OpenIcon =
    state.kind === "opened"
      ? MailOpen
      : state.kind === "delivered"
        ? Mail
        : MailX;

  return (
    <li className="min-h-14">
      <button
        type="button"
        onClick={onOpen}
        className="hover:bg-surface-inset focus-visible:ring-primary/40 flex w-full min-w-0 flex-wrap items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <PetAvatar name={row.pet.name} src={row.pet.imageUrl} size="md" />
        <span className="min-w-0 flex-1">
          <span className="text-body-strong text-body-ink block truncate">
            {row.pet.name} · {row.client.name}
          </span>
          <span className="text-meta text-ink-secondary block truncate">
            {day} · {by}
          </span>
        </span>
        {row.result ? <EvaluationResultChip result={row.result} /> : null}
        <span
          className={cn(
            "text-meta inline-flex items-center gap-1.5 font-semibold",
            state.kind === "opened"
              ? "text-success"
              : state.kind === "delivered"
                ? "text-ink-secondary"
                : "text-destructive",
          )}
        >
          <OpenIcon className="size-4" aria-hidden />
          {opened}
        </span>
      </button>
    </li>
  );
}
