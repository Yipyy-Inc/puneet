"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/use-settings";
import {
  Sun,
  DollarSign,
  Package,
  FileText,
  Settings,
  Home,
  ClipboardList,
} from "lucide-react";
import { settingsHref } from "@/lib/settings/nav";

const tabs = [
  {
    name: "Dashboard",
    href: "/facility/dashboard/services/daycare",
    icon: Sun,
  },
  {
    name: "Rates",
    href: "/facility/dashboard/services/daycare/rates",
    icon: DollarSign,
  },
  {
    name: "Packages",
    href: "/facility/dashboard/services/daycare/packages",
    icon: Package,
  },
  {
    name: "Rooms",
    href: "/facility/dashboard/services/daycare/rooms",
    icon: Home,
  },
  {
    name: "Tasks",
    href: "/facility/dashboard/services/daycare/tasks",
    icon: ClipboardList,
  },
  {
    name: "Report Cards",
    href: "/facility/dashboard/services/daycare/report-cards",
    icon: FileText,
  },
  {
    name: "Settings",
    href: settingsHref("daycare"),
    icon: Settings,
  },
];

// ── WHY THERE IS NO ENABLE/DISABLE SWITCH HERE ────────────────────────────
//
// There was one, with a confirmation dialog and a "reason for disabling" box.
// A facility is not who decides which modules they have — that is a platform
// decision, made where the subscription is. Leaving the control on the
// facility's own screen offered them a choice they do not have, and the
// dialog asking WHY made it look like the answer went somewhere.
//
// Removed 2026-09-24 on the client's instruction. The badge beside the title
// stays: it REPORTS the state, which is worth knowing when a module's screens
// are missing, and reporting is not the same as offering to change it.
//
// ── AND NO "BOOK" BUTTON ──────────────────────────────────────────────────
//
// Removed in the same pass. Every way into the booking wizard is already on
// the screens that know what is being booked — the dashboard, the calendar,
// a client's file — and a module header is not one of them: it knew the
// service and nothing else, so it opened a wizard with the client still to be
// found.

export default function DaycareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { daycare } = useSettings();

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-16 z-50 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-500">
                <Sun className="size-5 text-white" />
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  Daycare Module
                  <Badge
                    variant={
                      daycare.status.disabled ? "destructive" : "default"
                    }
                  >
                    {daycare.status.disabled ? "Disabled" : "Enabled"}
                  </Badge>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage daycare operations, check-ins, rates, and report cards
                </p>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/facility/dashboard/services/daycare" &&
                pathname.startsWith(tab.href));
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  `flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors`,
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
