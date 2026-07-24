"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import type { ServiceMixRow } from "@/data/hq-analytics";
import { ReportTooltip } from "@/components/reports/chart-kit";

interface Props {
  data: ServiceMixRow[];
  height?: number;
}

export function ServiceMixChart({ data, height = 260 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="service"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.service}
              fill={entry.color}
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          content={
            <ReportTooltip format="currency" nameFormatter={() => "Revenue"} />
          }
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 11 }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
