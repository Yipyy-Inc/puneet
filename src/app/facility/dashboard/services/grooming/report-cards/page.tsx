"use client";

import { use } from "react";

import { ReportCardsModule } from "@/components/facility/ReportCardsModule";

// `?card=` opens that card and `?visit=` starts one on that visit — how the
// booking page's "Send report card" lands here (2026-10-03).
export default function GroomingReportCardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ card?: string; visit?: string }>;
}) {
  const params = searchParams ? use(searchParams) : {};
  return (
    <ReportCardsModule
      defaultServiceType="grooming"
      initialCardId={params.card}
      initialVisitId={params.visit}
    />
  );
}
