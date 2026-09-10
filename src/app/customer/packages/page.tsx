"use client";

import { PackagesTab } from "@/components/customer/billing/PackagesTab";
import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";

export default function CustomerPackagesPage() {
  const { t } = useCustomerText("packages");
  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title={t("packagesMemberships")}
          description={t("viewAndManageYourActive")}
        />

        <PackagesTab />
      </div>
    </div>
  );
}
