"use client";

import { BrandingSettings } from "@/components/facility/BrandingSettings";
import { CustomerSignupSettings } from "@/components/facility/CustomerSignupSettings";
import { SettingsCardGrid } from "../_components/settings-card-grid";

export function BrandingSection() {
  return (
    <SettingsCardGrid>
      <BrandingSettings />
      <CustomerSignupSettings />
    </SettingsCardGrid>
  );
}
