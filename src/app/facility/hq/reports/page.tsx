import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  UserCog,
  ArrowLeftRight,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const reports = [
  {
    href: "/facility/hq/reports/client-activity",
    title: "Cross-Location Client Activity",
    desc: "Clients who visit multiple locations — visits, spend, loyalty",
    icon: Users,
    tone: "from-sky-500/10 to-sky-500/0",
    iconBg: "bg-sky-500/10 text-sky-600",
  },
  {
    href: "/facility/hq/reports/staff-performance",
    title: "Staff Cross-Location Performance",
    desc: "Per-location ratings, completion rate, revenue for shared staff",
    icon: UserCog,
    tone: "from-violet-500/10 to-violet-500/0",
    iconBg: "bg-violet-500/10 text-violet-600",
  },
  {
    href: "/facility/hq/reports/transfer-impact",
    title: "Transfer Impact Report",
    desc: "Revenue impact and client retention after booking transfers",
    icon: ArrowLeftRight,
    tone: "from-emerald-500/10 to-emerald-500/0",
    iconBg: "bg-emerald-500/10 text-emerald-600",
  },
  {
    href: "/facility/hq/comparison",
    title: "Location Comparison",
    desc: "Side-by-side metrics for every location — your Monday-morning report",
    icon: BarChart3,
    tone: "from-amber-500/10 to-amber-500/0",
    iconBg: "bg-amber-500/10 text-amber-600",
  },
];

export default function HQReportsHub() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HQ Reports</h1>
        <p className="text-muted-foreground text-sm">
          Cross-location analytics designed for owners and HQ managers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="group relative overflow-hidden transition-all hover:shadow-md">
              <div
                className={cn(
                  "absolute inset-0 bg-linear-to-br opacity-50 transition-opacity group-hover:opacity-80",
                  r.tone,
                )}
              />
              <CardContent className="relative flex items-center gap-4 py-5">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl",
                    r.iconBg,
                  )}
                >
                  <r.icon className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold">{r.title}</p>
                  <p className="text-muted-foreground text-xs">{r.desc}</p>
                </div>
                <ArrowRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
