"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import {
  Award,
  Coins,
  Crown,
  Gift,
  Medal,
  Target,
  Receipt,
  Users,
  SlidersHorizontal,
  LayoutDashboard,
} from "lucide-react";

const tabs = [
  {
    name: "Overview",
    href: "/facility/dashboard/loyalty",
    icon: LayoutDashboard,
  },
  {
    name: "Earn Rules",
    href: "/facility/dashboard/loyalty/earn-rules",
    icon: Coins,
  },
  {
    name: "Tiers",
    href: "/facility/dashboard/loyalty/tiers",
    icon: Crown,
  },
  {
    name: "Rewards",
    href: "/facility/dashboard/loyalty/rewards",
    icon: Gift,
  },
  {
    name: "Badges",
    href: "/facility/dashboard/loyalty/badges",
    icon: Medal,
  },
  {
    name: "Referrals",
    href: "/facility/dashboard/loyalty/referrals",
    icon: Target,
  },
  {
    name: "Members",
    href: "/facility/dashboard/loyalty/members",
    icon: Users,
  },
  {
    name: "Redemptions",
    href: "/facility/dashboard/loyalty/redemptions",
    icon: Receipt,
  },
  {
    name: "Advanced",
    href: "/facility/dashboard/loyalty/advanced",
    icon: SlidersHorizontal,
  },
];

export default function LoyaltyConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { config, patchConfig } = useLoyaltyProgram();

  const handleToggleEnabled = (checked: boolean) => {
    patchConfig({ enabled: checked });
    toast.success(
      checked ? "Loyalty program enabled" : "Loyalty program disabled",
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-16 z-10 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-500">
                <Award className="size-5 text-white" />
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  {config.programName || "Loyalty Program"}
                  <Badge variant={config.enabled ? "default" : "secondary"}>
                    {config.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Configure earning rules, tiers, rewards, badges, and referrals
                  for this facility
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Enabled</span>
              <Switch
                checked={config.enabled}
                onCheckedChange={handleToggleEnabled}
                aria-label="Enable loyalty program"
              />
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/facility/dashboard/loyalty" &&
                pathname.startsWith(tab.href));
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  "hover:bg-muted/50",
                  isActive
                    ? "border-primary bg-background text-primary border-b-2"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
