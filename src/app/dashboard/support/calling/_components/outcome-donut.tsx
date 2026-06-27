import type { OutcomeSlice } from "@/lib/support-call-analytics";

// SVG donut for the call-outcome breakdown (mirrors the facility OutcomeBreakdown
// — circles + stroke-dasharray arcs, no recharts).

const R = 54;
const CENTER = 70;
const STROKE = 16;
const CIRC = 2 * Math.PI * R;

export function OutcomeDonut({ outcomes }: { outcomes: OutcomeSlice[] }) {
  const total = outcomes.reduce((s, o) => s + o.count, 0);

  // Prefix-sum the fractions so each arc starts where the previous ended,
  // without a mutable accumulator (React Compiler forbids reassign-after-render).
  const positive = outcomes.filter((o) => o.count > 0);
  const segments = positive.map((o, i) => ({
    ...o,
    frac: o.count / total,
    offset:
      positive.slice(0, i).reduce((s, p) => s + p.count, 0) / (total || 1),
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0">
        <svg viewBox="0 0 140 140" className="size-36 -rotate-90">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={R}
            fill="none"
            className="stroke-muted"
            strokeWidth={STROKE}
          />
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={CENTER}
              cy={CENTER}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.frac * CIRC} ${CIRC}`}
              strokeDashoffset={-s.offset * CIRC}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{total}</span>
          <span className="text-muted-foreground text-[11px]">calls</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-1.5">
        {outcomes.map((o) => {
          const share = total === 0 ? 0 : Math.round((o.count / total) * 100);
          return (
            <li key={o.key} className="flex items-center gap-2 text-sm">
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: o.color }}
              />
              <span className="flex-1 truncate">{o.label}</span>
              <span className="font-semibold tabular-nums">{o.count}</span>
              <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                {share}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
