import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  highPriorityCount: number;
}

export function InsightsHeader({ highPriorityCount }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="size-6 text-amber-500" />
          Smart Insights
        </h1>
        <p className="text-muted-foreground text-sm">
          AI-powered recommendations to optimize your facility
        </p>
      </div>
      {highPriorityCount > 0 && (
        <Badge
          variant="destructive"
          className="h-8 shrink-0 gap-1.5 px-3 text-sm font-semibold"
        >
          <span className="inline-block size-2 rounded-full bg-white/90" />
          {highPriorityCount} High Priority
        </Badge>
      )}
    </div>
  );
}
