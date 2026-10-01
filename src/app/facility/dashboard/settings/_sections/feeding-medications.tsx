"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import {
  useFeedingInstructions,
  useMedicationInstructions,
} from "@/lib/api/facility-settings";
import type { CareService } from "@/lib/settings/care-setup";
import { useShellText } from "@/lib/shell/use-shell-text";
import { useSettingsText } from "@/lib/settings/use-settings-text";

import { CareSetupPage } from "../_components/feeding-medications/care-setup-page";

// ============================================================================
// Settings › Services › Feeding & medications (2026-10-01): what the booking
// form's Feeding and Medications steps offer, where they appear, and what they
// charge — the client's page.
//
// Nothing renders until both rows have arrived: the page seeds its draft once,
// and a first Save against the fallback would write the defaults over the
// facility's own (check:settings-seeding).
// ============================================================================

export function FeedingMedicationsSection() {
  const text = useSettingsText();
  const t = text.section("feeding-medications");
  const bt = useShellText("booking");
  const feeding = useFeedingInstructions();
  const medications = useMedicationInstructions();
  const { grooming, training } = useSettings();

  if (feeding.isPending || medications.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-2/3 rounded-full" />
        <Skeleton className="h-96 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  // The steps can be added to grooming and training too — offered here only
  // while the facility runs them.
  const others: CareService[] = [];
  if (grooming?.status?.disabled !== true) others.push("grooming");
  if (training?.status?.disabled !== true) others.push("training");

  return (
    <CareSetupPage
      initial={{
        feeding: feeding.instructions,
        medications: medications.instructions,
      }}
      others={others}
      t={t}
      bt={bt}
      locale={text.locale}
    />
  );
}
