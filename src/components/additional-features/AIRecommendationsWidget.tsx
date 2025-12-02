"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, TrendingUp, Package, Gift } from "lucide-react";
import { generateAIRecommendations } from "@/data/additional-features";
import type { AIRecommendation } from "@/data/additional-features";

interface CustomerHistory {
  totalVisits?: number;
  lastServices?: string[];
  preferredServices?: string[];
}

interface AIRecommendationsWidgetProps {
  bookingServices: string[];
  customerHistory?: CustomerHistory;
  onAddRecommendation?: (recommendation: AIRecommendation) => void;
}

export function AIRecommendationsWidget({
  bookingServices,
  customerHistory,
  onAddRecommendation,
}: AIRecommendationsWidgetProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const recommendations = useMemo(
    () => generateAIRecommendations(bookingServices, customerHistory),
    [bookingServices, customerHistory],
  );

  const visibleRecommendations = recommendations.filter(
    (rec) => !dismissedIds.has(rec.id),
  );

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const handleAdd = (rec: AIRecommendation) => {
    onAddRecommendation?.(rec);
    handleDismiss(rec.id);
  };

  if (visibleRecommendations.length === 0) {
    return null;
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "upsell":
        return <TrendingUp className="h-4 w-4" />;
      case "cross_sell":
        return <Package className="h-4 w-4" />;
      case "package_upgrade":
        return <Gift className="h-4 w-4" />;
      case "loyalty_reward":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "upsell":
        return "bg-blue-500/10 text-blue-700";
      case "cross_sell":
        return "bg-purple-500/10 text-purple-700";
      case "package_upgrade":
        return "bg-green-500/10 text-green-700";
      case "loyalty_reward":
        return "bg-yellow-500/10 text-yellow-700";
      default:
        return "bg-gray-500/10 text-gray-700";
    }
  };

  return (
    <Card className="border-2 border-yellow-200 bg-linear-to-br from-yellow-50 to-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-600" />
          AI Recommendations
          <Badge variant="secondary" className="ml-auto">
            {visibleRecommendations.length} suggestion
            {visibleRecommendations.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleRecommendations.map((rec) => (
          <div
            key={rec.id}
            className="relative p-4 bg-white rounded-lg border shadow-sm"
          >
            {/* Dismiss button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={() => handleDismiss(rec.id)}
            >
              <X className="h-3 w-3" />
            </Button>

            {/* Content */}
            <div className="pr-8 space-y-3">
              {/* Header */}
              <div className="flex items-start gap-2">
                <Badge className={getTypeColor(rec.type)}>
                  {getTypeIcon(rec.type)}
                  <span className="ml-1 capitalize">
                    {rec.type.replace("_", " ")}
                  </span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {rec.confidence}% confidence
                </Badge>
              </div>

              {/* Title and Description */}
              <div>
                <h4 className="font-semibold text-sm">{rec.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {rec.description}
                </p>
              </div>

              {/* Recommended Item */}
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                <div>
                  <p className="text-sm font-medium">
                    {rec.recommendedItem.name}
                  </p>
                  {rec.recommendedItem.discount && (
                    <p className="text-xs text-green-600 font-medium">
                      Save ${rec.recommendedItem.discount}!
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {rec.recommendedItem.discount && (
                    <p className="text-xs text-muted-foreground line-through">
                      $
                      {rec.recommendedItem.price + rec.recommendedItem.discount}
                    </p>
                  )}
                  <p className="text-lg font-bold">
                    ${rec.recommendedItem.price}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <p className="text-xs text-muted-foreground italic">
                💡 {rec.reason}
              </p>

              {/* Action */}
              <Button
                className="w-full"
                size="sm"
                onClick={() => handleAdd(rec)}
              >
                Add to Booking (+${rec.estimatedValue})
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
