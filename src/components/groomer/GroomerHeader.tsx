"use client";

import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import { getCurrentUserId } from "@/lib/role-utils";
import { stylists } from "@/data/grooming";
import { useRouter } from "next/navigation";

export function GroomerHeader() {
  const router = useRouter();
  const userId = getCurrentUserId();
  const groomer = userId ? stylists.find((s) => s.id === userId) : stylists[0] || null;

  const handleLogout = () => {
    // Clear user ID
    if (typeof document !== "undefined") {
      document.cookie = "current_user_id=; path=/; max-age=0";
    }
    router.push("/groomer/auth/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-pink-500 to-rose-500">
          <Scissors className="h-5 w-5 text-white" />
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
