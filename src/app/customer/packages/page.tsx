"use client";

import { PackagesTab } from "@/components/customer/billing/PackagesTab";

export default function CustomerPackagesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Packages & Memberships</h1>
          <p className="text-muted-foreground">
            View and manage your active memberships, packages, and prepaid credits
          </p>
        </div>

        <PackagesTab />
      </div>
    </div>
  );
}
