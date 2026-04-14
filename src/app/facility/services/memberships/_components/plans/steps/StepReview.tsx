"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Calendar,
  Percent,
  Gift,
  Globe,
  ShieldCheck,
  Pencil,
  Infinity as InfinityIcon,
} from "lucide-react";
import type { PlanBuilderData } from "../use-plan-builder";

interface Props {
  data: PlanBuilderData;
  goToStep: (step: number) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function cycleLabel(data: PlanBuilderData) {
  const base = data.billingCycle;
  if (base !== "weekly") return base;
  return `weekly — ${data.weeklyBillingDay?.toUpperCase()} at ${data.weeklyBillingTime}`;
}

export function StepReview({ data, goToStep }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Review everything before saving. You can jump back to any section to
        make changes.
      </p>

      <Section
        title="Basics"
        icon={<Crown className="size-4" />}
        onEdit={() => goToStep(0)}
      >
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-lg"
            style={{ backgroundColor: data.badgeColor }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {data.name || "Untitled plan"}
              </span>
              <Badge variant="outline" className="uppercase">
                {data.tierLabel}
              </Badge>
              {data.isPopular && (
                <Badge className="bg-amber-500 hover:bg-amber-500">
                  Popular
                </Badge>
              )}
              {!data.isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {data.description || "—"}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Pricing & billing"
        icon={<Calendar className="size-4" />}
        onEdit={() => goToStep(1)}
      >
        <dl className="grid grid-cols-2 gap-y-1 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Monthly</dt>
          <dd className="font-medium">{fmt(data.monthlyPrice)}</dd>
          <dt className="text-muted-foreground">Quarterly</dt>
          <dd className="font-medium">{fmt(data.quarterlyPrice)}</dd>
          <dt className="text-muted-foreground">Annual</dt>
          <dd className="font-medium">{fmt(data.annualPrice)}</dd>
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="font-medium">{fmt(data.taxAmount)}</dd>
          <dt className="text-muted-foreground">Cycle</dt>
          <dd className="capitalize">{cycleLabel(data)}</dd>
          <dt className="text-muted-foreground">Grace period</dt>
          <dd>{data.gracePeriodDays} days</dd>
        </dl>
      </Section>

      <Section
        title="Discount rules"
        icon={<Percent className="size-4" />}
        onEdit={() => goToStep(2)}
      >
        {data.discountRules.length === 0 ? (
          <p className="text-muted-foreground text-sm">No discount rules.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.discountRules.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {r.target}
                </Badge>
                <span>
                  {r.discountType === "percentage"
                    ? `${r.discountValue}% off`
                    : `${fmt(r.discountValue)} off`}
                </span>
                {r.categories && r.categories.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ({r.categories.join(", ")})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {data.perks.length > 0 && (
          <div className="mt-3">
            <div className="text-muted-foreground mb-1 text-xs uppercase">
              Marketing perks
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.perks.map((p, i) => (
                <Badge key={i} variant="secondary">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Included items"
        icon={<Gift className="size-4" />}
        onEdit={() => goToStep(3)}
      >
        {data.includedItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">None.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.includedItems.map((it) => (
              <li key={it.id} className="flex items-center justify-between">
                <span>
                  <span className="font-medium">{it.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs capitalize">
                    ({it.kind})
                  </span>
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  {it.quantity === -1 ? (
                    <span className="flex items-center gap-0.5">
                      <InfinityIcon className="size-3" /> unlimited
                    </span>
                  ) : (
                    <>×{it.quantity}</>
                  )}
                  <span>•</span>
                  <span>
                    {it.expiry.type === "end_of_cycle"
                      ? "end of cycle"
                      : it.expiry.type === "days_after_purchase"
                        ? `${it.expiry.days}d`
                        : "never"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Availability & rules"
        icon={<Globe className="size-4" />}
        onEdit={() => goToStep(4)}
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-muted-foreground size-3.5" />
            Cancellation: {data.cancellationPolicy.replace("_", " ")}
          </div>
          <div>Online: {data.availableOnline ? "enabled" : "disabled"}</div>
          <div>
            Categories:{" "}
            {data.applicableServices.length === 0
              ? "All"
              : data.applicableServices.join(", ")}
          </div>
          <div>
            Credits per cycle:{" "}
            {data.credits === -1 ? "Unlimited" : data.credits}
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="mr-1 size-3.5" />
          Edit
        </Button>
      </div>
      {children}
    </div>
  );
}
