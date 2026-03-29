"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuditTrail } from "@/components/facility/AuditTrail";

export default function FormAuditPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link href="/facility/dashboard/forms">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Audit Trail</h2>
          <p className="text-muted-foreground text-sm">
            Staff and admin changes across all areas — forms, settings, clients,
            and more.
          </p>
        </div>
      </div>
      <AuditTrail facilityId={11} />
    </div>
  );
}
