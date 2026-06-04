"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoyaltyPortalHeaderPreviewProps {
  programName: string;
  tagline?: string;
  primaryColor: string;
  programIcon: string;
  className?: string;
}

/**
 * Faithful preview of the customer portal "Loyalty & Rewards" header, tinted
 * with the program's brand color/icon. Shared so the wizard preview and the
 * real portal header can render from the same component.
 */
export function LoyaltyPortalHeaderPreview({
  programName,
  tagline,
  primaryColor,
  programIcon,
  className,
}: LoyaltyPortalHeaderPreviewProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-background shadow-sm",
        className,
      )}
    >
      {/* Browser-ish chrome to signal "customer portal" */}
      <div className="bg-muted/50 flex items-center gap-1.5 border-b px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="text-muted-foreground ml-2 truncate text-[11px]">
          /customer/rewards
        </span>
      </div>

      <div
        className="space-y-5 p-5"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}14 0%, transparent 55%)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm"
            style={{ backgroundColor: `${primaryColor}26` }}
          >
            <span aria-hidden="true">{programIcon || "🐾"}</span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {programName || "Your Program Name"}
            </h1>
            <p className="text-muted-foreground truncate text-sm">
              {tagline || "Your tagline appears here"}
            </p>
          </div>
        </div>

        {/* Points summary mock */}
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: `${primaryColor}33`,
            background: `linear-gradient(135deg, ${primaryColor}12 0%, transparent 60%)`,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="rounded-full p-2.5"
                style={{ backgroundColor: `${primaryColor}26` }}
              >
                <Star className="size-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  1,840 Points
                </div>
                <div className="text-muted-foreground text-xs">≈ $92 value</div>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              Redeem
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Gold Tier
            </span>
            <span className="text-muted-foreground text-xs">
              160 points to Platinum
            </span>
          </div>
          <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{ width: "78%", backgroundColor: primaryColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
