"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Building2, ChevronRight, Info, Layers } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import { useFacilityLocations } from "@/lib/api/locations";
import type { AccountingStructure } from "@/types/facility";

type MultiLocationMode = AccountingStructure["multiLocationMode"];

// ============================================================================
// How this business's branches map onto its books.
//
// ── WHAT CHANGED, AND WHAT DELIBERATELY DID NOT ───────────────────────────
//
// This screen used to be handed `facilityId = "11"` — a literal, in the page
// file — and rendered `getLocationsByFacility(11)`: three fictional Montreal
// branches from `src/data/locations.ts`. Every business saw the same three,
// including businesses whose real branches are now one click away in
// /facility/hq/locations. It reads the real rows now.
//
// The MODE moved too, from `localStorage["yipyy-quickbooks-settings"]` into the
// `accounting_structure` facility settings domain. It is not a preference: it
// describes how the company is incorporated, and the bookkeeper and the owner
// answering it differently on two laptops is not a display bug.
//
// ── AND THE CONNECTION IS STILL NOT BUILT ─────────────────────────────────
//
// `src/lib/quickbooks/` is 27 modules, 8 localStorage stores, ZERO API routes
// and ZERO tables, and one of the modules is `oauth-mock.ts`. No QuickBooks
// company can be connected today by anybody.
//
// So the connect cards are GONE rather than converted. A "Connect QuickBooks"
// button that writes a fake token to localStorage and reports success is the
// exact shape this project keeps deleting — and it is worse on an accounting
// screen than anywhere else, because the person clicking it will believe their
// books are being kept. The banner says what is true instead.
// ============================================================================

const MODES: {
  value: MultiLocationMode;
  title: string;
  detail: string;
  icon: typeof Layers;
}[] = [
  {
    value: "single_company",
    title: "One company for the whole business",
    detail:
      "Every branch posts into the same set of books, split by Class for per-branch reporting.",
    icon: Layers,
  },
  {
    value: "company_per_location",
    title: "A separate company per branch",
    detail:
      "Each branch keeps its own books, its own accounts and its own mappings. Usually because the branches are separate legal entities.",
    icon: Building2,
  },
];

export function HQIntegrationsClient() {
  const { accountingStructure, updateAccountingStructure } = useSettings();
  const { data: locations, isPending } = useFacilityLocations();

  const mode = accountingStructure.multiLocationMode;
  const branches = locations ?? [];

  const choose = (value: MultiLocationMode) => {
    if (value === mode) return;
    void updateAccountingStructure({ multiLocationMode: value }).then(
      () => toast.success("Saved for the whole business"),
      (error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "Could not save that.",
        ),
    );
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((option) => {
          const active = mode === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              data-active={active}
              onClick={() => choose(option.value)}
              className="hover:border-foreground/20 rounded-lg border p-4 text-left transition-colors data-[active=true]:border-emerald-500/50 data-[active=true]:bg-emerald-500/5"
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="text-muted-foreground size-4 shrink-0" />
                {option.title}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {option.detail}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="py-4">
          {isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <>
              <p className="text-sm font-medium">
                {mode === "company_per_location"
                  ? `${branches.length} ${branches.length === 1 ? "branch keeps" : "branches keep"} separate books`
                  : `${branches.length} ${branches.length === 1 ? "branch posts" : "branches post"} into one company`}
              </p>
              {branches.length > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {branches.map((branch) => branch.name).join(" · ")}
                </p>
              )}
              {branches.length === 1 && mode === "company_per_location" && (
                <p className="text-muted-foreground mt-2 text-xs">
                  This business has one branch, so this choice changes nothing
                  until a second one is added in{" "}
                  <Link
                    href="/facility/hq/locations"
                    className="underline underline-offset-4"
                  >
                    Locations
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* The honest state of the integration. See the header: there is no
          QuickBooks backend at all, so nothing here offers to connect one. */}
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        <Info className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">
            QuickBooks cannot be connected yet — nothing posts to it.
          </p>
          <p>
            The accounting rules, account mappings and sync behaviour are
            designed and the money rules are tested (
            <code className="text-[11px]">bun run check:quickbooks</code>), but
            the connection to Intuit is not built. Your answer above is saved
            for the business and will be used when it is.
          </p>
          <p>
            <Link
              href="/facility/dashboard/settings/integrations/quickbooks"
              className="inline-flex items-center gap-1 underline underline-offset-4"
            >
              See the mapping and sync settings
              <ChevronRight className="size-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
