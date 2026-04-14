"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Percent, Tag, X } from "lucide-react";
import type {
  MembershipDiscountRule,
  ServiceCategory,
} from "@/data/services-pricing";
import type { PlanBuilderData } from "../use-plan-builder";

interface Props {
  data: PlanBuilderData;
  update: (patch: Partial<PlanBuilderData>) => void;
}

const targets: { value: MembershipDiscountRule["target"]; label: string }[] = [
  { value: "services", label: "Services" },
  { value: "addons", label: "Add-ons" },
  { value: "products", label: "Products" },
];

const categories: ServiceCategory[] = [
  "boarding",
  "daycare",
  "grooming",
  "training",
  "retail",
];

export function StepBenefits({ data, update }: Props) {
  const addRule = () => {
    const rule: MembershipDiscountRule = {
      id: `dr-${Date.now()}`,
      target: "services",
      discountType: "percentage",
      discountValue: 10,
      label: "10% off services",
    };
    update({ discountRules: [...data.discountRules, rule] });
  };

  const updateRule = (
    id: string,
    patch: Partial<MembershipDiscountRule>,
  ) => {
    update({
      discountRules: data.discountRules.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    });
  };

  const removeRule = (id: string) => {
    update({
      discountRules: data.discountRules.filter((r) => r.id !== id),
    });
  };

  const toggleCategory = (id: string, cat: ServiceCategory) => {
    const rule = data.discountRules.find((r) => r.id === id);
    if (!rule) return;
    const current = rule.categories ?? [];
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    updateRule(id, { categories: next.length ? next : undefined });
  };

  const addPerk = (perk: string) => {
    const trimmed = perk.trim();
    if (!trimmed) return;
    update({ perks: [...data.perks, trimmed] });
  };
  const removePerk = (i: number) => {
    update({ perks: data.perks.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="size-4" />
            <h4 className="text-sm font-semibold">Auto-applied discounts</h4>
          </div>
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="mr-1 size-3.5" />
            Add rule
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Members automatically get these discounts at checkout. When multiple
          rules match, the one with the greater benefit wins.
        </p>

        {data.discountRules.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
            No discount rules yet. Members will only get included items (next
            step).
          </div>
        ) : (
          <div className="space-y-2">
            {data.discountRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-muted/30 space-y-3 rounded-xl border p-3"
              >
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Applies to</Label>
                    <Select
                      value={rule.target}
                      onValueChange={(v) =>
                        updateRule(rule.id, {
                          target: v as MembershipDiscountRule["target"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targets.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Discount type</Label>
                    <Select
                      value={rule.discountType}
                      onValueChange={(v) =>
                        updateRule(rule.id, {
                          discountType: v as "percentage" | "flat",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat">Flat amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {rule.discountType === "percentage" ? "Percent" : "Amount ($)"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={rule.discountValue}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          discountValue: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Display label</Label>
                    <Input
                      value={rule.label ?? ""}
                      onChange={(e) =>
                        updateRule(rule.id, { label: e.target.value })
                      }
                      placeholder="e.g., 15% off grooming"
                    />
                  </div>
                </div>

                {rule.target === "services" && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Categories (leave empty for all)
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((c) => {
                        const selected = (rule.categories ?? []).includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => toggleCategory(rule.id, c)}
                            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
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
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule(rule.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 size-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="size-4" />
          <h4 className="text-sm font-semibold">Marketing perks</h4>
        </div>
        <p className="text-muted-foreground text-sm">
          Human-readable benefits shown on the plan card. Purely display.
        </p>
        <PerkInput onAdd={addPerk} />
        {data.perks.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {data.perks.map((perk, i) => (
              <Badge key={i} variant="secondary" className="gap-1 py-1 pr-1">
                {perk}
                <button
                  type="button"
                  onClick={() => removePerk(i)}
                  className="hover:text-destructive ml-0.5 rounded-full p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PerkInput({ onAdd }: { onAdd: (perk: string) => void }) {
  return (
    <div className="flex gap-2">
      <Input
        placeholder="e.g., Free bath & brush monthly"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const input = e.currentTarget;
            onAdd(input.value);
            input.value = "";
          }
        }}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={(e) => {
          const input = (e.currentTarget.previousSibling as HTMLInputElement);
          if (input) {
            onAdd(input.value);
            input.value = "";
          }
        }}
      >
        Add
      </Button>
    </div>
  );
}
