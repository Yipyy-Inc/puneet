import {
  componentHistory,
  componentStatus,
  STATUS_COMPONENTS,
  uptimePercent,
  type DayUptime,
} from "@/data/status-page";
import { cn } from "@/lib/utils";

import { STATUS_META } from "./status-styles";

function UptimeBars({ days }: { days: DayUptime[] }) {
  const BAR = 3;
  const GAP = 1;
  const H = 34;
  const W = days.length * (BAR + GAP) - GAP;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-9 w-full"
      role="img"
      aria-label="90-day uptime history"
    >
      {days.map((d, i) => (
        <rect
          key={d.date}
          x={i * (BAR + GAP)}
          y={0}
          width={BAR}
          height={H}
          rx={1}
          className={STATUS_META[d.status].bar}
        >
          <title>{`${d.date}: ${d.uptime}% — ${STATUS_META[d.status].label}`}</title>
        </rect>
      ))}
    </svg>
  );
}

export function ComponentList() {
  return (
    <div className="divide-y rounded-xl border">
      {STATUS_COMPONENTS.map((c) => {
        const status = componentStatus(c.id);
        const meta = STATUS_META[status];
        const history = componentHistory(c.id);
        const pct = uptimePercent(c.id);
        return (
          <div key={c.id} className="space-y-2.5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={cn("size-2.5 rounded-full", meta.dot)} />
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {c.description}
                  </p>
                </div>
              </div>
              <span className={cn("text-sm font-medium", meta.text)}>
                {meta.label}
              </span>
            </div>
            <UptimeBars days={history} />
            <div className="text-muted-foreground flex items-center justify-between text-[11px]">
              <span>90 days ago</span>
              <span className="font-medium">{pct}% uptime</span>
              <span>Today</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
