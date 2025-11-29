"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Lead,
  PipelineStage,
  pipelineStageLabels,
  pipelineStageOrder,
  pipelineStageColors,
} from "@/data/crm/leads";

interface ConversionFunnelProps {
  leads: Lead[];
  showPercentages?: boolean;
  showValues?: boolean;
}

interface StageData {
  stage: PipelineStage;
  label: string;
  count: number;
  value: number;
  percentage: number;
  conversionFromPrevious: number;
  color: string;
}

export function ConversionFunnel({
  leads,
  showPercentages = true,
  showValues = true,
}: ConversionFunnelProps) {
  const funnelData = useMemo(() => {
    const activePipelineStages = pipelineStageOrder.filter(
      (stage) => stage !== "closed_won" && stage !== "closed_lost",
    );

    const totalLeads = leads.length;

    // First pass: calculate counts for each stage
    const stageCounts = activePipelineStages.map((stage) => {
      const stageLeads = leads.filter((lead) => {
        const stageIndex = pipelineStageOrder.indexOf(lead.status);
        const currentStageIndex = pipelineStageOrder.indexOf(stage);
        return stageIndex >= currentStageIndex && lead.status !== "closed_lost";
      });
      return {
        stage,
        count: stageLeads.length,
        value: stageLeads.reduce(
          (sum, lead) => sum + lead.estimatedAnnualValue,
          0,
        ),
      };
    });

    // Second pass: build data with conversion rates
    const data: StageData[] = stageCounts.map((item, index) => {
      const previousCount =
        index === 0 ? totalLeads : stageCounts[index - 1].count;
      const percentage = totalLeads > 0 ? (item.count / totalLeads) * 100 : 0;
      const conversionFromPrevious =
        index === 0 || previousCount === 0
          ? 100
          : (item.count / previousCount) * 100;

      return {
        stage: item.stage,
        label: pipelineStageLabels[item.stage],
        count: item.count,
        value: item.value,
        percentage,
        conversionFromPrevious,
        color: pipelineStageColors[item.stage],
      };
    });

    // Add closed won as the final funnel stage
    const wonLeads = leads.filter((lead) => lead.status === "closed_won");
    const wonCount = wonLeads.length;
    const wonValue = wonLeads.reduce(
      (sum, lead) => sum + lead.estimatedAnnualValue,
      0,
    );
    const lastStageCount =
      stageCounts.length > 0
        ? stageCounts[stageCounts.length - 1].count
        : totalLeads;

    data.push({
      stage: "closed_won",
      label: pipelineStageLabels["closed_won"],
      count: wonCount,
      value: wonValue,
      percentage: totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0,
      conversionFromPrevious:
        lastStageCount > 0 ? (wonCount / lastStageCount) * 100 : 0,
      color: pipelineStageColors["closed_won"],
    });

    return data;
  }, [leads]);

  const maxCount = Math.max(...funnelData.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelData.map((data, index) => {
            const widthPercentage = (data.count / maxCount) * 100;
            const minWidth = 20; // Minimum width percentage
            const displayWidth = Math.max(widthPercentage, minWidth);

            return (
              <div key={data.stage} className="relative">
                {/* Conversion arrow */}
                {index > 0 && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                    ↓ {data.conversionFromPrevious.toFixed(0)}%
                  </div>
                )}

                {/* Funnel bar */}
                <div
                  className="relative mx-auto transition-all duration-300"
                  style={{ width: `${displayWidth}%` }}
                >
                  <div
                    className={`${data.color} rounded-lg p-3 text-white relative overflow-hidden`}
                  >
                    {/* Gradient overlay for depth effect */}
                    <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent" />

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">
                          {data.label}
                        </span>
                        <span className="text-white/90 text-sm">
                          {data.count} leads
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        {showValues && (
                          <span className="font-medium">
                            ${data.value.toLocaleString()}
                          </span>
                        )}
                        {showPercentages && (
                          <span className="text-white/80 text-xs">
                            {data.percentage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{leads.length}</div>
            <div className="text-xs text-muted-foreground">Total Leads</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {leads.filter((l) => l.status === "closed_won").length}
            </div>
            <div className="text-xs text-muted-foreground">Converted</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {leads.length > 0
                ? (
                    (leads.filter((l) => l.status === "closed_won").length /
                      leads.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <div className="text-xs text-muted-foreground">
              Overall Conversion
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
