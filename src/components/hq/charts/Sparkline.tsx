import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
  width?: number;
  height?: number;
  showDots?: boolean;
}

export function Sparkline({
  values,
  className,
  strokeClassName = "stroke-sky-500",
  fillClassName = "fill-sky-500/15",
  width = 80,
  height = 24,
  showDots = false,
}: SparklineProps) {
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const path = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={areaPath} className={cn("stroke-none", fillClassName)} />
      <path
        d={path}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
        vectorEffect="non-scaling-stroke"
      />
      {showDots &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.5"
            className={cn("stroke-background stroke-1", strokeClassName.replace("stroke-", "fill-"))}
          />
        ))}
    </svg>
  );
}
