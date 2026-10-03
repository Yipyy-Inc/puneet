"use client";

import { TipSettings } from "@/components/facility/TipSettings";
import { CheckoutAtDeskCard } from "@/components/facility/tips/CheckoutAtDeskCard";

export function TipsSection() {
  return (
    <div className="space-y-6">
      <TipSettings />
      <CheckoutAtDeskCard />
    </div>
  );
}
