"use client";

import { CircleCheck, CircleX, Clock3, TriangleAlert } from "lucide-react";

import { useLook } from "@/components/look/look-context";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import type { EvaluationResult } from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

// ============================================================================
// An evaluation's verdict as a status chip — the glyph, the word, the ink
// (§3; colour is never the only channel). The four of the client's mock:
//
//   Approved              success   circle-check
//   Approved with notes   warning   triangle-alert  (a pass with things to heed)
//   Needs re-evaluation   info      clock-3         (another visit to come)
//   Not approved          error     circle-x
// ============================================================================

const STYLE: Record<
  EvaluationResult,
  {
    variant: "confirmed" | "pending" | "checkedIn" | "overdue";
    icon: typeof CircleCheck;
  }
> = {
  approved: { variant: "confirmed", icon: CircleCheck },
  approved_with_restrictions: { variant: "pending", icon: TriangleAlert },
  needs_re_evaluation: { variant: "checkedIn", icon: Clock3 },
  not_approved: { variant: "overdue", icon: CircleX },
};

const TONE: Record<
  EvaluationResult,
  "success" | "warning" | "info" | "danger"
> = {
  approved: "success",
  approved_with_restrictions: "warning",
  needs_re_evaluation: "info",
  not_approved: "danger",
};

export function EvaluationResultChip({
  result,
  className,
}: {
  result: EvaluationResult;
  className?: string;
}) {
  const { t } = useStaffText("evaluations");
  const mock = useLook()?.names.includes("eval-module") ?? false;
  const style = STYLE[result];
  const Icon = style.icon;
  // The evaluations mock (2026-10-02, CLAUDE.md § "Client mocks decide the
  // look"): the word on its tint, no glyph — the word carries the meaning.
  if (mock) {
    return (
      <Chip
        tone={TONE[result]}
        size="sm"
        className={cn("px-[9px] py-[3px] font-bold", className)}
      >
        {t(`result_${result}`)}
      </Chip>
    );
  }
  return (
    <Badge
      variant={style.variant}
      className={cn("h-auto min-h-[26px] py-1 whitespace-normal", className)}
    >
      <Icon aria-hidden />
      {t(`result_${result}`)}
    </Badge>
  );
}
