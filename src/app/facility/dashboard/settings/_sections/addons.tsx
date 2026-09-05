"use client";

import dynamic from "next/dynamic";

const AddOnsSettings = dynamic(
  () =>
    import("@/components/facility/AddOnsSettings").then(
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
