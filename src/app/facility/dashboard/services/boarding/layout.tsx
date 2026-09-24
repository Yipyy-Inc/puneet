"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/use-settings";
import {
  Bed,
  DollarSign,
  LayoutGrid,
  Settings,
  FileText,
  Building2,
  Package,
  ClipboardList,
  ListChecks,
} from "lucide-react";

const tabs = [
  {
    name: "Dashboard",
    href: "/facility/dashboard/services/boarding",
    icon: Bed,
  },
  {
    name: "Rooms",
    href: "/facility/dashboard/services/boarding/rooms",
    icon: Building2,
  },
  // THE MENU AND THE BUILDING ARE TWO TABS NOW, because Phase 5 made them two
  // objects. "Rooms" is the lodging types and their units; "Menu" is what may
  // be sold into them. "Rates" still edits the kennel class's own nightly
  // rate, which is what prices every booking made before the cutover and the
  // fallback whenever a booking names no service.
  {
    name: "Menu",
    href: "/facility/dashboard/services/boarding/menu",
    icon: ListChecks,
  },
  {
    name: "Rates",
    href: "/facility/dashboard/services/boarding/rates",
    icon: DollarSign,
  },
  {
    name: "Packages",
    href: "/facility/dashboard/services/boarding/packages",
    icon: Package,
  },
  {
    name: "Operations",
    href: "/facility/dashboard/services/boarding/ops",
    icon: LayoutGrid,
  },
  {
    name: "Tasks",
    href: "/facility/dashboard/services/boarding/tasks",
    icon: ClipboardList,
  },
  {
    name: "Report Cards",
    href: "/facility/dashboard/services/boarding/report-cards",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/facility/dashboard/services/boarding/settings",
    icon: Settings,
  },
];

// ── WHY THERE IS NO ENABLE/DISABLE SWITCH HERE ────────────────────────────
//
// There was one, with a confirmation dialog and a "reason for disabling" box.
// A facility is not who decides which modules they have — that is a platform
// decision, made where the subscription is. Leaving the control on the
// facility's own screen offered them a choice they do not have, and asking
// WHY made it look like the answer went somewhere.
//
// Removed 2026-09-24 on the client's instruction. The badge beside the title
// stays: it REPORTS the state, which is worth knowing when a module's screens
// are missing, and reporting is not the same as offering to change it.

export default function BoardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { boarding } = useSettings();

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-16 z-10 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-500">
                <Bed className="size-5 text-white" />
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  Boarding Module
                  <Badge
                    variant={
                      boarding.status.disabled ? "destructive" : "default"
                    }
                  >
                    {boarding.status.disabled ? "Disabled" : "Enabled"}
                  </Badge>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage boarding guests, rates, care sheets, and kennel cards
                </p>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/facility/dashboard/services/boarding" &&
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
