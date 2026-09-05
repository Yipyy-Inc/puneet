"use client";

import dynamic from "next/dynamic";

const DepositRulesSettings = dynamic(
  () =>
    import("@/components/facility/DepositRulesSettings").then(
      (mod) => mod.DepositRulesSettings,
    ),
  { ssr: false },
);

export function DepositRulesSection() {
  return (
    <div className="space-y-6">
      <DepositRulesSettings />
    </div>
  );
}
