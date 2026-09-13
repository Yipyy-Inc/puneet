"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, ClipboardList, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FormStatusChip,
  formChipStatusOf,
} from "@/components/yipyygo/form-status-chip";
import { FormAnswers } from "@/components/yipyygo/staff/form-answers";
import { yipyyGoQueries } from "@/lib/api/yipyy-go";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// A groom’s pre-arrival form, as the groomer reads it before the dog arrives
// (§3, §5s): where it stands, and each answer and photo, from the booking’s
// own form (/api/yipyy-go/bookings/[ref]).
//
// The block this replaces read `appointment.expressCheckinSubmission`, which
// the appointment mapper never fills, so every real appointment said “Form
// pending” and a sent form was never shown.
//
// Someone who may not read the booking’s forms is answered 404, as for a
// booking that does not exist. There is nothing for them to act on, so the
// section is left out rather than shown as a failure.
// ============================================================================

const HIDDEN = new Set([403, 404]);

function statusOf(error: unknown): number {
  return (error as { status?: number } | null)?.status ?? 0;
}

export function PreVisitForm({
  bookingRef,
  petRef,
}: {
  bookingRef: number;
  petRef: number;
}) {
  const { t } = useStaffText("yipyyGo");
  const valid = Number.isInteger(bookingRef) && bookingRef > 0;
  const query = useQuery({
    ...yipyyGoQueries.booking(bookingRef),
    enabled: valid,
    retry: (failures, error) => !HIDDEN.has(statusOf(error)) && failures < 2,
  });
  if (!valid || HIDDEN.has(statusOf(query.error))) return null;

  const pets = query.data?.pets ?? [];
  const pet =
    pets.find((candidate) => candidate.ref === petRef) ??
    (pets.length === 1 ? pets[0] : undefined);
  const required = query.data?.requirement === "mandatory";
  const headingId = `pre-visit-form-${bookingRef}`;

  return (
    <section
      aria-labelledby={headingId}
      className="bg-card rounded-xl border shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h3
          id={headingId}
          className="text-body-ink flex min-w-0 items-center gap-2 text-[15px] font-semibold"
        >
          <ClipboardList
            aria-hidden
            className="text-ink-secondary size-4 shrink-0"
          />
          {t("columnLabel")}
        </h3>
        {pet && (query.data?.requirement || pet.submission) && (
          <FormStatusChip
            status={formChipStatusOf(
              pet.submission,
              query.data?.requirement ? required : null,
            )}
            mandatory={required}
          />
        )}
      </div>
      <div className="px-4 py-3">
        {query.isPending ? (
          <p
            role="status"
            className="text-ink-secondary text-body flex items-center gap-2"
          >
            <LoaderCircle
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            {t("loadingForms")}
          </p>
        ) : query.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              role="alert"
              className="text-destructive text-body flex min-w-0 items-center gap-2 font-medium"
            >
              <CircleAlert aria-hidden className="size-4 shrink-0" />
              {t("formsFailed")}
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              {t("loadFormsAgain")}
            </Button>
          </div>
        ) : pet?.submission && pet.submission.status !== "draft" ? (
          <FormAnswers
            petName={pet.name}
            submission={pet.submission}
            template={query.data.template}
          />
        ) : (
          <p className="text-ink-secondary text-body">
            {query.data.requirement ? t("noFormYet") : t("formNotRequired")}
          </p>
        )}
      </div>
    </section>
  );
}
