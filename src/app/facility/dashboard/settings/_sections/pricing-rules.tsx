"use client";

import dynamic from "next/dynamic";

const PricingRulesSettings = dynamic(
  () =>
    import("@/components/facility/PricingRulesSettings").then(
      (mod) => mod.PricingRulesSettings,
    ),
  { ssr: false },
);

export function PricingRulesSection() {
  return (
    <div className="space-y-6">
      <PricingRulesSettings />
    </div>
  );
}
