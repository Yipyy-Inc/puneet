import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";

import { overallStatus } from "@/data/status-page";
import { cn } from "@/lib/utils";

import { OVERALL_HEADLINE, STATUS_META } from "./status-styles";

export function OverallBanner() {
  const status = overallStatus();
  const meta = STATUS_META[status];
  const Icon =
    status === "operational"
      ? CheckCircle2
      : status === "maintenance"
        ? Wrench
        : AlertTriangle;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-5",
        meta.banner,
      )}
    >
      <Icon className={cn("size-8 shrink-0", meta.bannerText)} />
      <div>
        <p className={cn("text-xl font-semibold", meta.bannerText)}>
          {OVERALL_HEADLINE[status]}
        </p>
        <p className="text-muted-foreground text-sm">
          Current status of the services facilities rely on.
        </p>
      </div>
    </div>
  );
}
