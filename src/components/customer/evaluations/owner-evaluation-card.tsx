"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { EvaluationReportCard } from "@/components/evaluations/card/evaluation-report-card";
import { useEvaluationServiceName } from "@/components/evaluations/use-evaluation-service-name";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { useOwnerEvaluationCard } from "@/lib/api/customer-evaluations";
import { useCustomerText } from "@/lib/customer/use-customer-text";

// ============================================================================
// An evaluation report card, as its owner opens it from the email, the text
// or their report cards (the client's mock, 2026-10-02): the same card staff
// saw in the preview, with its one button — book the first day, book a
// re-evaluation, or write to the facility.
// ============================================================================

export function OwnerEvaluationCard({ id }: { id: string }) {
  const { t } = useCustomerText("evaluations");
  const serviceName = useEvaluationServiceName();
  const card = useOwnerEvaluationCard(id);

  return (
    <div className="mx-auto flex w-full max-w-[520px] min-w-0 flex-col gap-4 p-4 md:p-6">
      <Button asChild variant="ghost" className="self-start">
        <Link href="/customer/report-cards">
          <ChevronLeft aria-hidden />
          {t("back")}
        </Link>
      </Button>

      {card.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : !card.data ? (
        <div className="bg-card border-line rounded-3xl border">
          <TableEmptyState
            pose="searching"
            title={t("notFoundTitle")}
            description={t("notFoundBody")}
          />
        </div>
      ) : (
        <div className="border-line bg-ground overflow-hidden rounded-3xl border">
          <h1 className="sr-only">{t("title")}</h1>
          <EvaluationReportCard
            serviceName={serviceName}
            ctaHref={(kind) =>
              kind === "first_day"
                ? `/customer/bookings/new?service=${encodeURIComponent(
                    card.data.approvedServices[0] ?? "daycare",
                  )}`
                : kind === "reevaluation"
                  ? "/customer/bookings/new?service=evaluation"
                  : "/customer/messages"
            }
            card={{
              facilityName: card.data.facility.name,
              facilityLogoUrl: card.data.facility.logoUrl,
              petName: card.data.pet.name,
              petBreed: card.data.pet.breed,
              petSex: card.data.pet.sex,
              ownerName: card.data.ownerName,
              evaluatorName: card.data.evaluatorName,
              result: card.data.result,
              answers: card.data.answers,
              strengths: card.data.strengths,
              watchFor: card.data.watchFor,
              customQuestions: card.data.customQuestions.map((question) => ({
                ...question,
                onCard: true,
              })),
              ownerNote: card.data.ownerNote,
              internalNote: card.data.internalNote,
              approvedServices: card.data.approvedServices,
              photoUrl: card.data.photoUrl,
              date:
                card.data.completedAt ??
                card.data.sentAt ??
                new Date().toISOString(),
              options: {
                theme: card.data.theme,
                includePhoto: Boolean(card.data.photoUrl),
                bookFirstVisitButton: card.data.bookFirstVisitButton,
                hideInternal: card.data.hideInternal,
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
