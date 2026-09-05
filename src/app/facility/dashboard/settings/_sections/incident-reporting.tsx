"use client";

import dynamic from "next/dynamic";

const IncidentReportingSettings = dynamic(
  () =>
    import("@/components/facility/IncidentReportingSettings").then(
      (mod) => mod.IncidentReportingSettings,
    ),
  { ssr: false },
);

export function IncidentReportingSection() {
  return (
    <div className="space-y-6">
      <IncidentReportingSettings />
    </div>
  );
}
