"use client";

import { CircleCheck, CircleX, Clock3, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

export function EvaluationResultChip({
  result,
  className,
}: {
  result: EvaluationResult;
  className?: string;
}) {
  const { t } = useStaffText("evaluations");
  const style = STYLE[result];
  const Icon = style.icon;
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
