"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RealTrainingSeries } from "@/types/training-series";
import {
  HqComparisonTable,
  type ColumnDef,
} from "@/components/hq/HqComparisonTable";

// ============================================================================
// Training prices, across every branch.
//
// READ-ONLY, and a FLAT LIST rather than the item x branch grid the grooming,
// boarding and daycare sections use. That difference is the data's, not a
// shortcut: those three price one catalogue item differently at each branch,
// so a grid is the honest shape. A training class belongs to exactly ONE
// branch and carries ONE price (`training_series.location_id` +
// `total_price`), so a grid would render an empty cell for every other branch
// and imply a per-branch price that does not exist.
//
// There is deliberately no per-location OVERRIDE table for training, unlike
// its three siblings. Training has no facility-wide price to override --
// `training_config.basePrice` is only the placeholder shown before a class is
// picked (see BookingModal's training branch), never the settled charge. A
// branch override of it would be a number displayed that nothing charges.
//
// Classes are created and priced on the Series page; HQ compares them.
// ============================================================================

/**
 * `numeric` arrives from PostgREST as a STRING, and the series mapper passes
 * `total_price` straight through under a `number` type. Rendering copes either
 * way; sorting does not.
 */
function price(series: RealTrainingSeries): number {
  return Number(series.totalPrice);
}

/**
 * The sort key for Price, zero-padded, and it has to be.
 *
 * `DataTable` compares every sort value as `String(v).toLowerCase()`
 * (DataTable.tsx), so returning a number here would still be ordered
 * lexicographically -- "1000" before "250". That is a bug in the SHARED
 * table affecting every numeric column in the app, not something this screen
 * introduced, and DataTable is a documented risk zone whose comparator should
 * not be changed as a side effect of adding a panel.
 *
 * So the value is padded to a fixed width in cents, which makes lexicographic
 * order and numeric order the same thing. Remove this the day the comparator
 * learns about numbers.
 */
function priceSortKey(series: RealTrainingSeries): string {
  return String(Math.round(price(series) * 100)).padStart(12, "0");
}

const STATUS_STYLE: Record<RealTrainingSeries["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  draft: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  cancelled: "bg-muted text-muted-foreground",
};

interface Props {
  series: RealTrainingSeries[];
}

export function TrainingServiceCatalogClient({ series }: Props) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<RealTrainingSeries>[]>(
    () => [
      {
        key: "name",
        label: "Class",
        align: "left",
        sortable: true,
        sortValue: (s) => s.name,
        render: (s) => (
          <div className="min-w-0">
            <p className="font-medium">{s.name}</p>
            <p className="text-muted-foreground truncate text-[11px]">
              {s.courseTypeName}
            </p>
          </div>
        ),
      },
      {
        key: "locationName",
        label: "Branch",
        align: "left",
        sortable: true,
        // Unassigned sorts last rather than as an empty string, so the classes
        // that DO name a branch stay together at the top.
        sortValue: (s) => s.locationName ?? "\uffff",
        render: (s) =>
          s.locationName ? (
            <span>{s.locationName}</span>
          ) : (
            // Not hidden: a class with no branch is a real state, and the
            // owner is the person who can fix it.
            <span className="text-muted-foreground italic">Not set</span>
          ),
      },
      {
        key: "totalPrice",
        label: "Price",
        align: "right",
        sortable: true,
        sortValue: priceSortKey,
        render: (s) => <span className="tabular-nums">${price(s)}</span>,
      },
      {
        key: "capacity",
        label: "Enrolled",
        align: "right",
        sortable: true,
        sortValue: (s) => s.enrolledCount,
        render: (s) => (
          <span className="tabular-nums">
            {s.enrolledCount}/{s.capacity}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        align: "center",
        sortable: true,
        sortValue: (s) => s.status,
        render: (s) => (
          <Badge className={STATUS_STYLE[s.status]}>
            {s.status[0].toUpperCase() + s.status.slice(1)}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <GraduationCap className="size-5 text-violet-600" />
          Training
        </h2>
        <p className="text-muted-foreground text-sm">
          Every class across the network, with the branch it runs at and what it
          charges. A class carries its own price, so there is nothing to
          override here &mdash; classes are created and priced on each
          branch&apos;s Series page.
        </p>
      </div>

      <HqComparisonTable
        data={series}
        columns={columns}
        searchKeys={["name", "courseTypeName"]}
        searchPlaceholder="Search classes…"
        emptyState={{
          icon: GraduationCap,
          title: "No training classes yet",
          description:
            "A class names its own branch and its own price when it is created. Add one to see it compared here.",
          action: {
            label: "Go to Training Series",
            icon: Plus,
            onClick: () =>
              router.push("/facility/dashboard/services/training/series"),
          },
        }}
      />
    </div>
  );
}
