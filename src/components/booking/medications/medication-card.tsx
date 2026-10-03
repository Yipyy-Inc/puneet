"use client";

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
      className="border-line bg-card flex flex-wrap items-center justify-between gap-4 rounded-[16px] border px-5 py-[18px]"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-body-ink text-[17px] font-semibold">
            {item.name}
          </span>
          {lines.dose ? (
            <span className="text-ink-tertiary text-[14px]">{lines.dose}</span>
          ) : null}
        </div>
        {lines.schedule ? (
          <p className="text-ink-secondary text-[14px]">{lines.schedule}</p>
        ) : null}
        <p className="text-ink-tertiary text-[13px]">{lines.method}</p>
        {photo ? (
          <p className="text-ink-tertiary text-[13px]">
            {t("medsPhotoAttached")}
          </p>
        ) : null}
        {dateless ? (
          <p className="text-[13px] text-(--note-ink)">
            {t("medsNoDaysWarning")}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="quiet"
          size="care-md"
          className="font-medium"
          disabled={editDisabled}
          aria-label={fill(t("medsEditAria"), { name: item.name })}
          onClick={onEdit}
        >
          {t("medsEdit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="care-md"
          className="text-bad hover:text-bad px-3.5 font-normal"
          aria-label={fill(t("medsRemoveAria"), { name: item.name })}
          onClick={onRemove}
        >
          {t("medsRemove")}
        </Button>
      </div>
    </article>
  );
}
