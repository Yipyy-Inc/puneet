"use client";

import { Button } from "@/components/ui/button";
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
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">My Schedule</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {staffMember && (
          <div className="hidden sm:block text-sm">
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
