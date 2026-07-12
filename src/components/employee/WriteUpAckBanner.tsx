"use client";

import Link from "next/link";
import { CircleAlert, ArrowRight } from "lucide-react";
import { useWriteUps } from "@/data/staff-writeups";

// Portal-wide banner shown at the top of the staff shell until every HR record
// requiring acknowledgement has been acknowledged (spec 8.2).
export function WriteUpAckBanner({ staffId }: { staffId: string }) {
  const records = useWriteUps(staffId);
  const pending = records.filter(
    (w) =>
      !w.archived && !w.acknowledgedAt && w.category !== "positive_recognition",
  ).length;

  if (pending === 0) return null;

  return (
    <Link
      href="/employee/write-ups"
      className="flex items-center justify-between gap-3 border-b border-rose-300 bg-rose-100 px-4 py-2 text-sm text-rose-800 transition-colors hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 dark:hover:bg-rose-950"
    >
      <span className="flex items-center gap-2 font-medium">
        <CircleAlert className="size-4 shrink-0" />
        You have {pending} HR record{pending === 1 ? "" : "s"} to review and
        acknowledge.
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
        Review <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}
