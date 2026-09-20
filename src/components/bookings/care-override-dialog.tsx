"use client";

import { CareCompletionGateDialog } from "@/components/bookings/CareCompletionWarning";
import {
  settleCareOverride,
  usePendingCareOverride,
} from "@/lib/daily-care/care-override-prompt";

// ============================================================================
// Staff sending a pet home with today's care unlogged: why.
//
// Mounted once at the root, beside FormOverrideDialogHost and for the same
// reason. The kennel board, the daily care board, the calendar and the booking
// page all check out through `withCareOverride`
// (lib/daily-care/care-override-prompt.ts) and wait for the answer here.
//
// It renders the dialog the booking page already used, so the question reads
// the same wherever it is asked — and it is already translated
// (`useStaffText("careGate")`).
//
// "Review" resolves with null: nothing is written and the pet stays checked
// in, which is the truthful outcome of going to log the care instead.
// ============================================================================

export function CareOverrideDialogHost() {
  const refusal = usePendingCareOverride();

  if (!refusal) return null;

  return (
    <CareCompletionGateDialog
      open
      pending={refusal.pending}
      hasCritical={refusal.hasCritical}
      onReview={() => settleCareOverride(null)}
      onContinueAnyway={(reason) => settleCareOverride(reason)}
      onClose={() => settleCareOverride(null)}
    />
  );
}
