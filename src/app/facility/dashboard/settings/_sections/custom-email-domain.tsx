"use client";

// settings-write-ok: this screen says the feature is not available yet and
// offers nothing to fill in. It replaced 373 lines that announced "Domain
// Verified!" from a setTimeout, over DNS records naming a competitor's mail
// infrastructure — so writing nothing is the whole point of it.

import { CustomEmailDomainSettings } from "@/components/facility/CustomEmailDomainSettings";

export function CustomEmailDomainSection() {
  return (
    <div className="space-y-6">
      <CustomEmailDomainSettings />
    </div>
  );
}
