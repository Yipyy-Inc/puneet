"use client";

import { PackagesTab } from "@/components/customer/billing/PackagesTab";

export default function CustomerPackagesPage() {
  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Packages & Memberships</h1>
          <p className="text-muted-foreground">
            View and manage your active memberships, packages, and prepaid
            credits
          </p>
        </div>

        <PackagesTab />
      </div>
    </div>
  );
}
