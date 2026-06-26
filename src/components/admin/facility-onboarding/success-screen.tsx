"use client";

import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SuccessScreen({
  facilityName,
  onViewProfile,
  onClose,
}: {
  facilityName: string;
  onViewProfile: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
        <CheckCircle2 className="size-8" />
      </span>
      <div className="space-y-1.5">
        <h3 className="text-xl font-semibold tracking-tight">
          Facility created
        </h3>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          {facilityName
            ? `${facilityName} is ready.`
            : "The facility is ready."}{" "}
          A welcome email with a login link has been sent to the primary admin.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={onViewProfile}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          View Facility Profile
        </Button>
      </div>
    </div>
  );
}
