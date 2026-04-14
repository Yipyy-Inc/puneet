import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Conflict } from "@/lib/scheduling-conflicts";

interface Props {
  conflicts: Conflict[];
  className?: string;
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    container:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200",
    iconColor: "text-red-600 dark:text-red-400",
    label: "Blocking",
  },
  warning: {
    icon: AlertTriangle,
    container:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
    iconColor: "text-amber-600 dark:text-amber-400",
    label: "Warning",
  },
  info: {
    icon: Info,
    container:
      "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200",
    iconColor: "text-blue-600 dark:text-blue-400",
    label: "Info",
  },
};

export function ConflictList({ conflicts, className }: Props) {
  if (conflicts.length === 0) return null;

  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      {conflicts.map((c, idx) => {
        const cfg = severityConfig[c.severity];
        const Icon = cfg.icon;
        return (
          <div
            key={`${c.kind}-${idx}`}
            className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs ${cfg.container}`}
          >
            <Icon className={`mt-0.5 size-3.5 shrink-0 ${cfg.iconColor}`} />
            <span className="leading-snug">{c.message}</span>
          </div>
        );
      })}
    </div>
  );
}
