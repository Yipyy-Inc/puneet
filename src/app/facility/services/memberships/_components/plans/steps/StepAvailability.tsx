"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Globe, ShieldCheck } from "lucide-react";
import type { PlanBuilderData } from "../use-plan-builder";
import type {
  CancellationPolicy,
  ServiceCategory,
} from "@/data/services-pricing";

interface Props {
  data: PlanBuilderData;
  update: (patch: Partial<PlanBuilderData>) => void;
}

const categories: ServiceCategory[] = [
  "boarding",
  "daycare",
  "grooming",
  "training",
  "retail",
];

export function StepAvailability({ data, update }: Props) {
  const toggleCategory = (c: ServiceCategory) => {
    update({
      applicableServices: data.applicableServices.includes(c)
        ? data.applicableServices.filter((x) => x !== c)
        : [...data.applicableServices, c],
    });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <Globe className="size-4" />
          <h4 className="text-sm font-semibold">Applicable service categories</h4>
        </div>
        <p className="text-muted-foreground text-sm">
          Restrict this plan&apos;s benefits to certain service categories. Leave
          empty to apply site-wide.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const selected = data.applicableServices.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-sm capitalize transition-colors ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          <h4 className="text-sm font-semibold">Cancellation policy</h4>
        </div>
        <div className="grid gap-2">
          <PolicyOption
            active={data.cancellationPolicy === "end_of_cycle"}
            onClick={() => update({ cancellationPolicy: "end_of_cycle" })}
            title="End of billing cycle"
            description="Subscription stays active until the next billing date. Perks remain until then. Recommended."
          />
          <PolicyOption
            active={data.cancellationPolicy === "immediate"}
            onClick={() =>
              update({ cancellationPolicy: "immediate" as CancellationPolicy })
            }
            title="Immediate"
            description="Subscription ends the moment it's cancelled. Perks stop right away."
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h4 className="text-sm font-semibold">Perk credits</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Credits per cycle</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={-1}
                value={data.credits}
                onChange={(e) =>
                  update({ credits: parseInt(e.target.value) || 0 })
                }
                disabled={data.credits === -1}
              />
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <Switch
                  checked={data.credits === -1}
                  onCheckedChange={(v) => update({ credits: v ? -1 : 0 })}
                />
                <Label className="text-xs">Unlimited</Label>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Used for the legacy &quot;credits&quot; counter shown on
              subscriber cards. Prefer Included Items for new plans.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Headline discount (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={data.discountPercentage}
              onChange={(e) =>
                update({ discountPercentage: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-muted-foreground text-xs">
              Displayed on the plan card. Discount rules above define the
              actual behavior.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PolicyOption({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5 ring-primary/20 ring-2"
          : "hover:bg-muted/50"
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-muted-foreground mt-1 text-xs">{description}</div>
    </button>
  );
}
