import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Reusable loading skeletons. Pure server-renderable markup (no client JS) so
// they can back loading.tsx route segments and inline query panels alike.
// Rule: while data loads, show a skeleton — never a fake/zero number.

/** Standard padded page wrapper, matching every dashboard page. */
const PAGE = "flex-1 space-y-6 p-4 pt-6 md:p-8";

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

export function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="bg-muted h-7 w-52" />
        <Skeleton className="bg-muted h-4 w-80 max-w-full" />
      </div>
      {action && <Skeleton className="bg-muted h-9 w-32 rounded-lg" />}
    </div>
  );
}

export function KpiTileSkeleton() {
  return <Skeleton className="bg-muted h-[104px] rounded-2xl" />;
}

export function KpiTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <KpiTileSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-2">
        <Skeleton className="bg-muted h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton
          className={cn("bg-muted h-64 w-full rounded-xl", className)}
        />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="bg-muted h-9 max-w-sm flex-1" />
        <Skeleton className="bg-muted size-9 shrink-0 rounded-md" />
        <Skeleton className="bg-muted size-9 shrink-0 rounded-md" />
      </div>
      <div className="overflow-hidden rounded-md border">
        <div className="bg-muted/40 flex items-center gap-4 border-b px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="bg-muted h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="bg-muted h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2 border-b pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="bg-muted h-9 w-28 rounded-lg" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page presets (include the padded page wrapper) — use these in loading.tsx
// ---------------------------------------------------------------------------

/** List/table page: header + KPI row + table. */
export function ListPageSkeleton() {
  return (
    <div className={PAGE}>
      <PageHeaderSkeleton action />
      <KpiTilesSkeleton />
      <TableSkeleton />
    </div>
  );
}

/** Reports/analytics page: header + KPIs + two charts + table. */
export function ReportPageSkeleton() {
  return (
    <div className={PAGE}>
      <PageHeaderSkeleton action />
      <KpiTilesSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}

/** Detail/profile page with tabs (e.g. facility profile): header + tabs + content. */
export function ProfilePageSkeleton() {
  return (
    <div className={PAGE}>
      <PageHeaderSkeleton action />
      <TabsSkeleton count={8} />
      <KpiTilesSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="bg-muted h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="bg-muted h-72 rounded-2xl" />
      </div>
    </div>
  );
}

/** Overview dashboard: header + KPI row + two-column content. */
export function DashboardSkeleton() {
  return (
    <div className={PAGE}>
      <PageHeaderSkeleton />
      <KpiTilesSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="bg-muted h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="bg-muted h-80 rounded-2xl" />
      </div>
    </div>
  );
}

/** Operational service page: header + KPI row + board columns/cards. */
export function ServicePageSkeleton() {
  return (
    <div className={PAGE}>
      <PageHeaderSkeleton action />
      <KpiTilesSkeleton />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="bg-muted h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
