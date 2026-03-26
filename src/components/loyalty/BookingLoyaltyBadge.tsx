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
    <div className="flex flex-wrap items-center gap-2">
      {pointsEarned && pointsEarned > 0 && showPoints && (
        <Badge className="bg-green-500 hover:bg-green-600">
          <TrendingUp className="mr-1 h-3 w-3" />+{pointsEarned} pts
        </Badge>
      )}
      {tierDiscount && tierDiscount > 0 && (
        <Badge variant="outline" className="border-primary text-primary">
          <Star className="mr-1 h-3 w-3" />
          {tierDiscount}% tier discount
        </Badge>
      )}
    </div>
  );
}
