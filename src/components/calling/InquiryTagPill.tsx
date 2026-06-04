import { cn } from "@/lib/utils";
import { INQUIRY_TAG_META } from "@/lib/calling/inquiry-tags";
import type { InquiryTag } from "@/types/calling";

/**
 * Colored pill showing the caller's IVR-selected inquiry type. Used on call
 * queue cards (instant context before answering) and call log records.
 */
export function InquiryTagPill({
  tag,
  className,
}: {
  tag: InquiryTag;
  className?: string;
}) {
  const meta = INQUIRY_TAG_META[tag];
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
