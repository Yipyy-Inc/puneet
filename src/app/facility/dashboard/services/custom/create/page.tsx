"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CustomServiceWizard } from "@/components/custom-services/wizard/CustomServiceWizard";

export default function CreateCustomServicePage() {
  return (
    <div>
      {/* Breadcrumb header */}
      <div className="border-border bg-card border-b px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Link
            href="/facility/dashboard/services/custom"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <ChevronLeft className="size-4" />
            Custom Services
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">New Module</span>
        </div>
      </div>

      <CustomServiceWizard />
    </div>
  );
}
