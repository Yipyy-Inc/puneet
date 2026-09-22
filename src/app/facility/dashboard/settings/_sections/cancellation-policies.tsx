"use client";

import dynamic from "next/dynamic";

const CancellationPoliciesSettings = dynamic(
  () =>
    import("@/components/facility/CancellationPoliciesSettings").then(
      (mod) => mod.CancellationPoliciesSettings,
    ),
  { ssr: false },
);

export function CancellationPoliciesSection() {
  return (
    <div className="space-y-6">
      <CancellationPoliciesSettings />
    </div>
  );
}
