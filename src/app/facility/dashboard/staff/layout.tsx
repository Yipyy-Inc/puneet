"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Users,
  ClipboardList,
  TrendingUp,
  FileSignature,
  Eye,
} from "lucide-react";
import {
  FacilityRbacProvider,
  useFacilityViewer,
} from "@/hooks/use-facility-rbac";
import { facilityStaff } from "@/data/facility-staff";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_META } from "@/types/facility-staff";

const staffTabs = [
  {
    name: "Directory",
    href: "/facility/dashboard/staff",
    icon: Users,
  },
  {
    name: "Tasks",
    href: "/facility/dashboard/staff/tasks",
    icon: ClipboardList,
  },
  {
    name: "Documents",
    href: "/facility/dashboard/staff/documents",
    icon: FileSignature,
  },
  {
    name: "Performance",
    href: "/facility/dashboard/staff/performance",
    icon: TrendingUp,
  },
];

function ViewingAsSwitcher() {
  const { viewerId, setViewerId, viewer } = useFacilityViewer();
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Eye className="size-3" /> Viewing as
      </div>
      <Select value={viewerId} onValueChange={setViewerId}>
        <SelectTrigger className="h-8 w-52 text-xs">
          <SelectValue>
            <span className="truncate">
              {viewer.firstName} {viewer.lastName}
              <span className="text-muted-foreground ml-1.5">
                · {ROLE_META[viewer.primaryRole].label}
              </span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {facilityStaff.map((s) => (
            <SelectItem key={s.id} value={s.id} className="text-xs">
              <span className="font-medium">
                {s.firstName} {s.lastName}
              </span>
              <span className="text-muted-foreground ml-1.5">
                · {ROLE_META[s.primaryRole].label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StaffLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActiveTab = (href: string) => {
    if (href === "/facility/dashboard/staff") {
      return (
        pathname === "/facility/dashboard/staff" ||
        pathname === "/facility/dashboard/staff/directory"
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
        <ViewingAsSwitcher />
      </div>

      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {staffTabs.map((tab) => {
            const isActive = isActiveTab(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  `group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors`,
                  isActive
                    ? "border-primary text-primary"
                    : `text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground border-transparent`,
                )}
              >
                <tab.icon
                  className={cn(
                    "size-4",
                    isActive
                      ? "text-primary"
                      : `text-muted-foreground group-hover:text-foreground`,
                  )}
                />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FacilityRbacProvider>
      <StaffLayoutShell>{children}</StaffLayoutShell>
    </FacilityRbacProvider>
  );
}
