"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Crown,
  Sparkles,
  Check,
  Users,
  MoreHorizontal,
  Pencil,
  Copy,
  Power,
  Trash2,
  Gift,
  Percent,
  Infinity as InfinityIcon,
  Calendar,
} from "lucide-react";
import type {
  MembershipPlan,
  MembershipBillingCycle,
} from "@/data/services-pricing";

interface Props {
  plan: MembershipPlan;
  cycle: MembershipBillingCycle;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function priceFor(plan: MembershipPlan, cycle: MembershipBillingCycle) {
  switch (cycle) {
    case "annually":
    case "yearly":
      return plan.annualPrice;
    case "quarterly":
      return plan.quarterlyPrice;
    default:
      return plan.monthlyPrice;
  }
}

function cycleSuffix(cycle: MembershipBillingCycle) {
  switch (cycle) {
    case "annually":
    case "yearly":
      return "/yr";
    case "quarterly":
      return "/qtr";
    case "weekly":
      return "/wk";
    case "daily":
      return "/day";
    default:
      return "/mo";
  }
}

export function PlanCard({
  plan,
  cycle,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: Props) {
  const price = priceFor(plan, cycle);
  const items = plan.includedItems.slice(0, 3);
  const extras = plan.includedItems.length - items.length;
  const perkList = plan.perks.slice(0, 5);

  return (
    <Card
      className={`group relative flex flex-col overflow-hidden border transition-shadow hover:shadow-lg ${
        plan.isPopular ? "ring-2 ring-amber-400/60" : ""
      }`}
    >
      {/* Top accent stripe */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: plan.badgeColor }}
      />

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-10 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ backgroundColor: plan.badgeColor }}
            >
              <Crown className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-base font-semibold tracking-tight">
                  {plan.name}
                </h4>
                {plan.isPopular && (
                  <Badge className="gap-0.5 bg-amber-500 text-xs hover:bg-amber-500">
                    <Sparkles className="size-3" />
                    Popular
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                <span className="uppercase tracking-wide">
                  {plan.tierLabel ?? "Silver"}
                </span>
                {" · "}
                {plan.applicableServices.length === 0
                  ? "All services"
                  : plan.applicableServices
                      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                      .join(" · ")}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mt-1 -mr-1">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                <Power className="mr-2 size-4" />
                {plan.isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-muted-foreground line-clamp-2 text-sm">
          {plan.description}
        </p>

        <div className="bg-muted/40 flex items-baseline gap-1 rounded-lg px-3 py-2">
          <span className="text-muted-foreground text-xs">$</span>
          <span className="text-3xl font-bold tracking-tight">
            {price.toFixed(0)}
          </span>
          <span className="text-muted-foreground text-sm">
            {cycleSuffix(cycle)}
          </span>
          {plan.taxAmount > 0 && (
            <span className="text-muted-foreground ml-auto text-xs">
              + ${plan.taxAmount.toFixed(2)} tax
            </span>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase">
              <Gift className="size-3" />
              Included
            </div>
            <ul className="space-y-1">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Check className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="flex-1 truncate">{it.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {it.quantity === -1 ? (
                      <InfinityIcon className="size-3" />
                    ) : (
                      `×${it.quantity}`
                    )}
                  </span>
                </li>
              ))}
              {extras > 0 && (
                <li className="text-muted-foreground text-xs">
                  + {extras} more
                </li>
              )}
            </ul>
          </div>
        )}

        {perkList.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase">
              <Percent className="size-3" />
              Perks
            </div>
            <ul className="space-y-1">
              {perkList.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  <span className="flex-1">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Users className="size-3.5" />
            {plan.subscriberCount} subscribers
          </div>
          <div className="flex items-center gap-2">
            {!plan.isActive && <Badge variant="outline">Inactive</Badge>}
            {!plan.availableOnline && (
              <Badge variant="outline">
                <Calendar className="mr-1 size-3" />
                Admin only
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
