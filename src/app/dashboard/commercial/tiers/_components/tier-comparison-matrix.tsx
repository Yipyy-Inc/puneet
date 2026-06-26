"use client";

import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { modules } from "@/data/modules";
import { cn } from "@/lib/utils";
import type { TierWithUsage } from "@/types/commercial-tiers";
import {
  LIMIT_FIELDS,
  TIER_ACCENT,
  annualDiscountPct,
  formatLimit,
} from "./tier-utils";

interface TierComparisonMatrixProps {
  tiers: TierWithUsage[];
}

export function TierComparisonMatrix({ tiers }: TierComparisonMatrixProps) {
  const span = tiers.length + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature comparison</CardTitle>
        <CardDescription>
          How pricing, platform limits and modules line up across every tier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-background sticky left-0 w-52 min-w-52">
                  Feature
                </TableHead>
                {tiers.map((tier) => (
                  <TableHead
                    key={tier.id}
                    className="min-w-36 text-center align-bottom"
                  >
                    <div className="flex flex-col items-center gap-1 py-1">
                      <span className="text-foreground font-semibold">
                        {tier.name || "Untitled"}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          TIER_ACCENT[tier.type].badge,
                        )}
                      >
                        {tier.type}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <SectionRow label="Pricing" span={span} />
              <ValueRow
                label="Monthly price"
                tiers={tiers}
                render={(t) => `$${t.pricing.monthly}`}
              />
              <ValueRow
                label="Annual price"
                tiers={tiers}
                render={(t) => `$${t.pricing.yearly.toLocaleString()}`}
              />
              <ValueRow
                label="Annual savings"
                tiers={tiers}
                render={(t) => {
                  const pct = annualDiscountPct(
                    t.pricing.monthly,
                    t.pricing.yearly,
                  );
                  return pct > 0 ? (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Save {pct}%
                    </span>
                  ) : (
                    <Dash />
                  );
                }}
              />
              <ValueRow
                label="Transaction fee"
                tiers={tiers}
                render={(t) => `${t.transactionFeePercent ?? 0}%`}
              />

              <SectionRow label="Platform limits" span={span} />
              {LIMIT_FIELDS.map((field) => (
                <ValueRow
                  key={field.key}
                  label={field.label}
                  tiers={tiers}
                  render={(t) =>
                    formatLimit(
                      t.limitations[field.key],
                      "suffix" in field ? field.suffix : "",
                    )
                  }
                />
              ))}

              <SectionRow label="Status" span={span} />
              <ValueRow
                label="Tier status"
                tiers={tiers}
                render={(t) => (
                  <Badge variant={t.isActive ? "default" : "secondary"}>
                    {t.isActive ? "Active" : "Inactive"}
                  </Badge>
                )}
              />
              <ValueRow
                label="Public visibility"
                tiers={tiers}
                render={(t) =>
                  (t.isPublic ?? true) ? (
                    <Badge variant="outline">Public</Badge>
                  ) : (
                    <Badge variant="secondary">Hidden</Badge>
                  )
                }
              />
              <ValueRow
                label="Facilities assigned"
                tiers={tiers}
                render={(t) => t.facilityCount.toLocaleString()}
              />

              <SectionRow label="Modules" span={span} />
              {modules.map((mod) => (
                <ValueRow
                  key={mod.id}
                  label={mod.name}
                  tiers={tiers}
                  render={(t) =>
                    t.availableModules.includes(mod.id) ? (
                      <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Dash />
                    )
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionRow({ label, span }: { label: string; span: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={span}
        className="bg-muted/50 text-muted-foreground text-xs font-semibold tracking-wider uppercase"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

function ValueRow({
  label,
  tiers,
  render,
}: {
  label: string;
  tiers: TierWithUsage[];
  render: (tier: TierWithUsage) => ReactNode;
}) {
  return (
    <TableRow>
      <TableCell className="bg-background sticky left-0 font-medium">
        {label}
      </TableCell>
      {tiers.map((tier) => (
        <TableCell key={tier.id} className="text-center tabular-nums">
          {render(tier)}
        </TableCell>
      ))}
    </TableRow>
  );
}

function Dash() {
  return <Minus className="text-muted-foreground/50 mx-auto size-4" />;
}
