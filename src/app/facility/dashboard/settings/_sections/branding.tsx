"use client";

import { BrandingSettings } from "@/components/facility/BrandingSettings";
import { CustomerSignupSettings } from "@/components/facility/CustomerSignupSettings";
import { SettingsCardGrid } from "@/components/ui/settings-card-grid";

export function BrandingSection() {
  return (
    <SettingsCardGrid>
      <BrandingSettings />
      <CustomerSignupSettings />
    </SettingsCardGrid>
  );
}
