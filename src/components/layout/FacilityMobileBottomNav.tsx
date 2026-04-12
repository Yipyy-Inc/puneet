"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Grid3X3, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/facility/dashboard",
    icon: Home,
  },
  {
    label: "Kennel",
    href: "/facility/dashboard/kennel-view",
    icon: Grid3X3,
  },
  {
    label: "Calendar",
    href: "/facility/dashboard/calendar",
    icon: CalendarDays,
  },
  {
    label: "Tasks",
    href: "/facility/dashboard/tasks",
    icon: ClipboardList,
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/facility/dashboard") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function FacilityMobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed right-0 bottom-14 left-0 z-[45] border-t border-slate-200 bg-white/95 px-2 py-1.5 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-4 gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition",
                  active
                    ? "bg-sky-100 text-sky-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
