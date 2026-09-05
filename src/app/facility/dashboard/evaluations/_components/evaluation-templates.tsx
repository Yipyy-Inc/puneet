"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { EvaluationFormBuilder } from "@/components/evaluations/EvaluationFormBuilder";
import { EvaluationReportCardBuilder } from "@/components/evaluations/EvaluationReportCardBuilder";
import { settingsPortalFor } from "@/lib/settings/nav";

// ============================================================================
// THE EVALUATION TEMPLATES — A BUILDER, NOT A SETTING.
//
// Both of these lived under Settings → Evaluations, beside the two cards that
// genuinely are settings: what an evaluation costs, how long it takes, which
// services require one, and whether the booking wizard offers it.
//
// They are a different kind of thing. `EvaluationSettings` holds VALUES a
// facility states once; these two DESIGN A DOCUMENT — sections, questions,
// scoring, and what the owner is sent afterwards. Filing a document builder
// under a list of values is how settings grew to 8.2 screens in the first
// place: the report-card builder was 1,360 lines under a nav item called
// "Business".
//
// So they moved to the module they belong to, which is where somebody thinking
// about evaluations already is.
//
// ── AND THE EMPLOYEE SHELL GOT ONE TOO ───────────────────────────────────
//
// `/employee/evaluations/templates` re-exports this. Without it the move would
// have QUIETLY REMOVED access: a manager holding `manage_facility_settings`
// could reach these through /employee/settings/evaluations before, and
// /facility/* admits facility admins only. A relocation that takes a screen
// away from the people who already had it is not a relocation.
// ============================================================================

export function EvaluationTemplates() {
  const pathname = usePathname() ?? "";
  const base =
    settingsPortalFor(pathname) === "employee"
      ? "/employee/evaluations"
      : "/facility/dashboard/evaluations";

  return (
    <div className="space-y-6 p-6">
      <Link
        href={base}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        All evaluations
      </Link>

      <PageHeader
        title="Evaluation templates"
        description="The form an evaluation is scored against, and the card its result is sent on."
      />

      <EvaluationFormBuilder />
      <EvaluationReportCardBuilder />
    </div>
  );
}
