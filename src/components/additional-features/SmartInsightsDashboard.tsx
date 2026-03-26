"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
} from "lucide-react";
import { smartInsights } from "@/data/additional-features";

export function SmartInsightsDashboard() {
  const [insights] = useState(smartInsights);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { value: "all", label: "All Insights" },
    { value: "revenue", label: "Revenue" },
    { value: "operations", label: "Operations" },
    { value: "customers", label: "Customers" },
    { value: "staff", label: "Staff" },
    { value: "marketing", label: "Marketing" },
  ];

  const filteredInsights =
    selectedCategory === "all"
      ? insights
      : insights.filter((insight) => insight.category === selectedCategory);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="size-4 text-red-500" />;
      case "medium":
        return <Info className="size-4 text-yellow-500" />;
      case "low":
        return <CheckCircle className="size-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      default:
        return "";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="size-4 text-green-600" />;
      case "down":
        return <TrendingDown className="size-4 text-red-600" />;
      case "stable":
        return <Minus className="size-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      revenue: "bg-green-500/10 text-green-700",
      operations: "bg-blue-500/10 text-blue-700",
      customers: "bg-purple-500/10 text-purple-700",
      staff: "bg-orange-500/10 text-orange-700",
      marketing: "bg-pink-500/10 text-pink-700",
    };
    return colors[category as keyof typeof colors] || "";
  };

  const highPriorityCount = insights.filter(
    (i) => i.priority === "high",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Lightbulb className="size-6 text-yellow-500" />
            Smart Insights
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            AI-powered recommendations to optimize your facility
          </p>
        </div>
        {highPriorityCount > 0 && (
          <Badge variant="destructive" className="text-sm">
            {highPriorityCount} High Priority
          </Badge>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.value}
            variant={
              selectedCategory === category.value ? "default" : "outline"
            }
            size="sm"
            onClick={() => setSelectedCategory(category.value)}
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Insights Grid */}
      <div className="grid gap-4">
        {filteredInsights.map((insight) => (
          <Card key={insight.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  {getPriorityIcon(insight.priority)}
                  <div className="flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                      {insight.title}
                      <Badge className={getCategoryColor(insight.category)}>
                        {insight.category}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        {getTrendIcon(insight.trend)}
                        {insight.trend}
                      </Badge>
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {insight.description}
                    </p>
                  </div>
                </div>
                <Badge className={getPriorityColor(insight.priority)}>
                  {insight.priority} priority
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Impact & Recommendation */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="mb-1 text-xs font-semibold text-blue-900">
                    💡 Impact
                  </p>
                  <p className="text-sm text-blue-800">{insight.impact}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="mb-1 text-xs font-semibold text-green-900">
                    ✨ Recommendation
                  </p>
                  <p className="text-sm text-green-800">
                    {insight.recommendation}
                  </p>
                </div>
              </div>

              {/* Data Points */}
              <div className="flex flex-wrap items-center gap-4">
                {insight.dataPoints.map((dp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {dp.label}
                      </p>
                      <p className="text-lg font-bold">{dp.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t pt-2">
                <p className="text-muted-foreground text-xs">
                  Generated {new Date(insight.generatedAt).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Dismiss
                  </Button>
                  <Button size="sm">
                    Take Action
                    <ExternalLink className="ml-1 size-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
