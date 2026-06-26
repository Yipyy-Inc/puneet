"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console so it's visible in dev while there's no logger.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-sm">
        <AlertTriangle className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          The command center failed to load. You can retry without leaving the
          page.
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        <RotateCcw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
