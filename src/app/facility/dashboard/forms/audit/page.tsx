"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuditTrail } from "@/components/facility/AuditTrail";
import { PageHeader } from "@/components/ui/page-header";

export default function FormAuditPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link href="/facility/dashboard/forms">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title="Audit Trail"
          description="Staff and admin changes across all areas — forms, settings, clients, and more."
        />
      </div>
      <AuditTrail facilityId={11} />
    </div>
  );
}
