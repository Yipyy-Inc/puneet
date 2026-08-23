"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shape of a Yipyy Pay screen before its data arrives.
 *
 * Its own file because three modules load it — the section, the pre-connection
 * router, and every `next/dynamic` boundary between them — and importing it
 * from the component those boundaries live in makes a cycle out of each one.
 */
export function SectionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
      <Skeleton className="h-44 w-full" />
    </div>
  );
}
