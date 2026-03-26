"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export interface MissingRequirement {
  type: "agreement" | "vaccination";
  label: string;
  /** Pet name when requirement is per-pet */
  petName?: string;
  /** URL to complete (e.g. /customer/documents or /customer/pets/[id]) */
  link: string;
}

interface RequirementsGateStepProps {
  /** Missing agreements + vaccination items */
  missing: MissingRequirement[];
  completedCount: number;
  totalCount: number;
  /** When true, user can proceed without completing (show warning) */
  allowProceedWithoutComplete?: boolean;
  /** Optional CTA URL for "Go to Documents" etc. */
  primaryActionUrl?: string;
  primaryActionLabel?: string;
  /** Override description when all complete */
  allCompleteMessage?: string;
  /** Override description when missing */
  missingMessage?: string;
}

export function RequirementsGateStep({
  missing,
  completedCount,
  totalCount,
  allowProceedWithoutComplete: _allowProceedWithoutComplete = false,
  primaryActionUrl,
  primaryActionLabel = "Go to Documents",
  allCompleteMessage = "All requirements are complete. You can proceed to confirm your booking.",
  missingMessage = "The following items are required before you can confirm your booking.",
}: RequirementsGateStepProps) {
  const allComplete = totalCount === 0 || completedCount >= totalCount;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-base font-semibold">
          Complete Required Forms
        </h3>
        <p className="text-muted-foreground text-sm">
          {allComplete ? allCompleteMessage : missingMessage}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Progress:</span>
        <span
          className={
            allComplete
              ? "font-semibold text-green-600"
              : "text-muted-foreground"
          }
        >
          {completedCount}/{totalCount} completed
        </span>
      </div>
      {missing.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-muted-foreground text-sm font-medium">
              Missing requirements
            </p>
            <ul className="space-y-2">
              {missing.map((item, idx) => (
                <li
                  key={idx}
                  className="border-border flex items-center justify-between gap-4 border-b py-2 last:border-0"
                >
                  <div>
                    {item.petName && (
                      <span className="font-medium">{item.petName}: </span>
                    )}
                    <span className="text-muted-foreground">
                      {item.type === "vaccination"
                        ? "Vaccination records — "
                        : item.type === "agreement"
                          ? "Agreement — "
                          : ""}
                      {item.label}
                    </span>
                  </div>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary shrink-0 text-sm font-medium hover:underline"
                  >
                    Fill now →
                  </a>
                </li>
              ))}
            </ul>
            {primaryActionUrl && (
              <a
                href={primaryActionUrl}
                className="text-primary mt-2 inline-block text-sm font-medium underline"
              >
                {primaryActionLabel} →
              </a>
            )}
          </CardContent>
        </Card>
      )}
      {allComplete && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">
            All set! Proceed to confirm your booking.
          </span>
        </div>
      )}
    </div>
  );
}
