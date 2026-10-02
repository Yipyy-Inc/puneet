"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// How a private program is booked (the booking wizard's Program step, the
// client's mock, 2026-10-01): a one-on-one lesson — sold singly or in packs —
// or a behaviour consult, and how long its session runs. A group program
// books its classes and needs none of this.
// ============================================================================

export interface ProgramPackDraft {
  sessions: number | "";
  price: number | "";
}

export interface ProgramBookingForm {
  format: "lesson" | "consult";
  sessionMinutes: number | "";
  packs: ProgramPackDraft[];
}

export function ProgramBookingFields({
  value,
  onChange,
  singlePrice,
}: {
  value: ProgramBookingForm;
  onChange: (next: ProgramBookingForm) => void;
  /** The program's price for one session, for what a pack saves. */
  singlePrice: number;
}) {
  const { t, fill, locale } = useStaffText("trainingRates");
  const number = (raw: string) => (raw === "" ? "" : Number(raw));
  const setPack = (index: number, patch: Partial<ProgramPackDraft>) =>
    onChange({
      ...value,
      packs: value.packs.map((pack, i) =>
        i === index ? { ...pack, ...patch } : pack,
      ),
    });

  return (
    <div className="border-line flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-col gap-2">
        <Label id="program-booked-as">{t("bookedAs")}</Label>
        <Segmented
          name="program-format"
          label={t("bookedAs")}
          value={value.format}
          options={[
            { value: "lesson", label: t("formatLesson") },
            { value: "consult", label: t("formatConsult") },
          ]}
          onChange={(format) => onChange({ ...value, format })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="program-session-minutes">{t("sessionLength")}</Label>
        <Input
          id="program-session-minutes"
          type="number"
          min={15}
          step={15}
          inputMode="numeric"
          className="max-w-40 tabular-nums"
          placeholder={value.format === "consult" ? "90" : "60"}
          value={value.sessionMinutes}
          onChange={(e) =>
            onChange({ ...value, sessionMinutes: number(e.target.value) })
          }
        />
        <p className="text-meta text-ink-tertiary">{t("sessionLengthHint")}</p>
      </div>

      {value.format === "lesson" ? (
        <div className="flex flex-col gap-2.5">
          <span className="text-body-strong text-body-ink">
            {t("packsTitle")}
          </span>
          <p className="text-meta text-ink-tertiary">{t("packsHint")}</p>
          {value.packs.map((pack, index) => {
            const saves =
              typeof pack.sessions === "number" &&
              typeof pack.price === "number"
                ? singlePrice * pack.sessions - pack.price
                : 0;
            return (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <div className="flex w-28 flex-col gap-1.5">
                  <Label htmlFor={`program-pack-sessions-${index}`}>
                    {t("packSessions")}
                  </Label>
                  <Input
                    id={`program-pack-sessions-${index}`}
                    type="number"
                    min={2}
                    inputMode="numeric"
                    className="tabular-nums"
                    value={pack.sessions}
                    onChange={(e) =>
                      setPack(index, { sessions: number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex w-36 flex-col gap-1.5">
                  <Label htmlFor={`program-pack-price-${index}`}>
                    {t("packPrice")}
                  </Label>
                  <Input
                    id={`program-pack-price-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    className="tabular-nums"
                    value={pack.price}
                    onChange={(e) =>
                      setPack(index, { price: number(e.target.value) })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={fill("removePack", {
                    count: pack.sessions === "" ? "" : pack.sessions,
                  })}
                  onClick={() =>
                    onChange({
                      ...value,
                      packs: value.packs.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 aria-hidden />
                </Button>
                {saves > 0 ? (
                  <span className="text-meta text-ink-secondary self-center tabular-nums">
                    {fill("packSaves", { amount: formatMoney(saves, locale) })}
                  </span>
                ) : null}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() =>
              onChange({
                ...value,
                packs: [...value.packs, { sessions: "", price: "" }],
              })
            }
          >
            <Plus aria-hidden />
            {t("addPack")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
