"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Scissors } from "lucide-react";
import { getCurrentUserId } from "@/lib/role-utils";
import { useStylists } from "@/lib/api/stylists";
import { signOutEverywhere } from "@/lib/auth/sign-out-client";

export function GroomerHeader() {
  const userId = getCurrentUserId();
  const { data: stylists = [] } = useStylists();
  const groomer = userId
    ? stylists.find((s) => s.id === userId)
    : (stylists[0] ?? null);

  // Was: clear a `current_user_id` cookie that nothing ever set, then route to
  // the login page. No session was ended, and the key it cleared was not even
  // the one in use (`facility_current_user_id`).
  const handleLogout = () => {
    void signOutEverywhere();
  };

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hover:bg-muted size-9 rounded-xl transition-colors md:hidden" />
        <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-pink-500 to-rose-500">
          <Scissors className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Groomer Portal</h1>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {groomer && (
          <div className="text-sm">
            <span className="text-muted-foreground">Welcome, </span>
            <span className="font-medium">{groomer.name}</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
