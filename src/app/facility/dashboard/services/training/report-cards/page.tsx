"use client";

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

export default function TrainingReportCardsPage() {
  return <ReportCardsModule defaultServiceType="training" />;
}
