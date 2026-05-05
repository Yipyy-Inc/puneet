import { cn } from "@/lib/utils";

interface Segment {
  key: string;
  value: number;
  className: string;
  label?: string;
}

interface StackedDistributionProps {
  segments: Segment[];
  className?: string;
  size?: "xs" | "sm" | "md";
}

const SIZE_CLASS = {
  xs: "h-1",
  sm: "h-2",
  md: "h-3",
} as const;

export function StackedDistribution({
  segments,
  className,
  size = "sm",
}: StackedDistributionProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div
      className={cn(
        "bg-muted flex w-full overflow-hidden rounded-full",
        SIZE_CLASS[size],
        className,
      )}
    >
      {segments.map((seg) => {
        const pct = (seg.value / total) * 100;
        return (
          <div
            key={seg.key}
            className={cn("h-full transition-all duration-700 ease-out", seg.className)}
            style={{ width: `${pct}%` }}
            title={seg.label ?? `${seg.key}: ${seg.value}`}
          />
        );
      })}
    </div>
  );
}
