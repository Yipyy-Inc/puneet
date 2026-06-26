"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LogOut, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  decodeImpersonationToken,
  endImpersonation,
  loadImpersonation,
  logImpersonationAction,
  startImpersonation,
  useImpersonation,
} from "@/lib/impersonation";

export function ImpersonationBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useImpersonation();
  const [mounted, setMounted] = useState(false);
  const startedRef = useRef(false);
  const lastLoggedPath = useRef<string | null>(null);

  // Establish the session from ?impersonate=<token> on first load.
  useEffect(() => {
    loadImpersonation();
    setMounted(true);
    if (startedRef.current) return;
    const token = searchParams.get("impersonate");
    if (!token) return;
    startedRef.current = true;

    const s = decodeImpersonationToken(token);
    if (!s) {
      toast.error("This impersonation link is invalid or has expired.");
    } else {
      startImpersonation(s);
      logImpersonationAction(s, "Started impersonation session", {
        description: `${s.adminName} started an impersonation session for ${s.facilityName}.`,
        severity: "High",
      });
      // Notify the facility's primary admin (simulated email on session start).
      logImpersonationAction(s, "Impersonation Notice email sent", {
        description: `Impersonation Notice emailed to ${s.primaryAdminEmail}.`,
      });
      toast.info(`Impersonation Notice emailed to ${s.primaryAdminEmail}.`);
    }
    // Drop the token from the URL so it can't be re-used or bookmarked.
    router.replace(pathname);
  }, [searchParams, pathname, router]);

  // Log each page viewed during the session.
  useEffect(() => {
    if (!session) return;
    if (lastLoggedPath.current === pathname) return;
    lastLoggedPath.current = pathname;
    logImpersonationAction(session, `Viewed ${pathname}`, {
      category: "System",
      description: `${session.adminName} viewed ${pathname} while impersonating ${session.facilityName}.`,
    });
  }, [pathname, session]);

  if (!mounted || !session) return null;

  const handleExit = () => {
    logImpersonationAction(session, "Ended impersonation session", {
      description: `${session.adminName} ended the impersonation session for ${session.facilityName}.`,
      severity: "High",
    });
    endImpersonation();
    window.close();
    window.setTimeout(() => router.push("/dashboard"), 150);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-amber-900 sm:px-6 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200">
      <span className="flex items-center gap-2 text-sm">
        <ShieldAlert className="size-4 shrink-0" />
        <span>
          <span className="font-semibold">Yipyy Admin Mode</span> — You are
          viewing <strong>{session.facilityName}</strong> as{" "}
          <strong>{session.adminName}</strong>.
        </span>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900"
        onClick={handleExit}
      >
        <LogOut className="mr-1.5 size-3.5" />
        Exit
      </Button>
    </div>
  );
}
