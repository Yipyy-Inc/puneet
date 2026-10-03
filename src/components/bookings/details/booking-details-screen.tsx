"use client";

import { CircleAlert, CircleHelp } from "lucide-react";
import { useState } from "react";

import { AccessRestricted } from "@/components/employee/AccessRestricted";
import { LookScope } from "@/components/look/look-context";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DetailTab } from "@/lib/bookings/details/service-view";
import { formatBookingRef } from "@/lib/booking-id";

import { BookingDialogs } from "./booking-dialogs";
import { ClientCard } from "./client-card";
import { DetailsHeader } from "./header/details-header";
import { DetailsTopLine } from "./header/details-top-line";
import { JournalTab } from "./journal/journal-tab";
import { DetailsNotices } from "./details-notices";
import { NotesTab } from "./notes-tab";
import { OverviewTab } from "./overview/overview-tab";
import { PaymentCard } from "./payment-card";
import { TasksTab } from "./tasks-tab";
import { useJournalPlan } from "./journal/use-journal-plan";
import { useBookingDetails } from "./use-booking-details";
import { useBookingHandlers } from "./use-booking-handlers";
import { useBookingTill } from "./use-booking-till";
import { usePetFlags } from "./use-pet-flags";
import { usePrintBooking } from "./use-print-booking";
import { useServiceFacts } from "./use-service-facts";

// ============================================================================
// The facility booking page — the client's Booking_Details mocks (2026-10-03),
// one page in four services: Boarding, Daycare, Grooming and Training.
//
// It replaced a 2,194-line page that read and wrote everything this one does.
// The reads live in `useBookingDetails`, the till in `useBookingTill`, what
// the buttons do in `useBookingHandlers`; this file is the page's shape — the
// mock's 1280px column, the header card, the tabs on the left and the money
// and the client on the right — and its four other states.
//
// `/employee/bookings/[id]` renders this too, inside the employee shell, so
// the same permission gates apply there.
// ============================================================================

const TAB_KEY: Record<DetailTab, string> = {
  overview: "tabOverview",
  journal: "tabJournal",
  tasks: "tabTasks",
  notes: "tabNotesHistory",
};

export function BookingDetailsScreen({
  bookingRef,
  clientRef,
}: {
  bookingRef: number;
  /** The client in the URL, when there is one. The booking's own wins. */
  clientRef?: number;
}) {
  const d = useBookingDetails(bookingRef, clientRef ?? Number.NaN);
  const facts = useServiceFacts(d);
  // Today's journal rows with nothing logged — the tab's amber count.
  const journalPlan = useJournalPlan(d);
  const [tab, setTab] = useState<DetailTab>("overview");
  const till = useBookingTill(d, {
    // The care gate's "Review": the journal, at the first thing not logged.
    onReviewCare: () => {
      setTab("journal");
      requestAnimationFrame(() =>
        document
          .querySelector("[data-unlogged='true']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    },
  });
  const printBooking = usePrintBooking(d);
  const isBoarding = d.kind === "boarding";
  const h = useBookingHandlers(d, till, {
    onPrintInvoice: printBooking,
    canPrintCareSheet: isBoarding && Boolean(d.pet),
  });
  const flags = usePetFlags(d);
  const { t, fill } = d.text;

  // ── THREE ANSWERS, NOT ONE ───────────────────────────────────────────────
  // A read that FAILED is not a booking that does not exist.
  if (d.bookingQuery.error || d.clientRecord.error) {
    return (
      <RouteState
        surface="card"
        pose="error"
        icon={CircleAlert}
        inkClassName="text-destructive"
        title={t("loadFailedTitle")}
        description={t("loadFailedBody")}
        action={{
          label: t("tryAgain"),
          onClick: () => {
            if (d.bookingQuery.error) void d.bookingQuery.refetch();
            if (d.clientRecord.error) d.clientRecord.retry();
          },
        }}
      />
    );
  }

  if (d.bookingQuery.isPending || (d.booking && d.clientRecord.pending)) {
    return <DetailsSkeleton />;
  }

  if (!d.booking || !d.client) {
    return (
      <RouteState
        surface="card"
        pose="confused"
        icon={CircleHelp}
        inkClassName="text-ink-secondary"
        title={t("notFoundTitle")}
        description={fill("notFoundBody", {
          ref: formatBookingRef(bookingRef),
        })}
        action={{
          label: t("backToBookings"),
          href: d.portal.href("/facility/dashboard/bookings"),
        }}
      />
    );
  }

  // Section 8B: a scoped viewer opening a booking outside their assigned set
  // is a 403 — the branded access screen, never the record.
  if (d.assigned.assignedPending) return null;
  if (
    d.assigned.assignedStaffId &&
    !d.assigned.assignedRefs?.has(d.booking.id)
  ) {
    return <AccessRestricted />;
  }

  const booking = d.booking;
  const canEarlyCheckout =
    (d.kind === "boarding" || d.kind === "daycare") &&
    booking.status !== "cancelled" &&
    booking.status !== "completed" &&
    d.departing;
  const unlogged = journalPlan.unloggedToday;

  return (
    <LookScope name="booking-details">
      <div className="bg-ground min-h-full">
        <div className="@container mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-6 pt-5 pb-16">
          <DetailsTopLine d={d} />
          <DetailsHeader
            d={d}
            facts={facts}
            handlers={h.handlers}
            canEarlyCheckout={canEarlyCheckout}
            onEarlyCheckout={() => h.setDialog("earlyCheckout")}
            onTags={() => h.setDialog("tags")}
            flags={flags}
          />
          <DetailsNotices d={d} handlers={h.handlers} />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-5">
            <div className="col-span-full flex min-w-0 flex-col gap-4 @min-[1000px]:col-span-2">
              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as DetailTab)}
                className="gap-4"
              >
                <TabsList variant="details">
                  {d.tabs.map((name) => (
                    <TabsTrigger key={name} value={name} variant="details">
                      <span>
                        {name === "journal"
                          ? t(isBoarding ? "tabGuestJournal" : "tabDailyLog")
                          : t(TAB_KEY[name])}
                      </span>
                      {name === "journal" && unlogged > 0 ? (
                        <span className="bg-wash-warning text-warning rounded-full px-[7px] py-0.5 text-[12px] font-semibold">
                          {unlogged}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="overview" className="flex flex-col gap-4">
                  <OverviewTab
                    d={d}
                    facts={facts}
                    handlers={h.handlers}
                    openDialog={h.openDialog}
                  />
                </TabsContent>
                {d.tabs.includes("journal") ? (
                  <TabsContent value="journal">
                    <JournalTab d={d} openDialog={h.openDialog} />
                  </TabsContent>
                ) : null}
                {d.tabs.includes("tasks") ? (
                  <TabsContent value="tasks">
                    <TasksTab d={d} />
                  </TabsContent>
                ) : null}
                <TabsContent value="notes" className="flex flex-col gap-4">
                  <NotesTab d={d} />
                </TabsContent>
              </Tabs>
            </div>

            <aside className="sticky top-5 flex min-w-0 flex-col gap-4">
              {d.permissions.canSeeBookingAmounts ? (
                <PaymentCard d={d} till={till} facts={facts} />
              ) : null}
              <ClientCard d={d} />
            </aside>
          </div>
        </div>
      </div>
      <BookingDialogs d={d} facts={facts} h={h} till={till} />
    </LookScope>
  );
}

/** The page's own shape while it loads — §5s's loading cell. */
function DetailsSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-6 pt-5 pb-16"
      aria-busy="true"
    >
      <Skeleton className="h-4 w-48 rounded-full" />
      <Skeleton className="h-40 w-full rounded-[24px]" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-[24px] lg:col-span-2" />
        <Skeleton className="h-96 rounded-[24px]" />
      </div>
    </div>
  );
}
