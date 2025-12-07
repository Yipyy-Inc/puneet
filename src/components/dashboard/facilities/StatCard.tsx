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
    <Card className="relative overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {trend && (
                <span
                  className={`inline-flex items-center text-xs font-medium ${
                    trend.isPositive ? "text-success" : "text-destructive"
                  }`}
                >
                  <TrendingUp
                    className={`h-3 w-3 mr-0.5 ${!trend.isPositive && "rotate-180"}`}
                  />
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={iconBgStyle}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
