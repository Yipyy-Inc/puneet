"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Calendar } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "My Schedule",
    url: "/staff",
    icon: Calendar,
  },
];

export function StaffSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-500">
            <Calendar className="size-4 text-white" />
          </div>
          <span className="font-semibold">Staff Portal</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.url || pathname.startsWith(item.url + "/");

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.url}>
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
