import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface InfoCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "info";
}

const variantStyles = {
  default: "border-l-muted-foreground",
  primary: "border-l-primary",
  success: "border-l-green-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

const iconVariantStyles = {
  default: "text-muted-foreground bg-muted",
  primary: "text-primary bg-primary/10",
  success: "text-green-600 bg-green-500/10",
  warning: "text-amber-600 bg-amber-500/10",
  info: "text-blue-600 bg-blue-500/10",
};

export function InfoCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: InfoCardProps) {
  return (
    <Card
      className={`border-l-4 ${variantStyles[variant]} group transition-all duration-200 hover:shadow-md`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {title}
        </CardTitle>
        <div
          className={`rounded-md p-1.5 ${iconVariantStyles[variant]} transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-xl font-bold tracking-tight">{value}</div>
        {subtitle && (
          <p className="text-muted-foreground mt-0.5 text-[10px]">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
