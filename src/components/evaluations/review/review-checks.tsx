"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";

import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// "Before you send" — the client's mock (2026-10-02), answered where the
// card can answer it rather than ticked by default: who it is for, whether
// there is a note, whether Setup hides the internal notes, and whether the
// photo the card asks for is there.
// ============================================================================

export function ReviewChecks({
  detail,
  ownerNote,
}: {
  detail: EvaluationDetail;
  ownerNote: string;
}) {
  const { t, fill } = useStaffText("evaluations");
  const checks: Array<{ key: string; ok: boolean; text: string }> = [
    {
      key: "who",
      ok: true,
      text: fill("checkWho", {
        pet: detail.pet.name,
        owner: detail.client.name,
      }),
    },
    {
      key: "note",
      ok: ownerNote.trim().length > 0,
      text: ownerNote.trim() ? t("checkNoteOk") : t("checkNoteMissing"),
    },
    {
      key: "internal",
      ok: detail.card.hideInternal,
      text: detail.card.hideInternal
        ? t("checkInternalHidden")
        : t("checkInternalShown"),
    },
  ];
  if (detail.card.includePhoto) {
    checks.push({
      key: "photo",
      ok: Boolean(detail.photoUrl),
      text: detail.photoUrl ? t("checkPhotoOk") : t("checkPhotoMissing"),
    });
  }

  return (
    <section className="bg-card border-line flex flex-col gap-2 rounded-[18px] border px-4 py-3.5">
      <h3 className="text-body-ink text-[15px] font-bold">
        {t("beforeYouSend")}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {checks.map((check) => (
          <li
            key={check.key}
            className="text-body-ink flex gap-2.5 text-[14px]"
          >
            {check.ok ? (
              <CircleCheck
                className="text-success mt-0.5 size-4 shrink-0"
                aria-label={t("checkPassed")}
              />
            ) : (
              <TriangleAlert
                className="text-warning mt-0.5 size-4 shrink-0"
                aria-label={t("checkAttention")}
              />
            )}
            <span className="min-w-0">{check.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
