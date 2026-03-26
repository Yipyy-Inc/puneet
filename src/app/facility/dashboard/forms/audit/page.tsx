"use client";

import { FormAuditTrail } from "@/components/forms/FormAuditTrail";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FormAuditPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/facility/dashboard/forms">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit & Compliance</h2>
          <p className="text-muted-foreground">
            Immutable log of every form change for compliance review.
          </p>
        </div>
      </div>
      <FormAuditTrail facilityId={11} />
    </div>
  );
}
