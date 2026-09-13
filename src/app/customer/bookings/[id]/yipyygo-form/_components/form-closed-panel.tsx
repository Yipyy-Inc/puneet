"use client";

import Link from "next/link";
import { CircleAlert, CircleCheck, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RouteState } from "@/components/ui/route-state";
import { AnswersSummary } from "@/components/yipyygo/form-sections/AnswersSummary";
import type {
  CustomerYipyyGoBooking,
  CustomerYipyyGoPet,
} from "@/lib/api/customer-yipyy-go";
import type { YipyyGoSubmissionStatus } from "@/lib/api/mappers/yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong, formatTime } from "@/lib/i18n/format";
import {
  sectionFormFromAnswers,
  yipyyGoFormSteps,
} from "@/lib/yipyy-go/owner-form";
import { customQuestionsOf } from "@/lib/yipyy-go/validate";

import { PetTabs } from "./pet-tabs";

const CHIPS: Record<
  Exclude<YipyyGoSubmissionStatus, "draft">,
  { variant: "confirmed" | "overdue"; icon: typeof CircleCheck; key: string }
> = {
  submitted: { variant: "confirmed", icon: CircleCheck, key: "chipSent" },
  changes_requested: {
    variant: "overdue",
    icon: CircleAlert,
    key: "chipChangesRequested",
  },
  approved: { variant: "confirmed", icon: CircleCheck, key: "chipReviewed" },
  completed_by_staff: {
    variant: "confirmed",
    icon: CircleCheck,
    key: "chipCompleted",
  },
};

// A pet's form that can no longer change — the deadline passed, the facility
// reviewed it, or the stay has begun. The server decides that
// (yipyy_go_form_state); this says why, in the owner's terms, and shows what
// was sent. The old page decided it in the browser, a day early in Canada,
// and skipped the check entirely in development.
export function FormClosedPanel({
  data,
  pet,
  fetchedAt,
  onSelectPet,
}: {
  data: CustomerYipyyGoBooking;
  pet: CustomerYipyyGoPet;
  /** When the server said so — the moment the deadline is measured against. */
  fetchedAt: number;
  onSelectPet: (ref: number) => void;
}) {
  const { t, fill, locale } = useCustomerText("yipyygo");
  const submission = pet.submission;
  const deadline = data.deadline ? new Date(data.deadline) : null;
  const reason =
    submission?.status === "approved"
      ? t("closedReviewed")
      : submission?.status === "completed_by_staff"
        ? t("closedCompleted")
        : deadline && deadline.getTime() <= fetchedAt
          ? fill("closedDeadline", {
              date: formatDateLong(deadline, locale),
              time: formatTime(deadline, locale),
            })
          : t("closedOther");
  const bookingHref = `/customer/bookings/${data.booking.ref}`;
  const tabs = (
    <PetTabs pets={data.pets} currentRef={pet.ref} onSelect={onSelectPet} />
  );

  if (!submission || submission.status === "draft") {
    return (
      <div className="space-y-6">
        {tabs}
        <RouteState
          surface="card"
          pose="sleeping"
          icon={Lock}
          inkClassName="text-ink-secondary"
          title={fill("closedTitle", { pet: pet.name })}
          description={reason}
          action={{ label: t("backToBooking"), href: bookingHref }}
          className="min-h-0 p-0"
        />
      </div>
    );
  }

  const chip = CHIPS[submission.status];
  const ChipIcon = chip.icon;
  const steps = yipyyGoFormSteps(data.template, { contact: false, pet: false });

  return (
    <div className="space-y-6">
      {tabs}
      <section
        aria-labelledby="yipyy-go-what-you-sent"
        className="border-line bg-card shadow-card space-y-5 rounded-2xl border p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="yipyy-go-what-you-sent"
            className="text-heading text-[17px] font-bold"
          >
            {t("whatYouSent")}
          </h2>
          <Badge variant={chip.variant}>
            <ChipIcon aria-hidden />
            {t(chip.key)}
          </Badge>
        </div>
        <p className="text-body-ink text-[14.5px]">{reason}</p>
        <AnswersSummary
          formData={sectionFormFromAnswers(submission.answers, pet.name)}
          questions={customQuestionsOf(data.template)}
          customAnswers={submission.answers.customAnswers ?? {}}
          show={{
            feeding: steps.includes("feeding"),
            medications: steps.includes("medications"),
            behavior: steps.includes("behavior"),
          }}
        />
        <Button variant="outline" asChild>
          <Link href={bookingHref}>{t("backToBooking")}</Link>
        </Button>
      </section>
    </div>
  );
}
