import { Building2 } from "lucide-react";

import { lookupFacilityByPhone } from "@/data/support-calls";
import { Badge } from "@/components/ui/badge";

export function CallerIdentity({ number }: { number: string }) {
  const facility = lookupFacilityByPhone(number);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className="truncate font-medium">
          {facility ? facility.facilityName : "Unknown Caller"}
        </p>
        {facility && (
          <Badge
            variant="outline"
            className="gap-1 border-violet-500/20 bg-violet-500/10 text-[10px] text-violet-600 dark:text-violet-300"
          >
            <Building2 className="size-2.5" />
            Facility
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">{number}</p>
    </div>
  );
}
