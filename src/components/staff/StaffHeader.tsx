"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Calendar } from "lucide-react";
import { getCurrentUserId } from "@/lib/role-utils";
import { users } from "@/data/users";
import { useRouter } from "next/navigation";

export function StaffHeader() {
  const router = useRouter();
  const userId = getCurrentUserId();
  const staffMember = userId
    ? users.find((u) => u.id.toString() === userId || u.email === userId)
    : users.find((u) => u.role === "Staff") || null;

  const handleLogout = () => {
    // Clear user ID
    if (typeof document !== "undefined") {
      document.cookie = "current_user_id=; path=/; max-age=0";
      localStorage.removeItem("current_user_id");
    }
    router.push("/staff/auth/login");
  };

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hover:bg-muted size-9 rounded-xl transition-colors md:hidden" />
        <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-500">
          <Calendar className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">My Schedule</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {staffMember && (
          <div className="hidden text-sm sm:block">
            <span className="text-muted-foreground">Welcome, </span>
            <span className="font-medium">{staffMember.name}</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <span className="hidden sm:inline">Logout</span>
          <span className="sm:hidden">Out</span>
        </Button>
      </div>
    </header>
  );
}
