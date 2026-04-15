"use client";

import { Card } from "@/components/ui/card";
import { useUnifiedBookings } from "@/hooks/use-unified-bookings";
import { useDashboardFilters } from "@/components/facility/dashboard/dashboard-filters-context";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export function ServiceBreakdown() {
  const { services, counts } = useUnifiedBookings();
  const { serviceFilter, setServiceFilter, setTab } = useDashboardFilters();

  const total = services.reduce(
    (sum, s) => sum + (counts.byService[s.key] ?? 0),
    0,
  );

  const handleClick = (key: string) => {
    setServiceFilter(key);
    setTab("scheduled");
  };

  return (
    <Card className="from-card via-card to-card relative overflow-hidden border bg-gradient-to-br">
      <div className="pointer-events-none absolute -top-12 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-sky-200/40 via-cyan-200/20 to-transparent blur-2xl dark:from-sky-500/15 dark:via-cyan-500/10" />
      <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 lg:min-w-[220px]">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-500/20">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              Today&apos;s Check-Ins
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {total}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                across {services.length} services
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <ServicePill
            label="All"
            value={total}
            color="#0ea5e9"
            icon="LayoutGrid"
            active={serviceFilter === "all"}
            onClick={() => {
              setServiceFilter("all");
              setTab("scheduled");
            }}
          />
          {services.map((s) => (
            <ServicePill
              key={s.key}
              label={s.label}
              value={counts.byService[s.key] ?? 0}
              color={s.color}
              icon={s.icon}
              active={serviceFilter === s.key}
              onClick={() => handleClick(s.key)}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

interface ServicePillProps {
  label: string;
  value: number;
  color: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

function ServicePill({
  label,
  value,
  color,
  icon,
  active,
  onClick,
}: ServicePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : undefined}
      data-color={color}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm font-medium transition-all",
        "hover:-translate-y-px hover:shadow-sm",
        "data-[active=true]:border-transparent data-[active=true]:text-white data-[active=true]:shadow-md",
      )}
      style={
        active
          ? { backgroundColor: color, borderColor: color }
          : { borderColor: `${color}33` }
      }
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full transition-colors",
          active ? "bg-white/20" : "bg-transparent",
        )}
        style={active ? undefined : { color }}
      >
        <DynamicIcon name={icon} className="size-3.5" />
      </span>
      <span>{label}</span>
      <span
        className={cn(
          "ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
          active
            ? "bg-white/25 text-white"
            : "bg-muted text-muted-foreground group-hover:bg-muted/80",
        )}
      >
        {value}
      </span>
    </button>
  );
}
