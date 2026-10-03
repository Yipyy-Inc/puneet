import { cn } from "@/lib/utils";

// ============================================================================
// The client mocks' "picked" mark: an accent circle with a white "✓" in a
// card's corner (pets 22px, services 24px, rooms 26px). Decorative — the card
// itself carries aria-checked or aria-pressed. Mocked screens only (CLAUDE.md
// § "Client mocks decide the look").
// ============================================================================

const SIZES = {
  22: "size-[22px] text-[12px]",
  24: "size-6 text-[13px]",
  26: "size-[26px] text-[13px]",
} as const;

export function Tick({
  size = 22,
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary text-primary-foreground absolute flex items-center justify-center rounded-full leading-none font-bold",
        SIZES[size],
        className,
      )}
    >
      ✓
    </span>
  );
}
