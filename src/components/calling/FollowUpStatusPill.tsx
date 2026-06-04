import { cn } from "@/lib/utils";
import { FOLLOW_UP_META } from "@/lib/calling/follow-up-status";
import type { FollowUpStatus } from "@/types/communications";

/**
 * Colored pill showing a call's follow-up resolution state:
 * pending = amber, scheduled = blue, completed = green, no_action = gray.
 */
export function FollowUpStatusPill({
  status,
  className,
}: {
  status: FollowUpStatus;
  className?: string;
}) {
  const meta = FOLLOW_UP_META[status];
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        meta.pill,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}
