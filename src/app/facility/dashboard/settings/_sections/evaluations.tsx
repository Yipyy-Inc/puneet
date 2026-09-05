"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EvaluationSettings } from "@/components/facility/EvaluationSettings";
import { EvaluationBookingWizardSettings } from "@/components/facility/EvaluationBookingWizardSettings";
import { settingsPortalFor } from "@/lib/settings/nav";

// What an evaluation IS — its price, its duration, which services require one,
// and whether the booking wizard offers it. All values a facility states once.
//
// The two BUILDERS that used to sit under this heading — the form an evaluation
// is scored against and the report card its result goes out on — moved to
// /evaluations/templates. They design a document; these set values, and putting
// both under one nav item is the habit that made settings 8.2 screens deep.
export function EvaluationsSection() {
  const pathname = usePathname() ?? "";
  const templates =
    settingsPortalFor(pathname) === "employee"
      ? "/employee/evaluations/templates"
      : "/facility/dashboard/evaluations/templates";

  return (
    <div className="space-y-6">
      <EvaluationSettings />
      <EvaluationBookingWizardSettings />

      <div className="bg-muted/30 rounded-lg border px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          The evaluation form and its report card are designed under
          Evaluations.{" "}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link href={templates}>
            Open evaluation templates
            <ExternalLink className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
