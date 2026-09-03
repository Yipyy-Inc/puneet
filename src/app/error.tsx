"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";

// §5d2 state ladder, "Failed to load": pose `error` (low register), the error
// ink #B23B3B, and the sentence the system writes for it. The previous screen
// opened with "Oops!" at 60px — a §5r banned word, at a size no rung of §1's
// type scale carries.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteState
      pose="error"
      icon={CircleAlert}
      inkClassName="text-destructive"
      title="We couldn't load your board"
      description="Something went wrong at our end, and trying again usually clears it."
      action={{ label: "Try again", icon: RefreshCw, onClick: reset }}
      className="min-h-screen"
    />
  );
}
