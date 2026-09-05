"use client";

import dynamic from "next/dynamic";

// ssr: false, as it was on the switchboard — this reads a client store and
// cannot render on the server.
const WeatherWarningSettings = dynamic(
  () =>
    import("@/components/facility/WeatherWarningSettings").then(
      (mod) => mod.WeatherWarningSettings,
    ),
  { ssr: false },
);

export function WeatherSection() {
  return (
    <div className="space-y-6">
      <WeatherWarningSettings />
    </div>
  );
}
