"use client";

import dynamic from "next/dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { useMerchantApplication } from "@/lib/api/merchant-application";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import { isEditable } from "@/lib/merchant-application/application";
import { SectionSkeleton } from "./SectionSkeleton";
import { YipyyPayLanding } from "./YipyyPayLanding";
import { useYipyyPayNav } from "./use-yipyy-pay-nav";

// The application wizard is five forms and a file uploader, and a facility sees
// it once. Split so the ones who are past it never download it.
const ApplyWizard = dynamic(
  () => import("./apply/ApplyWizard").then((m) => m.ApplyWizard),
  { loading: () => <SectionSkeleton /> },
);
const ApplicationStatus = dynamic(
  () => import("./apply/ApplicationStatus").then((m) => m.ApplicationStatus),
  { loading: () => <SectionSkeleton /> },
);

// ============================================================================
// Everything before a facility has a working payment account.
//
// ── FOUR FACES, PICKED FROM THE APPLICATION'S OWN STATUS ──────────────────
//
//   no application            the landing page — this is a sale, not a form
//   draft                     the wizard, or the landing page offering to resume
//   submitted / under review  the status screen; nothing is expected of them
//   more information needed   the status screen, with the one button that helps
//   approved                  the status screen, offering to link the account
//
// Nothing here is stored as "which screen to show". The status word on the row
// is the only input, so a facility whose application was sent back overnight
// finds the right screen without anybody having remembered to update a flag.
//
// ── AND A FAILED LOAD SAYS SO ─────────────────────────────────────────────
//
// An error renders as an error. Falling through to the landing page would offer
// "Get started" to somebody who already applied, and starting again is the one
// thing they must not do.
// ============================================================================

export function YipyyPayPreConnection({
  overview,
}: {
  overview: YipyyPayOverview;
}) {
  const nav = useYipyyPayNav();
  const { data: application, isPending, error } = useMerchantApplication();

  if (isPending) return <SectionSkeleton />;

  if (error) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          {error instanceof Error
            ? error.message
            : "Your application could not be loaded."}
        </CardContent>
      </Card>
    );
  }

  if (!application) {
    return <YipyyPayLanding overview={overview} application={null} />;
  }

  if (isEditable(application.status)) {
    if (nav.inApply) {
      return <ApplyWizard application={application} overview={overview} />;
    }
    // A draft belongs behind the landing page, which is where the resume banner
    // lives. One that was sent back does not — something is being asked of
    // them, and burying it under a marketing hero would be a way of hiding it.
    if (application.status === "more_info_needed") {
      return (
        <ApplicationStatus application={application} overview={overview} />
      );
    }
    return <YipyyPayLanding overview={overview} application={application} />;
  }

  return <ApplicationStatus application={application} overview={overview} />;
}
