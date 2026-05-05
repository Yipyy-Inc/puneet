import { cn } from "@/lib/utils";

interface MetricBarProps {
  percent: number;
  fillClassName?: string;
  trackClassName?: string;
  className?: string;
  size?: "xs" | "sm" | "md";
}

const SIZE_CLASS = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2",
} as const;

export function MetricBar({
  percent,
  fillClassName = "bg-sky-500",
  trackClassName = "bg-muted",
  className,
  size = "sm",
}: MetricBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full",
        SIZE_CLASS[size],
        trackClassName,
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          fillClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
