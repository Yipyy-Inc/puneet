"use client";

import { useState } from "react";
import {
  Award,
  BarChart3,
  Bot,
  Calendar,
  DollarSign,
  Gift,
  GraduationCap,
  Home,
  Mail,
  MessageSquare,
  MessagesSquare,
  Package,
  Phone,
  Puzzle,
  Scissors,
  Target,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FacilityModuleEntitlement } from "@/lib/api/facility-modules";

// ============================================================================
// One module, and everything true about it for this facility.
//
// ── FOUR STATES, NOT A CHECKBOX ───────────────────────────────────────────
//
//   plan          the subscription includes it, nobody had to decide
//   add-on        sold on top of the plan
//   withdrawn     the plan includes it and it was switched off for this one
//   not included  neither included nor sold
//
// A bare on/off toggle would collapse "on because Pack Leader includes it"
// into "on because someone turned it on", and those need different answers
// when the plan changes.
//
// ── THE PRICE FIELD MEANS THREE THINGS ────────────────────────────────────
//
// Empty is not zero. Empty means "whatever the catalogue says"; 0 means "we
// agreed it was free", and the two behave differently the day the catalogue
// price changes. So the field is left blank when there is no override and the
// catalogue price sits behind it as the placeholder.
// ============================================================================

const ICONS: Record<string, LucideIcon> = {
  Calendar,
  Users,
  UserCircle,
  DollarSign,
  MessageSquare,
  GraduationCap,
  Scissors,
  Package,
  Home,
  Target,
  Bot,
  Gift,
  Mail,
  Phone,
  BarChart3,
  MessagesSquare,
  Award,
};

const SOURCE_TONE: Record<string, string> = {
  plan: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  "add-on": "border-violet-500/30 text-violet-700 dark:text-violet-300",
  withdrawn: "border-amber-500/30 text-amber-700 dark:text-amber-300",
  "not included": "border-muted-foreground/20 text-muted-foreground",
};

const SOURCE_LABEL: Record<string, string> = {
  plan: "In the plan",
  "add-on": "Add-on",
  withdrawn: "Switched off",
  "not included": "Not sold",
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ModuleEntitlementRow({
  module,
  busy,
  onChange,
}: {
  module: FacilityModuleEntitlement;
  busy: boolean;
  onChange: (change: {
    enabled: boolean;
    priceOverrideCents: number | null;
  }) => void;
}) {
  const override = module.priceOverrideCents;
  // The initial value only. The parent keys this component on the agreed
  // price, so a save — or a save the server refused — remounts the row and the
  // field goes back to what the database says, rather than keeping what was
  // typed as though it had stuck. Syncing that in an effect instead would be a
  // cascading render the React Compiler rightly objects to.
  const [price, setPrice] = useState(
    override === null ? "" : (override / 100).toFixed(2),
  );

  const Icon = ICONS[module.icon] ?? Puzzle;

  const commitPrice = () => {
    const trimmed = price.trim();
    if (trimmed === "") {
      if (override !== null)
        onChange({ enabled: module.enabled, priceOverrideCents: null });
      return;
    }
    const cents = Math.round(Number(trimmed) * 100);
    if (Number.isNaN(cents) || cents < 0) return;
    if (cents === override) return;
    onChange({ enabled: module.enabled, priceOverrideCents: cents });
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        module.enabled ? "border-primary/30 bg-primary/5" : "bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            module.enabled ? "bg-primary/10" : "bg-muted",
          )}
        >
          <Icon
            className={cn(
              "size-5",
              module.enabled ? "text-primary" : "text-muted-foreground",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-sm font-medium">{module.name}</h4>
            <Badge
              variant="outline"
              className={cn(
                "px-1.5 py-0 text-[10px] font-normal",
                SOURCE_TONE[module.source],
              )}
            >
              {SOURCE_LABEL[module.source]}
            </Badge>
            {!module.availableOnPlan && (
              <Badge
                variant="outline"
                className="border-sky-500/30 px-1.5 py-0 text-[10px] font-normal text-sky-700 dark:text-sky-300"
              >
                Above this plan
              </Badge>
            )}
            {module.expiresAt && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                Until {module.expiresAt.slice(0, 10)}
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground mt-0.5 text-xs">
            {module.description}
          </p>

          {module.enabled && module.missingDependencies.length > 0 && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              On, but {module.missingDependencies.join(" and ")}{" "}
              {module.missingDependencies.length === 1 ? "is" : "are"} off — it
              needs {module.missingDependencies.length === 1 ? "it" : "them"} to
              work.
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-2 -translate-y-1/2 text-xs">
                $
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                aria-label={`${module.name} agreed monthly price`}
                placeholder={(module.listPriceCents / 100).toFixed(2)}
                className="h-8 w-28 pl-5 text-sm"
                value={price}
                disabled={busy}
                onChange={(event) => setPrice(event.target.value)}
                onBlur={commitPrice}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </div>
            <span className="text-muted-foreground text-xs">
              {module.includedInPlan
                ? "included in the plan — leave blank"
                : `list ${money(module.listPriceCents)}/mo`}
            </span>
            {module.usage !== null ? (
              <span className="text-muted-foreground text-xs">
                · {module.usage.toLocaleString()} {module.usageLabel}
              </span>
            ) : (
              <span className="text-muted-foreground/70 text-xs">
                · usage not recorded
              </span>
            )}
          </div>
        </div>

        <Switch
          checked={module.enabled}
          disabled={busy}
          onCheckedChange={(next) =>
            onChange({ enabled: next, priceOverrideCents: override })
          }
          aria-label={`${module.enabled ? "Disable" : "Enable"} ${module.name}`}
        />
      </div>
    </div>
  );
}
