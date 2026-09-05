"use client";

import { BrandingSettings } from "@/components/facility/BrandingSettings";
import { CustomerSignupSettings } from "@/components/facility/CustomerSignupSettings";

export function BrandingSection() {
  return (
    <div className="space-y-6">
      <BrandingSettings />
      <CustomerSignupSettings />
    </div>
  );
}
