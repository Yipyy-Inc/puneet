"use client";

import { StaffHrConfigSettings } from "@/components/facility/staff-hr/StaffHrConfigSettings";
import { ClockConfirmationSettings } from "@/components/facility/staff-hr/ClockConfirmationSettings";
import { RegisterPolicySettings } from "@/components/facility/staff-hr/RegisterPolicySettings";

export function HrConfigSection() {
  return (
    <div className="space-y-6">
      <StaffHrConfigSettings />
      <ClockConfirmationSettings />
      <RegisterPolicySettings />
    </div>
  );
}
