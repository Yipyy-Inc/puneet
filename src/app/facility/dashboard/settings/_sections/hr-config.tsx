"use client";

import { StaffHrConfigSettings } from "@/components/facility/staff-hr/StaffHrConfigSettings";
import { ClockConfirmationSettings } from "@/components/facility/staff-hr/ClockConfirmationSettings";
import { RegisterPolicySettings } from "@/components/facility/staff-hr/RegisterPolicySettings";
import { SettingsCardGrid } from "@/components/ui/settings-card-grid";

export function HrConfigSection() {
  return (
    <SettingsCardGrid>
      <StaffHrConfigSettings />
      <ClockConfirmationSettings />
      <RegisterPolicySettings />
    </SettingsCardGrid>
  );
}
