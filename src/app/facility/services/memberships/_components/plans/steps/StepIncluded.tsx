"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gift, Plus, Trash2 } from "lucide-react";
import { services } from "@/data/services-pricing";
import { defaultServiceAddOns } from "@/data/service-addons";
import type {
  MembershipIncludedItem,
  IncludedItemKind,
  IncludedItemExpiry,
} from "@/data/services-pricing";
import type { PlanBuilderData } from "../use-plan-builder";

interface Props {
  data: PlanBuilderData;
  update: (patch: Partial<PlanBuilderData>) => void;
}

export function StepIncluded({ data, update }: Props) {
  const [kind, setKind] = useState<IncludedItemKind>("service");
  const [refId, setRefId] = useState<string>("");

  const catalog =
    kind === "service"
      ? services.filter((s) => !s.isAddOn)
      : kind === "addon"
        ? defaultServiceAddOns.map((a) => ({ id: a.id, name: a.name }))
        : [];

  const addItem = () => {
    if (!refId) return;
    const label =
      kind === "service"
        ? services.find((s) => s.id === refId)?.name ?? refId
        : kind === "addon"
          ? defaultServiceAddOns.find((a) => a.id === refId)?.name ?? refId
          : refId;
    const item: MembershipIncludedItem = {
      id: `ii-${Date.now()}`,
      kind,
      refId,
      label,
      quantity: 1,
      expiry: { type: "end_of_cycle" },
    };
    update({ includedItems: [...data.includedItems, item] });
    setRefId("");
  };

  const updateItem = (
    id: string,
    patch: Partial<MembershipIncludedItem>,
  ) => {
    update({
      includedItems: data.includedItems.map((it) =>
        it.id === id ? { ...it, ...patch } : it,
      ),
    });
  };

  const removeItem = (id: string) => {
    update({
      includedItems: data.includedItems.filter((i) => i.id !== id),
    });
  };

  const setExpiry = (id: string, expiry: IncludedItemExpiry) => {
    updateItem(id, { expiry });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border bg-linear-to-br from-purple-50/40 to-background p-4 dark:from-purple-950/20">
        <div className="flex items-center gap-2">
          <Gift className="size-4 text-purple-700 dark:text-purple-400" />
          <h4 className="text-sm font-semibold">Included complimentary items</h4>
        </div>
        <p className="text-muted-foreground text-sm">
          Members receive these items automatically each billing cycle.
          Quantities are consumed as appointments are completed.
        </p>

        <div className="grid gap-2 md:grid-cols-[140px_1fr_auto]">
          <Select
            value={kind}
            onValueChange={(v) => {
              setKind(v as IncludedItemKind);
              setRefId("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="addon">Add-on</SelectItem>
              <SelectItem value="product">Product (custom)</SelectItem>
            </SelectContent>
          </Select>
          {kind === "product" ? (
            <Input
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              placeholder="Product name"
            />
          ) : (
            <Select value={refId} onValueChange={setRefId}>
              <SelectTrigger>
                <SelectValue placeholder={`Pick a ${kind}...`} />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={addItem} disabled={!refId}>
            <Plus className="mr-1 size-4" />
            Add
          </Button>
        </div>
      </section>

      {data.includedItems.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
          No included items yet.
        </div>
      ) : (
        <div className="space-y-2">
          {data.includedItems.map((item) => (
            <div
              key={item.id}
              className="bg-muted/30 space-y-3 rounded-xl border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-muted-foreground text-xs capitalize">
                    {item.kind}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={-1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, {
                          quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={item.quantity === -1}
                    />
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Switch
                        checked={item.quantity === -1}
                        onCheckedChange={(v) =>
                          updateItem(item.id, { quantity: v ? -1 : 1 })
                        }
                      />
                      <Label className="text-xs">Unlimited</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Expiry</Label>
                  <div className="flex flex-wrap gap-2">
                    <ExpiryChip
                      active={item.expiry.type === "end_of_cycle"}
                      onClick={() =>
                        setExpiry(item.id, { type: "end_of_cycle" })
                      }
                    >
                      End of billing cycle
                    </ExpiryChip>
                    <ExpiryChip
                      active={item.expiry.type === "days_after_purchase"}
                      onClick={() =>
                        setExpiry(item.id, {
                          type: "days_after_purchase",
                          days: 30,
                        })
                      }
                    >
                      X days after purchase
                    </ExpiryChip>
                    <ExpiryChip
                      active={item.expiry.type === "never"}
                      onClick={() => setExpiry(item.id, { type: "never" })}
                    >
                      Never
                    </ExpiryChip>
                  </div>
                  {item.expiry.type === "days_after_purchase" && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        className="w-24"
                        value={item.expiry.days}
                        onChange={(e) =>
                          setExpiry(item.id, {
                            type: "days_after_purchase",
                            days: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                      <span className="text-muted-foreground text-xs">
                        days from purchase
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpiryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
