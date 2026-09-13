"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, LoaderCircle } from "lucide-react";

import { CheckedIn } from "@/components/icons/yipyy-icons";
import { Button } from "@/components/ui/button";
import { yipyyGoQueries } from "@/lib/api/yipyy-go";
import { formatDateLong } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { FormStatusChip, formChipStatusOf } from "../form-status-chip";

const ReviewDialog = dynamic(() =>
  import("./review-dialog").then((module) => module.ReviewDialog),
);

const SENT = new Set(["submitted", "approved", "completed_by_staff"]);
const CARD = "border-line bg-card shadow-card space-y-4 rounded-2xl border p-5";

// ============================================================================
// A booking’s pre-arrival forms on its page (id="yipyy-go", where the staff
// email links): each dog’s form and a way to review it or complete it, and
// what the desk recorded at check-in. Every `#yipyygo` link used to land on a
// page with no such section.
// ============================================================================
export function YipyyGoBookingCard({ bookingRef }: { bookingRef: number }) {
  const { t, fill, locale } = useStaffText("yipyyGo");
  const query = useQuery(yipyyGoQueries.booking(bookingRef));
  const [openRef, setOpenRef] = useState<number | null>(null);

  if (query.isPending) {
    return (
      <section id="yipyy-go" className={CARD}>
        <p
          role="status"
          className="text-ink-secondary flex items-center gap-2 text-[14.5px]"
        >
          <LoaderCircle
            aria-hidden
            className="size-5 animate-spin motion-reduce:animate-none"
          />
          {t("loadingForms")}
        </p>
      </section>
    );
  }
  if (query.isError) {
    return (
      <section id="yipyy-go" className={CARD}>
        <p className="text-destructive flex items-center gap-2 text-[14.5px] font-medium">
          <CircleAlert aria-hidden className="size-5" />
          {t("formsFailed")}
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          {t("loadFormsAgain")}
        </Button>
      </section>
    );
  }

  const data = query.data;
  if (!data.requirement && !data.pets.some((pet) => pet.submission))
    return null;
  const required = data.requirement === "mandatory";
  // Null where the facility asks no form: a dog then reads by what was sent.
  const asked = data.requirement ? required : null;
  const done = data.pets.filter((pet) =>
    SENT.has(pet.submission?.status ?? ""),
  ).length;
  const reviewing = data.pets.find((pet) => pet.ref === openRef);
  const nameOf = (ref: number | null) =>
    data.pets.find((pet) => pet.ref === ref)?.name ?? "";

  return (
    <section id="yipyy-go" aria-labelledby="yipyy-go-title" className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="yipyy-go-title" className="text-heading text-[17px] font-bold">
          {t("cardTitle")}
        </h2>
        <p className="text-ink-secondary text-[13.5px] tabular-nums">
          {fill("cardProgress", { done, total: data.pets.length })}
        </p>
      </div>

      <ul className="divide-line divide-y">
        {data.pets.map((pet) => {
          const sent = Boolean(
            pet.submission && pet.submission.status !== "draft",
          );
          return (
            <li
              key={pet.ref}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 space-y-1.5">
                <p className="text-body-ink text-[15px] font-semibold">
                  {pet.name}
                </p>
                <FormStatusChip
                  status={formChipStatusOf(pet.submission, asked)}
                  mandatory={required}
                />
              </div>
              <Button variant="outline" onClick={() => setOpenRef(pet.ref)}>
                {fill(sent ? "reviewPet" : "completePet", { pet: pet.name })}
              </Button>
            </li>
          );
        })}
      </ul>

      {data.deskChecks.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
            {t("deskTitle")}
          </h3>
          <ul className="text-body-ink space-y-1 text-[14.5px]">
            {data.deskChecks.map((check) => (
              <li
                key={`${check.petRef}-${check.createdAt}`}
                className="flex items-start gap-2"
              >
                <CheckedIn
                  aria-hidden
                  className="text-ink-secondary mt-0.5 size-5 shrink-0"
                />
                <span className="min-w-0">
                  {[
                    nameOf(check.petRef),
                    fill("deskLine", {
                      date: formatDateLong(check.createdAt, locale),
                      name: check.recordedByName ?? "—",
                    }),
                    check.overrideReason
                      ? fill("deskOverride", { reason: check.overrideReason })
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviewing && (
        <ReviewDialog
          open
          onOpenChange={(next) => {
            if (!next) setOpenRef(null);
          }}
          bookingRef={bookingRef}
          pet={reviewing}
          template={data.template}
          required={asked}
        />
      )}
    </section>
  );
}
