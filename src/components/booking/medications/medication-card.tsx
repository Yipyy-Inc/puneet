"use client";

import { ImageIcon, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { describeMedication } from "@/lib/medications/describe";
import { fill } from "@/lib/medications/dose";
import type { MedStay } from "@/lib/medications/schedule";
import type { MedicationInstructions } from "@/lib/settings/medication-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { MedicationItem } from "@/types/booking";

// ============================================================================
// A saved medication, as the design lays it out: its name and dose on the
// first line, when it is given on the second, how on the third — Edit and
// Remove beside it.
// ============================================================================

export function MedicationCard({
  item,
  stay,
  settings,
  dateless,
  photo = false,
  editDisabled,
  onEdit,
  onRemove,
}: {
  item: MedicationItem;
  stay: MedStay;
  settings: Pick<MedicationInstructions, "methods">;
  /** Its chosen dates are all outside this stay. */
  dateless: boolean;
  /** A photo of its label goes with it. */
  photo?: boolean;
  editDisabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const lines = describeMedication(item, { t, locale, stay, settings });

  return (
    <article
      aria-label={item.name}
      className="border-line bg-card flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-section text-body-ink">{item.name}</span>
          {lines.dose ? (
            <span className="text-meta text-ink-secondary">{lines.dose}</span>
          ) : null}
        </div>
        {lines.schedule ? (
          <p className="text-body text-body-ink">{lines.schedule}</p>
        ) : null}
        <p className="text-meta text-ink-tertiary">{lines.method}</p>
        {photo ? (
          <p className="text-meta text-ink-secondary flex items-center gap-1.5">
            <ImageIcon className="size-4 shrink-0" aria-hidden />
            {t("medsPhotoAttached")}
          </p>
        ) : null}
        {dateless ? (
          <p className="text-meta text-warning flex items-center gap-1.5">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {t("medsNoDaysWarning")}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={editDisabled}
          aria-label={fill(t("medsEditAria"), { name: item.name })}
          onClick={onEdit}
        >
          {t("medsEdit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-bad hover:text-bad"
          aria-label={fill(t("medsRemoveAria"), { name: item.name })}
          onClick={onRemove}
        >
          {t("medsRemove")}
        </Button>
      </div>
    </article>
  );
}
