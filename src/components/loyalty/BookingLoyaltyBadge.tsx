"use client";

import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from "lucide-react";

interface BookingLoyaltyBadgeProps {
  pointsEarned?: number;
  tierDiscount?: number;
  showPoints?: boolean;
}

export function BookingLoyaltyBadge({
  pointsEarned,
  tierDiscount,
  showPoints = true,
}: BookingLoyaltyBadgeProps) {
  if (!pointsEarned && !tierDiscount) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {pointsEarned && pointsEarned > 0 && showPoints && (
        <Badge className="bg-green-500 hover:bg-green-600">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{pointsEarned} pts
        </Badge>
      )}
      {tierDiscount && tierDiscount > 0 && (
        <Badge variant="outline" className="border-primary text-primary">
          <Star className="h-3 w-3 mr-1" />
          {tierDiscount}% tier discount
        </Badge>
      )}
    </div>
  );
}
