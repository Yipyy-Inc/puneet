"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  ArrowLeftRight,
  BarChart3,
  UserRound,
  GraduationCap,
  Plug,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

// HQ-scoped navigation (Area 11). "HQ Reports" and "Compare Locations" are
// intentionally absent — removed / absorbed into Performance and Clients.
const HQ_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Command Center",
        href: "/facility/hq/overview",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Locations", href: "/facility/hq/locations", icon: Building2 },
      { label: "Staff Pool", href: "/facility/hq/staff", icon: Users },
      {
        label: "Service Catalog",
        href: "/facility/hq/services",
        icon: Package,
      },
      {
        label: "Transfer Center",
        href: "/facility/hq/transfers",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    label: "Analyse",
    items: [
      {
        label: "Performance",
        href: "/facility/hq/performance",
        icon: BarChart3,
      },
      { label: "Clients HQ", href: "/facility/hq/clients", icon: UserRound },
      {
        label: "Training HQ",
        href: "/facility/hq/training",
        icon: GraduationCap,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Integrations",
        href: "/facility/hq/integrations",
        icon: Plug,
      },
      { label: "HQ Settings", href: "/facility/hq/settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  // Command Center owns both the HQ root and /overview.
  if (href === "/facility/hq/overview") {
    return (
      pathname === "/facility/hq" ||
      pathname.startsWith("/facility/hq/overview")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * HQ-scoped sidebar navigation, rendered for /facility/hq/*. Groups are shown
 * as small ALL-CAPS non-selectable section dividers (premium-SaaS style) with
 * selectable items beneath.
 */
export function HqSidebarNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="HQ navigation"
      className="hidden w-56 shrink-0 border-r md:block"
    >
      <div className="sticky top-16 space-y-0.5 px-2 py-4">
        <div className="mb-1 flex items-center gap-2 px-3">
          <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm leading-none font-semibold">Headquarters</p>
            <p className="text-muted-foreground text-[11px]">All locations</p>
          </div>
        </div>

        {HQ_NAV.map((group) => (
          <div key={group.label}>
            <p className="text-muted-foreground px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wider uppercase">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=false]:text-muted-foreground data-[active=false]:hover:bg-muted/60 data-[active=false]:hover:text-foreground flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
