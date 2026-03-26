import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "info"
    | "secondary";
}

const variantStyles = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  primary: {
    iconBg: "bg-gradient-to-br from-primary to-primary/80",
    iconColor: "text-primary-foreground",
  },
  success: {
    iconBg: "bg-gradient-to-br from-success to-success/80",
    iconColor: "text-success-foreground",
  },
  warning: {
    iconBg: "bg-gradient-to-br from-warning to-warning/80",
    iconColor: "text-warning-foreground",
  },
  info: {
    iconBg: "bg-gradient-to-br from-info to-info/80",
    iconColor: "text-info-foreground",
  },
  secondary: {
    iconBg: "bg-gradient-to-br from-secondary to-secondary/80",
    iconColor: "text-secondary-foreground",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changeType = "neutral",
  icon: Icon,
  variant = "primary",
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className="hover:shadow-elevated group shadow-card relative overflow-hidden border-0 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {change && (
                <span
                  className={cn(
                    "inline-flex items-center text-xs font-medium",
                    changeType === "up" && "text-success",
                    changeType === "down" && "text-destructive",
                    changeType === "neutral" && "text-muted-foreground",
                  )}
                >
                  {changeType === "up" && (
                    <TrendingUp className="mr-0.5 h-3 w-3" />
                  )}
                  {changeType === "down" && (
                    <TrendingDown className="mr-0.5 h-3 w-3" />
                  )}
                  {change}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-muted-foreground text-xs">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              `flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110`,
              styles.iconBg,
            )}
          >
            <Icon className={cn("h-5 w-5", styles.iconColor)} />
          </div>
        </div>
      </CardContent>

      {/* Decorative gradient overlay */}
      <div
        className="pointer-events-none absolute top-0 right-0 h-24 w-24 opacity-5"
        style={{
          background: `radial-gradient(circle at top right, currentColor 0%, transparent 70%)`,
        }}
      />
    </Card>
  );
}
