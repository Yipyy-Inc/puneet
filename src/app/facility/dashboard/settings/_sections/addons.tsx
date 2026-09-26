"use client";

import dynamic from "next/dynamic";

// Settings > Services > Add-ons: the one add-ons list (20260926223644).
const AddOnsSettings = dynamic(
  () =>
    import("@/components/facility/add-ons/add-ons-settings").then(
      (mod) => mod.AddOnsSettings,
    ),
  { ssr: false },
);

export function AddonsSection() {
  return (
    <div className="space-y-6">
      <AddOnsSettings />
    </div>
  );
}
