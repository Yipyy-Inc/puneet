"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CustomServiceWizard } from "@/components/custom-services/wizard/CustomServiceWizard";

export default function CreateCustomServicePage() {
  return (
    <div>
      {/* Breadcrumb header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-center gap-2">
          <Link
            href="/facility/dashboard/services/custom"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
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
