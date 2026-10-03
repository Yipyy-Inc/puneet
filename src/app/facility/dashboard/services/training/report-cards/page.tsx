"use client";

import { use } from "react";

import { ReportCardsModule } from "@/components/facility/ReportCardsModule";

// ============================================================================
// Training report cards are the facility's report cards.
//
// This tab rendered its own screen over `trainingQueries.allReportCards()` —
// the training fixture's invented cards — and its Save and Send changed the
// query cache and nothing else. Daycare, boarding and grooming already use
// the shared module, which lists `report_cards` rows and writes new ones
// against a real visit; training bookings are visits like any other.
// ============================================================================

// `?card=` opens that card and `?visit=` starts one on that visit — how the
// booking page's "Send report card" lands here (2026-10-03).
export default function TrainingReportCardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ card?: string; visit?: string }>;
}) {
  const params = searchParams ? use(searchParams) : {};
  return (
    <ReportCardsModule
      defaultServiceType="training"
      initialCardId={params.card}
      initialVisitId={params.visit}
    />
  );
}
