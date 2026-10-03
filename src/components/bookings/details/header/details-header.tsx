"use client";

import {
  useBookingActionLabel,
  type BookingActionHandlers,
} from "@/components/bookings/booking-actions/BookingActionBar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  alertsFor,
  allergiesOf,
  detailSteps,
  moreMenu,
  pillTone,
  primaryFor,
  type DetailStep,
} from "@/lib/bookings/details/service-view";
import { statusLabel } from "@/lib/i18n/labels";
import { describeVaccineGaps } from "@/lib/bookings/use-vaccine-gaps";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

import type { BookingDetails } from "../use-booking-details";
import type { ServiceFacts } from "../use-service-facts";
import { DetailsAlerts } from "./details-alerts";
import { DetailsMoreMenu } from "./details-more-menu";
import { DetailsStepper } from "./details-stepper";
import { useWhenAndMeta } from "./use-when-and-meta";

// ============================================================================
// The booking's header card, as the mock draws it: the pet in its service's
// ring, its name, the service and where the booking stands; when it is and the
// rest of it in a line; the next step as the one blue button, then Edit, Add
// item and More; the path below, and the chips that need noticing.
// ============================================================================

const STEP_KEY: Record<DetailStep, string> = {
  confirmed: "stepConfirmed",
  booked: "stepBooked",
  checkedIn: "stepCheckedIn",
  checkedOut: "stepCheckedOut",
  inGrooming: "stepInGrooming",
  readyForPickup: "stepReadyForPickup",
  completed: "stepCompleted",
  sessionComplete: "stepSessionComplete",
};

const PILL_TONE = {
  live: "accent",
  done: "success",
  waiting: "warning",
  stopped: "bd-danger",
  neutral: "neutral",
} as const;

export function DetailsHeader({
  d,
  facts,
  handlers,
  onEarlyCheckout,
  canEarlyCheckout,
  onTags,
  flags,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
  handlers: BookingActionHandlers;
  onEarlyCheckout: () => void;
  canEarlyCheckout: boolean;
  onTags: () => void;
  /** The pet's own warnings, as alerts: a groom's behaviour, a trainer's note. */
  flags: { text: string; tone: "red" | "amber" | "neutral" }[];
}) {
  const { t, fill, locale } = d.text;
  const actionLabel = useBookingActionLabel(d.petLabel);
  const { fill: actFill } = useStaffText("bookingActions");
  const { when, meta } = useWhenAndMeta(d, facts);
  const booking = d.booking;
  if (!booking) return null;

  const steps = detailSteps(d.kind);
  const step = d.step;
  const tone = pillTone(step, booking.status);
  const pill =
    step && step.index >= 0
      ? t(STEP_KEY[steps[step.index]])
      : statusLabel(locale, booking.status);

  const primary = primaryFor(d.kind, booking, d.actions);
  const primaryLabel = (() => {
    if (!primary) return "";
    if (d.kind === "grooming") {
      if (primary === "mark_in_progress") return t("primaryStartGrooming");
      if (primary === "mark_ready") return t("primaryReadyForPickup");
      if (primary === "check_out") return t("primaryComplete");
    }
    if (d.kind === "training" && primary === "check_out") {
      return t("primaryCompleteSession");
    }
    return actionLabel(primary);
  })();
  const has = (id: string) => d.actions.some((a) => a.id === id);

  const groups = moreMenu(d.kind, d.actions, {
    primary,
    canPrintCareSheet: Boolean(handlers.onPrintCareSheet),
    canEarlyCheckout,
    canEmailReceipt: Boolean(handlers.onEmailReceipt),
    paymentCardShown: d.permissions.canSeeBookingAmounts,
  });

  const alerts = alertsFor({
    allergies: d.pets.flatMap((p) => allergiesOf(p.allergies)),
    careOverdue: d.departing ? d.careStatus.pending.length : 0,
    checkoutToday:
      d.kind === "boarding" && d.departing && booking.endDate === d.logDay
        ? { time: booking.checkOutTime ?? null }
        : null,
    vaccineGaps: (() => {
      // Only while it can still matter: before the pet leaves.
      if (d.step?.done || !d.step) return null;
      const gaps = d.vaccineGaps(booking.service, d.pets);
      return gaps.length > 0
        ? describeVaccineGaps(gaps, locale, (vaccines, name) =>
            actFill("vaccineGapPet", { vaccines, pet: name }),
          )
        : null;
    })(),
    flags,
  });

  return (
    <header
      data-svc={d.kind}
      className="bg-card border-line flex flex-col gap-[18px] rounded-[24px] border px-6 py-5 shadow-(--bd-sh-card)"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <PetAvatars d={d} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em] text-(--bd-name)">
                {d.petName}
              </h1>
              <Chip tone="svc" size="bd-13">
                {d.serviceLabel}
              </Chip>
              <Chip tone={PILL_TONE[tone]} size="bd-13">
                {pill}
              </Chip>
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[14px]">
              <span className="text-ink-secondary font-medium">{when}</span>
              {meta ? <span className="text-ink-tertiary">{meta}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primary ? (
            <Button
              variant="bd-cta"
              size="bd-44-cta"
              onClick={() => handlers[primary]?.()}
            >
              {primaryLabel}
            </Button>
          ) : null}
          {has("edit") && handlers.edit ? (
            <Button variant="quiet" size="bd-44" onClick={handlers.edit}>
              {t("editBooking")}
            </Button>
          ) : null}
          {has("add_item") && handlers.add_item ? (
            <Button variant="quiet" size="bd-44" onClick={handlers.add_item}>
              {t("addItem")}
            </Button>
          ) : null}
          <DetailsMoreMenu
            groups={groups}
            handlers={handlers}
            petLabel={d.petLabel}
            t={t}
            onEarlyCheckout={onEarlyCheckout}
            onTags={onTags}
          />
        </div>
      </div>

      {step ? (
        <DetailsStepper
          labels={steps.map((s) => t(STEP_KEY[s]))}
          index={step.index}
          ariaLabel={t("stepsLabel")}
        />
      ) : null}

      <DetailsAlerts alerts={alerts} t={t} fill={fill} locale={locale} />
    </header>
  );
}

/** The pet in its service's ring — the photo when there is one, else its
 *  initial; a second pet stacked behind the first. */
function PetAvatars({ d }: { d: BookingDetails }) {
  const shown = d.pets.slice(0, 2);
  if (shown.length === 0) {
    return <Avatar initial={d.petName.slice(0, 1)} />;
  }
  return (
    <div className="flex shrink-0">
      {shown.map((pet, i) => (
        <Avatar
          key={pet.id}
          initial={pet.name.slice(0, 1)}
          src={pet.imageUrl}
          className={cn(i > 0 && "-ml-6")}
        />
      ))}
    </div>
  );
}

function Avatar({
  initial,
  src,
  className,
}: {
  initial: string;
  src?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-(--svc) bg-(--svc-soft) text-[24px] font-bold text-(--svc)",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a pet's own upload may live on any host
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initial.toUpperCase()
      )}
    </span>
  );
}
