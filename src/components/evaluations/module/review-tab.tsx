"use client";

import { ClipboardCheck, Mail, MailOpen, MailX } from "lucide-react";

import { EvaluationResultChip } from "@/components/evaluations/result-chip";
import { useEvaluationCardSettings } from "@/components/evaluations/use-evaluation-card-settings";
import { useEvaluationServiceName } from "@/components/evaluations/use-evaluation-service-name";
import { Button } from "@/components/ui/button";
import { PetTile } from "@/components/evaluations/pet-tile";
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
      <div className="flex min-w-0 flex-wrap items-center gap-2.5 rounded-[16px] border border-(--acc-line) bg-(--acc-pale) px-4 py-3.5">
        <ClipboardCheck className="text-primary size-5 shrink-0" aria-hidden />
        <p className="text-body-ink min-w-0 flex-1 text-[13.5px] text-pretty">
          {policy}
        </p>
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 font-semibold max-lg:h-auto"
          onClick={onSetup}
        >
          {t("changeDelivery")}
        </Button>
      </div>

      <section className="bg-card border-line overflow-hidden rounded-[20px] border">
        <h2 className="text-body-ink border-b border-(--inset-2) px-[18px] py-3.5 text-[15.5px] font-bold">
          {t("waitingForReview")}
        </h2>
        {board.waiting.length === 0 ? (
          <p className="text-ink-tertiary p-6 text-center text-[14px]">
            {t("allCaughtUp")}
          </p>
        ) : (
          <ul className="divide-y divide-(--row-line)">
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

      <section className="bg-card border-line overflow-hidden rounded-[20px] border">
        <h2 className="text-body-ink border-b border-(--inset-2) px-[18px] py-3.5 text-[15.5px] font-bold">
          {t("sentToOwners")}
        </h2>
        {board.sent.length === 0 ? (
          <p className="text-ink-tertiary p-6 text-center text-[14px]">
            {t("noneSent")}
          </p>
        ) : (
          <ul className="divide-y divide-(--row-line)">
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
    <li className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-2.5 px-[18px] py-3.5">
      <PetTile
        id={row.pet.id}
        name={row.pet.name}
        src={row.pet.imageUrl}
        size={42}
      />
      <div className="min-w-0 flex-[1_1_200px]">
        <p className="text-body-ink truncate text-[15px] font-bold">
          {row.pet.name}
          <span className="text-ink-tertiary text-[13px] font-medium">
            {" · "}
            {row.client.name}
          </span>
        </p>
        <p className="text-ink-tertiary truncate text-[12.5px]">
          {fill("evaluatedBy", { name: row.evaluatorName, when })}
        </p>
      </div>
      {row.result ? <EvaluationResultChip result={row.result} /> : null}
      {row.mayReview ? (
        <Button
          type="button"
          size="mock-38"
          className="px-4 font-bold [--sh-cta:none]"
          onClick={onReview}
          aria-label={fill("reviewSendFor", { pet: row.pet.name })}
        >
          {t("reviewSend")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="quiet"
          size="mock-38"
          className="px-4 font-bold"
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
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="hover:bg-surface-inset focus-visible:ring-primary/40 flex w-full min-w-0 flex-wrap items-center gap-x-3.5 gap-y-2.5 px-[18px] py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <PetTile
          id={row.pet.id}
          name={row.pet.name}
          src={row.pet.imageUrl}
          size={38}
        />
        <span className="min-w-0 flex-[1_1_200px]">
          <span className="text-body-ink block truncate text-[14.5px] font-semibold">
            {row.pet.name} · {row.client.name}
          </span>
          <span className="text-ink-tertiary block truncate text-[12.5px]">
            {day} · {by}
          </span>
        </span>
        {row.result ? <EvaluationResultChip result={row.result} /> : null}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[12px] font-semibold",
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
