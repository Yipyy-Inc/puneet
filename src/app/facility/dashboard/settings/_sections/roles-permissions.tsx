"use client";

import dynamic from "next/dynamic";

// ssr: false, as it was on the switchboard — this reads a client store and
// cannot render on the server.
const FacilityRolesStudio = dynamic(
  () =>
    import("@/components/facility/FacilityRolesStudio").then(
      (mod) => mod.FacilityRolesStudio,
    ),
  { ssr: false },
);

export function RolesPermissionsSection() {
  return (
    <div className="space-y-6">
      <FacilityRolesStudio />
    </div>
  );
}
