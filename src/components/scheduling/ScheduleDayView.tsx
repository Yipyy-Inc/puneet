"use client";

import { useMemo } from "react";
import {
  Clock,
  UserX,
  Star,
  CheckCircle2,
  CircleDashed,
  Heart,
  Palmtree,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isHoliday, computeShiftHours } from "@/lib/scheduling-utils";
import { formatDateStr, isToday } from "./ScheduleCalendarHelpers";
import type {
  ScheduleShift,
  ScheduleEmployee,
  Position,
  EnhancedTimeOffRequest,
  HolidayRate,
} from "@/types/scheduling";

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;

function timeToHour(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

function getCurrentHour(): number {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

const timeOffMeta: Record<
  string,
  { label: string; from: string; to: string; icon: React.ElementType }
> = {
  vacation: {
    label: "Vacation",
    from: "from-emerald-400",
    to: "to-emerald-500",
    icon: Palmtree,
  },
  sick_leave: {
    label: "Sick Leave",
    from: "from-sky-400",
    to: "to-blue-500",
    icon: Heart,
  },
  personal: {
    label: "Personal",
    from: "from-amber-400",
    to: "to-orange-500",
    icon: UserX,
  },
  bereavement: {
    label: "Bereavement",
    from: "from-slate-400",
    to: "to-slate-500",
    icon: UserX,
  },
  parental: {
    label: "Parental",
    from: "from-violet-400",
    to: "to-purple-500",
    icon: UserX,
  },
  unpaid: {
    label: "Unpaid",
    from: "from-rose-400",
    to: "to-pink-500",
    icon: UserX,
  },
  other: {
    label: "Time Off",
    from: "from-slate-400",
    to: "to-slate-500",
    icon: UserX,
  },
};

export interface ScheduleDayViewProps {
  currentDate: Date;
  employees: ScheduleEmployee[];
  shifts: ScheduleShift[];
  positions: Position[];
  timeOffRequests: EnhancedTimeOffRequest[];
  holidayRates: HolidayRate[];
  onShiftClick: (shift: ScheduleShift) => void;
  onCellClick: (employeeId: string | undefined, date: string) => void;
}

export function ScheduleDayView({
  currentDate,
  employees,
  shifts,
  positions,
  timeOffRequests,
  holidayRates,
  onShiftClick,
  onCellClick,
}: ScheduleDayViewProps) {
  const dateStr = formatDateStr(currentDate);
  const todayFlag = isToday(currentDate);
  const holiday = isHoliday(dateStr, holidayRates);

  const positionMap = useMemo(() => {
    const m = new Map<string, Position>();
    positions.forEach((p) => m.set(p.id, p));
    return m;
  }, [positions]);

  const dayShifts = useMemo(
    () => shifts.filter((s) => s.date === dateStr),
    [shifts, dateStr],
  );

  const openShifts = dayShifts.filter((s) => !s.employeeId);

  const timeOffByEmployee = useMemo(() => {
    const m = new Map<string, EnhancedTimeOffRequest>();
    timeOffRequests.forEach((r) => {
      if (
        r.startDate <= dateStr &&
        r.endDate >= dateStr &&
        (r.status === "approved" || r.status === "pending")
      ) {
        m.set(r.employeeId, r);
      }
    });
    return m;
  }, [timeOffRequests, dateStr]);

  const shiftsByEmployee = useMemo(() => {
    const m = new Map<string, ScheduleShift[]>();
    dayShifts.forEach((s) => {
      if (!s.employeeId) return;
      if (!m.has(s.employeeId)) m.set(s.employeeId, []);
      m.get(s.employeeId)!.push(s);
    });
    m.forEach((arr) =>
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
    return m;
  }, [dayShifts]);

  const totalScheduledHours = dayShifts.reduce(
    (sum, s) =>
      sum + computeShiftHours(s.startTime, s.endTime, s.breakMinutes),
    0,
  );
  const workingCount = new Set(
    dayShifts.filter((s) => s.employeeId).map((s) => s.employeeId),
  ).size;

  const hourMarkers = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => DAY_START_HOUR + i,
  );

  const nowHour = todayFlag ? getCurrentHour() : null;
  const nowPct =
    nowHour !== null && nowHour >= DAY_START_HOUR && nowHour <= DAY_END_HOUR
      ? ((nowHour - DAY_START_HOUR) / TOTAL_HOURS) * 100
      : null;

  const empColWidth = 240;
  const timelineGridTemplate = `${empColWidth}px 1fr`;

  // Format day label and date number for hero
  const dayName = currentDate.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = currentDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const year = currentDate.getFullYear();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ─── Hero header ─────────────────────────────────────────── */}
      <div
        className={cn(
          "border-border/60 relative flex items-center justify-between gap-4 border-b px-6 py-5",
          todayFlag
            ? "bg-gradient-to-r from-indigo-50/80 via-white to-white dark:from-indigo-950/30 dark:via-slate-950 dark:to-slate-950"
            : "bg-gradient-to-r from-slate-50/60 via-white to-white dark:from-slate-900/40 dark:via-slate-950 dark:to-slate-950",
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex size-16 flex-col items-center justify-center rounded-2xl border shadow-sm",
              todayFlag
                ? "border-indigo-200/70 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/30 dark:border-indigo-700/50"
                : "border-border/60 bg-card text-foreground",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-semibold tracking-[0.12em] uppercase",
                todayFlag ? "text-indigo-100" : "text-muted-foreground",
              )}
            >
              {dayName.slice(0, 3)}
            </span>
            <span className="text-2xl leading-none font-bold">
              {currentDate.getDate()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {dayName}
              </h2>
              {todayFlag && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase shadow-sm shadow-indigo-500/30">
                  Today
                </span>
              )}
              {holiday && (
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <span className="flex cursor-default items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-600/40 dark:bg-amber-950/40 dark:text-amber-300">
                      <Star className="size-3 fill-amber-400 text-amber-500" />
                      {holiday.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border shadow-md text-xs">
                    ×{holiday.multiplier} pay rate
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {monthDay}, {year}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <DayStat
            label="Working"
            value={workingCount.toString()}
            accent="indigo"
          />
          <DayStat
            label="Hours"
            value={totalScheduledHours.toFixed(1)}
            accent="emerald"
          />
          <DayStat
            label="On Leave"
            value={timeOffByEmployee.size.toString()}
            accent="amber"
          />
          <DayStat
            label="Open"
            value={openShifts.length.toString()}
            accent="rose"
          />
        </div>
      </div>

      {/* ─── Timeline ─────────────────────────────────────────────── */}
      <div className="bg-muted/10 dark:bg-slate-950/40 flex-1 overflow-y-auto">
        {/* Hours scale row */}
        <div
          className="border-border/60 sticky top-0 z-20 grid border-b bg-background/95 backdrop-blur-md"
          style={{ gridTemplateColumns: timelineGridTemplate }}
        >
          <div className="border-border/60 flex items-center border-r px-6 py-3">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
              Employees
            </span>
          </div>
          <div className="relative">
            <div
              className="grid h-full"
              style={{
                gridTemplateColumns: `repeat(${TOTAL_HOURS}, minmax(0, 1fr))`,
              }}
            >
              {hourMarkers.slice(0, -1).map((h) => (
                <div
                  key={h}
                  className="border-border/40 flex items-center justify-start border-r px-2 py-3"
                >
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wide">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employee rows */}
        <div className="relative">
          {/* Vertical "now" line spanning all rows */}
          {nowPct !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10"
              style={{
                left: `calc(${empColWidth}px + (100% - ${empColWidth}px) * ${nowPct} / 100)`,
              }}
            >
              <div className="absolute inset-y-0 w-px border-l-2 border-dashed border-indigo-500/60" />
              <div className="absolute -top-1 -left-1.5 size-3 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50" />
            </div>
          )}

          {employees.map((employee) => {
            const empShifts = shiftsByEmployee.get(employee.id) ?? [];
            const empTimeOff = timeOffByEmployee.get(employee.id);
            const empHours = empShifts.reduce(
              (sum, s) =>
                sum + computeShiftHours(s.startTime, s.endTime, s.breakMinutes),
              0,
            );

            return (
              <div
                key={employee.id}
                className="group/row border-border/40 hover:bg-muted/30 dark:hover:bg-slate-900/30 grid border-b transition-colors"
                style={{ gridTemplateColumns: timelineGridTemplate }}
              >
                <div className="border-border/40 bg-background flex items-center gap-3 border-r px-6 py-4">
                  <Avatar className="ring-background size-11 shrink-0 ring-2 shadow-sm">
                    <AvatarImage src={employee.avatar} alt={employee.name} />
                    <AvatarFallback className="bg-linear-to-br from-indigo-100 via-slate-100 to-slate-50 text-[12px] font-semibold text-slate-700 dark:from-indigo-900/30 dark:via-slate-900 dark:to-slate-950 dark:text-slate-200">
                      {employee.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {employee.name}
                    </p>
                    <p className="text-muted-foreground truncate text-[11px]">
                      {employee.role}
                    </p>
                  </div>
                  {empHours > 0 && (
                    <span className="text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                      {empHours.toFixed(1)}h
                    </span>
                  )}
                </div>
                {empTimeOff ? (
                  <TimeOffBar
                    timeOff={empTimeOff}
                  />
                ) : (
                  <TimelineRow
                    shifts={empShifts}
                    positionMap={positionMap}
                    onShiftClick={onShiftClick}
                    onEmptyClick={() => onCellClick(employee.id, dateStr)}
                  />
                )}
              </div>
            );
          })}

          {employees.length === 0 && (
            <div className="text-muted-foreground flex items-center justify-center py-16 text-sm">
              No employees in this department
            </div>
          )}

          {/* Open shifts row — anchored at the bottom */}
          {openShifts.length > 0 && (
            <div
              className="border-border/50 sticky bottom-0 z-20 grid border-t-2 border-b border-dashed border-amber-300 bg-gradient-to-r from-amber-50 via-amber-50/70 to-amber-50/30 backdrop-blur-md dark:border-amber-700/40 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-amber-950/10"
              style={{ gridTemplateColumns: timelineGridTemplate }}
            >
              <div className="flex items-center gap-3 border-r border-dashed border-amber-300/60 px-6 py-4 dark:border-amber-700/40">
                <div className="flex size-10 items-center justify-center rounded-full border border-dashed border-amber-400 bg-white text-amber-600 shadow-sm dark:bg-amber-950/30">
                  <UserX className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    Open Shifts
                  </p>
                  <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80">
                    {openShifts.length} available to claim
                  </p>
                </div>
              </div>
              <TimelineRow
                shifts={openShifts}
                positionMap={positionMap}
                onShiftClick={onShiftClick}
                onEmptyClick={() => onCellClick(undefined, dateStr)}
                isOpen
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DayStat (header KPIs) ──────────────────────────────────────────────────

function DayStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "indigo" | "emerald" | "amber" | "rose";
}) {
  const accentMap = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
  };
  return (
    <div className="text-right">
      <p className={cn("text-xl font-bold tabular-nums", accentMap[accent])}>
        {value}
      </p>
      <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.1em] uppercase">
        {label}
      </p>
    </div>
  );
}

// ─── TimelineRow (positioned shift bars) ────────────────────────────────────

function TimelineRow({
  shifts,
  positionMap,
  onShiftClick,
  onEmptyClick,
  isOpen = false,
}: {
  shifts: ScheduleShift[];
  positionMap: Map<string, Position>;
  onShiftClick: (shift: ScheduleShift) => void;
  onEmptyClick: () => void;
  isOpen?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (shifts.length === 0) onEmptyClick();
      }}
      className="group/timeline relative h-[68px] w-full cursor-pointer text-left"
    >
      {/* Hour gridlines */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${TOTAL_HOURS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "border-border/30 border-r",
              (DAY_START_HOUR + i) % 4 === 0 && "border-border/50",
            )}
          />
        ))}
      </div>

      {/* Shift bars */}
      {shifts.map((shift) => (
        <ShiftBar
          key={shift.id}
          shift={shift}
          position={positionMap.get(shift.positionId)}
          onClick={() => onShiftClick(shift)}
          isOpen={isOpen}
        />
      ))}

      {/* Empty hint */}
      {shifts.length === 0 && (
        <span className="text-muted-foreground/50 absolute inset-0 flex items-center justify-center text-[11px] italic opacity-0 transition-opacity group-hover/timeline:opacity-100">
          Click to add shift
        </span>
      )}
    </button>
  );
}

// ─── ShiftBar (the gradient pill in the timeline) ───────────────────────────

function ShiftBar({
  shift,
  position,
  onClick,
  isOpen,
}: {
  shift: ScheduleShift;
  position: Position | undefined;
  onClick: () => void;
  isOpen?: boolean;
}) {
  const start = timeToHour(shift.startTime);
  const end = timeToHour(shift.endTime);
  const clampedStart = Math.max(start, DAY_START_HOUR);
  const clampedEnd = Math.min(end, DAY_END_HOUR);

  if (clampedEnd <= clampedStart) return null;

  const leftPct = ((clampedStart - DAY_START_HOUR) / TOTAL_HOURS) * 100;
  const widthPct = ((clampedEnd - clampedStart) / TOTAL_HOURS) * 100;
  const color = position?.color ?? "#6366f1";
  const isDraft = shift.status === "draft";

  const StatusIcon = isDraft ? CircleDashed : CheckCircle2;

  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onClick();
            }
          }}
          className={cn(
            "group/bar absolute top-2 bottom-2 cursor-pointer overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg",
            isDraft && "border-dashed",
            isOpen && !isDraft && "border-amber-400/70",
          )}
          style={{
            left: `${leftPct}%`,
            width: `calc(${widthPct}% - 4px)`,
            marginLeft: "2px",
            background: isDraft
              ? `repeating-linear-gradient(135deg, ${color}18 0px, ${color}18 6px, ${color}0a 6px, ${color}0a 12px)`
              : `linear-gradient(135deg, ${color}28 0%, ${color}14 100%)`,
            borderColor: isDraft ? `${color}80` : `${color}55`,
            boxShadow: isDraft ? "none" : `0 1px 8px ${color}1a`,
          }}
        >
          {/* Left color accent bar */}
          <div
            className="absolute top-0 bottom-0 left-0 w-1"
            style={{ backgroundColor: color }}
          />

          <div className="flex h-full items-center gap-2 px-3 pl-4">
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[12px] leading-tight font-semibold"
                style={{ color }}
              >
                {position?.name ?? "Shift"}
              </p>
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-[10px] tabular-nums">
                <Clock className="size-2.5" />
                {shift.startTime} – {shift.endTime}
              </p>
            </div>

            {/* Status chip — Draft (dashed) vs Published (solid check) */}
            <span
              className={cn(
                "ml-auto flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase shadow-sm",
                isDraft
                  ? "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-950/40 dark:text-emerald-300",
              )}
            >
              <StatusIcon className="size-2.5" />
              {isDraft ? "Draft" : "Live"}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-popover text-popover-foreground border shadow-md text-xs">
        <p className="font-medium">{position?.name}</p>
        <p>
          {shift.startTime} – {shift.endTime}
        </p>
        <p
          className={cn(
            "mt-1 text-[10px] font-semibold tracking-wider uppercase",
            isDraft
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {isDraft ? "Draft — not published" : "Published"}
        </p>
        {shift.notes && (
          <p className="text-muted-foreground mt-1">{shift.notes}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── TimeOffBar (full-row gradient bar like reference image) ────────────────

function TimeOffBar({
  timeOff,
}: {
  timeOff: EnhancedTimeOffRequest;
}) {
  const meta = timeOffMeta[timeOff.type] ?? timeOffMeta.other;
  const Icon = meta.icon;
  const isPending = timeOff.status === "pending";

  return (
    <div className="relative flex h-[68px] items-center px-3">
      <div
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-2xl bg-gradient-to-r px-4 shadow-md",
          meta.from,
          meta.to,
        )}
      >
        <div className="flex size-7 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm">
          <Icon className="size-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">{meta.label}</span>
        <span
          className={cn(
            "ml-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase shadow-sm",
            isPending
              ? "bg-white/85 text-amber-700"
              : "bg-white/85 text-emerald-700",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isPending ? "bg-amber-500" : "bg-emerald-500",
            )}
          />
          {isPending ? "Pending" : "Approved"}
        </span>
      </div>
    </div>
  );
}

