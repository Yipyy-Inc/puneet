"use client";

import { PackagesTab } from "@/components/customer/billing/PackagesTab";
import { PageHeader } from "@/components/ui/page-header";

export default function CustomerPackagesPage() {
  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Packages & Memberships"
          description="View and manage your active memberships, packages, and prepaid credits"
        />

        <PackagesTab />
      </div>
    </div>
  );
}
