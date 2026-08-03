"use client";

import { CheckCircle2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/lib/auth/sign-out-client";

// A client component for one reason: the sign-out button. Everything it
// displays is a prop computed on the server.
export function OnboardingHeader({
  firstName,
  facilityName,
  submitted,
}: {
  firstName: string;
  facilityName: string;
  submitted: boolean;
}) {
  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to {facilityName}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your account is set up. A few things left before your first shift.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void signOutEverywhere()}
        >
          Sign out
        </Button>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="size-4 shrink-0" />
          Everything is in. Your manager is reviewing it — you will get access
          once they are done.
        </div>
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <Clock className="size-4 shrink-0" />
          Use the link in your welcome email to fill these in.
        </div>
      )}
    </header>
  );
}
