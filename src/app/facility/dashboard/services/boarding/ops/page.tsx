import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { BoardingKennelBoard } from "@/components/boarding/ops/BoardingKennelBoard";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

// ============================================================================
// Boarding operations: where each guest is staying, and moving one.
//
// This page had three tabs. Requests and Eligibility drew
// `BOARDING_BOOKING_REQUESTS` from src/data/boarding-ops — invented requests,
// counts and PreCheck warnings, accepted and declined in a useState. The real
// requests are on the Booking requests page and a booking's pre-arrival form
// is on the booking, so those tabs are gone and the kennel board, the one tab
// that was real, is the page. `?tab=kennels`, which the check-in board links
// to, still lands here.
// ============================================================================

export default function BoardingOpsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kennels"
        description="Where each boarding guest is staying, and moving one."
        secondary={
          <Button variant="outline" asChild>
            <Link href="/facility/dashboard/online-booking">
              <ClipboardList className="size-4" />
              Review booking requests
            </Link>
          </Button>
        }
      />
      <BoardingKennelBoard />
    </div>
  );
}
