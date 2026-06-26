"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dunningQueries } from "@/lib/api/dunning";

interface FacilitySuspensionBannerProps {
  facilityId: number;
  status: string;
  onSuspend: () => void;
}

export function FacilitySuspensionBanner({
  facilityId,
  status,
  onSuspend,
}: FacilitySuspensionBannerProps) {
  const { data: flag } = useQuery(dunningQueries.forFacility(facilityId));

  if (!flag || status === "suspended") return null;

  return (
    <div className="border-b border-rose-500/30 bg-rose-500/10 px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <ShieldAlert className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            Flagged for suspension — unpaid subscription invoice
          </p>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
            Invoice {flag.invoiceNumber} is {flag.daysPastDue} days past due ($
            {flag.amount.toLocaleString()}). The Day 1, 7 and 14 overdue notices
            have all been sent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/commercial/dunning">View dunning</Link>
          </Button>
          <Button
            size="sm"
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={onSuspend}
          >
            Suspend now
          </Button>
        </div>
      </div>
    </div>
  );
}
