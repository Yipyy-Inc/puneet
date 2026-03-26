import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBgStyle: React.CSSProperties;
  trend?: { value: string; isPositive: boolean };
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgStyle,
  trend,
}: StatCardProps) {
  return (
    <Card className="hover:shadow-elevated group shadow-card relative overflow-hidden border-0 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {trend && (
                <span
                  className={`inline-flex items-center text-xs font-medium ${trend.isPositive ? "text-success" : "text-destructive"} `}
                >
                  <TrendingUp
                    className={`mr-0.5 h-3 w-3 ${!trend.isPositive && `rotate-180`} `}
                  />
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
            )}
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={iconBgStyle}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
