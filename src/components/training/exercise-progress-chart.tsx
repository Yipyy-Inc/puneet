"use client";

/**
 * Reusable per-exercise progress chart.
 *
 * Renders one exercise's rating-over-time as a line + gradient area. Built
 * to be shared between the facility-side Training Profile and the customer
 * portal's progress view so both surfaces tell the same story with the same
 * pixels.
 */
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatDateShort } from "@/lib/i18n/format";

/** A single rating point — one session worth of data. */
export interface ExerciseProgressPoint {
  /** Session number relative to the program (1-indexed). */
  sessionNumber: number;
  /** ISO date the rating was logged. */
  date: string;
  /** The numeric rating, 1-5. */
  rating: 1 | 2 | 3 | 4 | 5;
  /** Optional series/program name — surfaces in the tooltip. */
  context?: string;
}

interface Props {
  /** Sorted oldest → newest. */
  data: ExerciseProgressPoint[];
  /** Hex color for the line + area gradient. Defaults to indigo when omitted. */
  color?: string;
  /** Pixel height for the chart. Default 160 keeps the grid scannable. */
  height?: number;
}

// The rating vocabulary is the catalogue's `rating1`…`rating5` — the same
// words the trainer rates with — so the y-axis is self-explaining without a
// separate legend, in either language.

// A calendar date, read at local midnight so no zone can move it.
function localDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface TooltipPayload {
  payload?: ExerciseProgressPoint;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  const t = useShellText("training");
  const locale = useShellLocale();
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
        {t("sessionN").replace("{n}", String(point.sessionNumber))}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-slate-800">
        {t("ratingN")
          .replace("{n}", String(point.rating))
          .replace("{label}", t(`rating${point.rating}`))}
      </p>
      <p className="text-muted-foreground mt-1 text-[11px]">
        {formatDateShort(localDay(point.date), locale)}
        {point.context && (
          <>
            <span className="mx-1">·</span>
            {point.context}
          </>
        )}
      </p>
    </div>
  );
}

export function ExerciseProgressChart({
  data,
  color = "#6366f1",
  height = 160,
}: Props) {
  const t = useShellText("training");
  // Recharts behaves better when a single-point series gets an invisible
  // ghost point so the line/area has something to render — without this a
  // single-rating exercise renders an empty plot.
  const padded =
    data.length === 1
      ? [
          {
            ...data[0],
            sessionNumber: data[0].sessionNumber - 0.5,
            rating: data[0].rating,
          },
          ...data,
        ]
      : data;

  const gradientId = `exercise-progress-gradient-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={padded}
        margin={{ top: 8, right: 12, left: 6, bottom: 4 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="rgb(226 232 240)"
        />
        <XAxis
          dataKey="sessionNumber"
          tick={{ fontSize: 10, fill: "rgb(100 116 139)" }}
          tickLine={false}
          stroke="rgb(203 213 225)"
          tickFormatter={(v) => `S${v}`}
        />
        <YAxis
          domain={[0.5, 5.5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 10, fill: "rgb(100 116 139)" }}
          tickLine={false}
          stroke="rgb(203 213 225)"
          // Wider axis so "5 Mastered" fits without truncating. Labels
          // collapse to just the number on very narrow chart sizes via the
          // `tickFormatter` width check at render time would be overkill
          // here — every consumer renders at ≥ 200px wide.
          width={70}
          tickFormatter={(v) => `${v} ${t(`rating${v}`)}`}
        />
        {/* Faint guide at "Good" (3) — anchors the eye on the midpoint */}
        <ReferenceLine y={3} stroke="rgb(203 213 225)" strokeDasharray="2 4" />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: color, strokeOpacity: 0.2 }}
        />
        <Area
          type="monotone"
          dataKey="rating"
          stroke="none"
          fill={`url(#${gradientId})`}
          fillOpacity={1}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="rating"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3.5, strokeWidth: 2, fill: "#fff", stroke: color }}
          activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
