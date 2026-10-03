"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  List,
  ListChecks,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { LookScope } from "@/components/look/look-context";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SavedViews } from "@/components/ui/saved-views";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useEvaluationsBoard, useStartEvaluation } from "@/lib/api/evaluations";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { AllTab } from "./all-tab";
import { ReviewTab } from "./review-tab";
import { SetupTab } from "./setup-tab";
import { TodayTab } from "./today-tab";

const EvaluatorDialog = dynamic(() =>
  import("@/components/evaluations/evaluator/evaluator-dialog").then(
    (m) => m.EvaluatorDialog,
  ),
);
const ReviewDialog = dynamic(() =>
  import("@/components/evaluations/review/review-dialog").then(
    (m) => m.ReviewDialog,
  ),
);

// ============================================================================
// Operations › Evaluations — the client's mock (2026-10-02). Four tabs, kept
// in the address (`?tab=`) so Setup can be linked to from Settings and a tab
// survives a reload; the calendar's `?bookingId=<number>` lights up that
// booking's card on Today.
//
//   Today                    who is being evaluated today, and Start
//   Report cards to review   finished cards waiting, and the ones sent
//   All evaluations          every evaluation and every one booked
//   Setup                    delivery, reviewers, the form, the theme
// ============================================================================

const TABS = ["today", "review", "all", "setup"] as const;
type Tab = (typeof TABS)[number];

export function EvaluationsModule() {
  const { t } = useStaffText("evaluations");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? "")
    ? (requested as Tab)
    : "today";
  const highlightRef = Number(searchParams.get("bookingId")) || null;
  const mayChangeSetup = usePermission("settings_general");

  const board = useEvaluationsBoard();
  const start = useStartEvaluation();
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  // "Delivered" turns to "Not opened" by the clock; read it once a minute.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // The calendar's link: bring that booking's card into view.
  useEffect(() => {
    if (!highlightRef || !board.data) return;
    const visit = board.data.visits.find((v) => v.bookingRef === highlightRef);
    if (!visit) return;
    document
      .getElementById(`evaluation-visit-${visit.bookingRef}-${visit.pet.ref}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightRef, board.data]);

  const goTo = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "today") params.delete("tab");
    else params.set("tab", next);
    params.delete("bookingId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const startEvaluation = (bookingId: string, petId: string) => {
    const key = `${bookingId}:${petId}`;
    setStartingKey(key);
    start.mutate(
      { bookingId, petId },
      {
        onSuccess: ({ id }) => setOpenId(id),
        onError: (error) =>
          toast.error(t("startFailed"), { description: error.message }),
        onSettled: () => setStartingKey(null),
      },
    );
  };

  const data = board.data;

  return (
    <LookScope name="eval-module">
      <div className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-ink-tertiary text-[11px] font-semibold tracking-[0.08em] uppercase">
            {t("eyebrow")}
          </p>
          <PageHeader
            title={t("title")}
            description={t("subtitle")}
            secondary={
              tab === "setup" ? null : (
                <Button
                  type="button"
                  variant="quiet"
                  size="mock-42"
                  className="gap-1.5 font-semibold"
                  onClick={() => goTo("setup")}
                >
                  <SlidersHorizontal aria-hidden className="size-[18px]" />
                  {t("tabSetup")}
                </Button>
              )
            }
          />
        </div>

        <SavedViews
          variant="pills"
          activeKey={tab}
          onSelect={(key) => goTo(key as Tab)}
          className="border-line mb-0.5 border-b"
          views={[
            {
              key: "today",
              label: t("tabToday"),
              icon: CalendarDays,
              count: data?.visits.length,
            },
            {
              key: "review",
              label: t("tabReview"),
              icon: ListChecks,
              count: data?.waiting.length,
              countTone: "error",
            },
            {
              key: "all",
              label: t("tabAll"),
              icon: List,
              count: data?.all.length,
            },
            { key: "setup", label: t("tabSetup"), icon: SlidersHorizontal },
          ]}
        />

        {tab === "setup" ? (
          <SetupTab mayChange={mayChangeSetup} />
        ) : board.isPending ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-56 rounded-3xl" />
          </div>
        ) : !data ? (
          <div className="bg-card border-line flex flex-wrap items-center gap-3 rounded-[20px] border p-5">
            <p className="text-body-ink min-w-0 flex-1 text-[14px]">
              {t("loadFailed")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void board.refetch()}
            >
              {t("tryAgain")}
            </Button>
          </div>
        ) : tab === "today" ? (
          <TodayTab
            board={data}
            highlightRef={highlightRef}
            startingKey={startingKey}
            onStart={startEvaluation}
            onOpen={setOpenId}
          />
        ) : tab === "review" ? (
          <ReviewTab
            board={data}
            now={now}
            onReview={setReviewId}
            onOpen={setOpenId}
            onSetup={() => goTo("setup")}
          />
        ) : (
          <AllTab board={data} onOpen={setOpenId} />
        )}

        {openId ? (
          <EvaluatorDialog
            evaluationId={openId}
            onOpenChange={(open) => !open && setOpenId(null)}
          />
        ) : null}
        {reviewId ? (
          <ReviewDialog
            evaluationId={reviewId}
            onOpenChange={(open) => !open && setReviewId(null)}
          />
        ) : null}
      </div>
    </LookScope>
  );
}
