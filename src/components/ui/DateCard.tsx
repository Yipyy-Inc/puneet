import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface InfoCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "info";
}

// ── WHY THERE IS NO `variantStyles` HERE ANY MORE ─────────────────────────
//
// It held one class per variant — `border-l-primary`, `border-l-green-500` and
// so on — painting a 4px stripe down the left edge of the card. §6 rule 1
// bans exactly that, and the reason applies literally here: the card is
// `rounded-xl`, so the stripe squared off two of its corners.
//
// Nothing was lost by deleting it. `iconVariantStyles` below already carries
// the variant in the icon chip, which is a shape the rule allows and which
// sits beside the label instead of at the edge of the container. The stripe
// was a second copy of the same signal.
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
    <Card className="group transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {title}
        </CardTitle>
        <div
          className={`rounded-md p-1.5 ${iconVariantStyles[variant]} transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon className="size-3.5" />
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
