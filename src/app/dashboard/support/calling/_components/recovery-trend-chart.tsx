import type { RecoveryWeek } from "@/lib/support-call-analytics";

// Custom SVG line chart for the 8-week recovery trend (mirrors the facility
// MissedCallRecovery chart — no recharts, just SVG so it ships nothing extra).

const W = 720;
const H = 172;
const PAD = { top: 22, right: 16, bottom: 28, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const GRID = [0, 25, 50, 75, 100];

function x(i: number, n: number): number {
  return n <= 1 ? PAD.left : PAD.left + (i / (n - 1)) * PLOT_W;
}
function y(rate: number): number {
  return PAD.top + (1 - rate / 100) * PLOT_H;
}

export function RecoveryTrendChart({ weeks }: { weeks: RecoveryWeek[] }) {
  const pts = weeks.map((w, i) => ({
    ...w,
    px: x(i, weeks.length),
    py: y(w.rate),
  }));
  const line = pts.map((p) => `${p.px},${p.py}`).join(" ");
  const area =
    pts.length > 1
      ? `${PAD.left},${PAD.top + PLOT_H} ${line} ${PAD.left + PLOT_W},${PAD.top + PLOT_H}`
      : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-44 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="8-week missed-call recovery trend"
    >
      <defs>
        <linearGradient id="recoveryArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridlines + y labels */}
      {GRID.map((g) => (
        <g key={g}>
          <line
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={y(g)}
            y2={y(g)}
            className="stroke-border"
            strokeDasharray="2 3"
          />
          <text
            x={PAD.left - 6}
            y={y(g) + 3}
            textAnchor="end"
            className="fill-muted-foreground text-[10px]"
          >
            {g}%
          </text>
        </g>
      ))}

      {area && <polygon points={area} fill="url(#recoveryArea)" />}
      {pts.length > 1 && (
        <polyline
          points={line}
          fill="none"
          stroke="#10b981"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.px} cy={p.py} r={3.5} fill="#10b981" />
          <text
            x={p.px}
            y={p.py - 8}
            textAnchor="middle"
            className="fill-foreground text-[10px] font-semibold"
          >
            {p.rate}%
          </text>
          <text
            x={p.px}
            y={H - 9}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
