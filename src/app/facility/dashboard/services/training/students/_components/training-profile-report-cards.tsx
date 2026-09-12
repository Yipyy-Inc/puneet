"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Clock3, FileText, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { reportCardQueries } from "@/lib/api/report-cards";
import { formatDateLong, formatTime } from "@/lib/i18n/format";
import { NO_ITEMS } from "@/lib/no-items";
import { usablePhotos } from "@/lib/report-cards/photos";
import { sectionsOf } from "@/lib/report-cards/sections";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { ReportCard } from "@/types/report-card";

/** Where a training card is written, published and discarded. */
const WRITE_HREF = "/facility/dashboard/services/training/report-cards";

type StaffText = ReturnType<typeof useStaffText>;

interface Props {
  petId: number;
  petName: string;
}

/** The Report Cards tab on a student's training profile — every training
 *  report card written for the dog, newest first, as the owner reads it.
 *
 *  ── WHAT CHANGED (2026-09-12) ────────────────────────────────────────────
 *
 *  It read `getReportCardsForPet`, cards the training fixture invented from
 *  fixture enrolments, so a real dog showed made-up progress or none at all.
 *  "Save assessment" and "Cancel schedule" rewrote the query cache and
 *  toasted, and "Send / Schedule" opened a dialog that did the same: nothing
 *  reached `report_cards`. It reads the pet's rows from /api/report-cards now
 *  — the cards the client file and the owner's portal show — and sends the
 *  trainer to Report cards, the screen with the real writes, to write,
 *  publish or discard one. The empty state no longer says a card is drafted
 *  after every session, because nothing drafts one. */
export function TrainingProfileReportCards({ petId, petName }: Props) {
  const text = useStaffText("trainingReportCards");
  const { t, fill } = text;
  const { data, error, isPending } = useQuery({
    ...reportCardQueries.byPet(petId),
    enabled: petId > 0,
  });
  const loading = isPending && petId > 0;

  // The route narrows to this pet; the service is narrowed here, because the
  // dog's daycare or grooming card is not a training record.
  const cards = (data ?? NO_ITEMS).filter(
    (card) => card.serviceType === "training",
  );

  return (
    <section className="space-y-3" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-heading text-section">{t("title")}</h2>
          <p className="text-ink-secondary text-meta mt-1">
            {fill("subtitle", { pet: petName })}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={WRITE_HREF}>
            <Plus aria-hidden />
            {t("write")}
          </Link>
        </Button>
      </div>

      {error ? (
        // §5d2's ladder: a panel that would not load takes `error`.
        <RouteState
          surface="card"
          className="min-h-0 p-0"
          pose="error"
          icon={CircleAlert}
          inkClassName="text-destructive"
          title={t("loadFailedTitle")}
          description={t("loadFailed")}
        />
      ) : loading ? (
        <div className="space-y-3">
          <span className="sr-only">{t("loading")}</span>
          <Skeleton className="h-40 rounded-2xl motion-reduce:animate-none" />
          <Skeleton className="h-40 rounded-2xl motion-reduce:animate-none" />
        </div>
      ) : cards.length === 0 ? (
        // Never had data: the module's pose, and training's is `idea` (§5d2).
        <RouteState
          surface="card"
          className="min-h-0 p-0"
          pose="idea"
          icon={FileText}
          inkClassName="text-ink-secondary"
          title={fill("emptyTitle", { pet: petName })}
          description={t("emptyBody")}
        />
      ) : (
        <ul aria-label={t("title")} className="space-y-3">
          {cards.map((card) => (
            <ReportCardItem
              key={card.id}
              card={card}
              petName={petName}
              text={text}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReportCardItem({
  card,
  petName,
  text,
}: {
  card: ReportCard;
  petName: string;
  text: StaffText;
}) {
  const { t, fill, locale } = text;
  const sections = sectionsOf(card);
  const photos = usablePhotos(card.photos);

  return (
    <li className="border-line bg-card shadow-card rounded-2xl border p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body-ink text-body-strong">
            {formatDateLong(card.visitDate, locale)}
          </h3>
          <p className="text-ink-tertiary text-meta mt-0.5">
            {deliveryLine(card, text)}
          </p>
        </div>
        <DeliveryChip status={card.deliveryStatus} t={t} />
      </div>

      {sections.length > 0 ? (
        <dl className="mt-4 space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="min-w-0">
              <dt className="text-ink-tertiary text-micro uppercase">
                {t(`section_${section.id}`)}
              </dt>
              {/* The facility's own words, so never through the locale layer. */}
              <dd className="text-body-ink text-body mt-1 wrap-break-word whitespace-pre-line">
                {section.body}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-ink-tertiary text-meta mt-4">{t("noWriteUp")}</p>
      )}

      {photos.length > 0 && (
        <ul
          aria-label={fill("photos", { count: photos.length })}
          className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,7.5rem),1fr))] gap-2"
        >
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="relative aspect-square max-w-full overflow-hidden rounded-md"
            >
              <Image
                src={photo.url}
                alt={
                  photo.caption ??
                  fill("photoAlt", { pet: petName, n: index + 1 })
                }
                fill
                sizes="(max-width: 600px) 50vw, 160px"
                className="object-cover"
                unoptimized
              />
            </li>
          ))}
        </ul>
      )}

      {(card.ratingStars != null || card.replyMessage) && (
        <div className="border-line mt-4 space-y-2 border-t pt-4">
          {card.ratingStars != null && (
            <p className="text-ink-secondary text-meta">
              {fill("rated", { stars: card.ratingStars })}
            </p>
          )}
          {card.ratingComment && (
            <p className="text-body-ink text-body wrap-break-word whitespace-pre-line">
              {card.ratingComment}
            </p>
          )}
          {card.replyMessage && (
            <div className="min-w-0">
              <p className="text-ink-tertiary text-micro uppercase">
                {t("ownerReply")}
              </p>
              <p className="text-body-ink text-body mt-1 wrap-break-word whitespace-pre-line">
                {card.replyMessage}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** When it went out and whether it was read — or that it has not gone yet.
 *  "Sent" means published to the owner's portal; nothing emails a card. */
function deliveryLine(card: ReportCard, { t, fill, locale }: StaffText) {
  if (card.deliveryStatus === "sent") {
    const sent = card.sentAt
      ? fill("sentOn", { date: formatDateLong(card.sentAt, locale) })
      : t("sent");
    const opened = card.viewedAt
      ? fill("openedOn", { date: formatDateLong(card.viewedAt, locale) })
      : t("notOpened");
    return `${sent} · ${opened}`;
  }
  if (card.deliveryStatus === "scheduled" && card.scheduledFor) {
    return fill("publishes", {
      date: formatDateLong(card.scheduledFor, locale),
      time: formatTime(card.scheduledFor, locale),
    });
  }
  return t("notSent");
}

/** §3: ink, glyph and word together, paired as StatusBadge pairs them —
 *  a card still to go out is pending, a sent one confirmed. */
function DeliveryChip({
  status,
  t,
}: {
  status: ReportCard["deliveryStatus"];
  t: StaffText["t"];
}) {
  if (status === "sent") {
    return (
      <Badge variant="confirmed">
        <CircleCheck aria-hidden />
        {t("sent")}
      </Badge>
    );
  }
  return (
    <Badge variant="pending">
      <Clock3 aria-hidden />
      {t(status === "scheduled" ? "scheduled" : "draft")}
    </Badge>
  );
}
