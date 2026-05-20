import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Spec § 10.5 — when in HQ View, each insight card shows a small location
 * tag indicating which location the insight belongs to.
 */
export function LocationTag({ locationName }: { locationName: string }) {
  return (
    <Badge variant="outline" className="gap-1 bg-white text-[10px]">
      <MapPin className="size-3" />
      {locationName}
    </Badge>
  );
}
