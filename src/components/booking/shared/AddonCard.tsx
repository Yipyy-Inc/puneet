"use client";

import { CheckCircle, Scissors } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Add-on that supports quantity (daycare/boarding) or toggle (grooming) */
export interface AddonCardItem {
  id: string;
  name: string;
  description: string;
  image?: string;
  /** For unit-based: price per unit; for fixed: base price */
  pricePerUnit?: number;
  basePrice?: number;
  unit?: string;
  hasUnits: boolean;
  included?: string[];
}

export interface PetOption {
  id: number;
  name: string;
}

/** Quantity + apply-to variant (daycare/boarding) */
interface AddonCardQuantityProps {
  variant: "quantity";
  addon: AddonCardItem;
  selectedPets: PetOption[];
  /** "all" or specific petId */
  applyTo: "all" | number;
  onApplyToChange: (addonId: string, value: "all" | number) => void;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  onAddRemove?: () => void;
  /** When hasUnits is false, this is the "Add" / "Added" toggle */
  isAdded?: boolean;
  selected?: boolean;
  className?: string;
}

/** Toggle variant (grooming add-ons) */
interface AddonCardToggleProps {
  variant: "toggle";
  addon: AddonCardItem;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export type AddonCardProps = AddonCardQuantityProps | AddonCardToggleProps;

export function AddonCard(props: AddonCardProps) {
  if (props.variant === "toggle") {
    return <AddonCardToggle {...props} />;
  }
  return <AddonCardQuantity {...props} />;
}

function AddonCardToggle({
  addon,
  selected = false,
  onClick,
  className,
}: AddonCardToggleProps) {
  const addonWithExtras = addon as AddonCardItem & {
    description?: string;
    image?: string;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "flex flex-col min-h-[280px] border-2 rounded-xl overflow-hidden cursor-pointer transition-all text-left",
        selected
          ? "ring-2 ring-primary border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
        className
      )}
    >
      <div className="h-32 shrink-0 bg-muted relative">
        {addonWithExtras.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={addonWithExtras.image}
            alt={addon.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Scissors className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <CheckCircle className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h4 className="font-semibold text-base">{addon.name}</h4>
        {addonWithExtras.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {addonWithExtras.description}
          </p>
        )}
        <p className="font-semibold text-primary mt-auto pt-2">
          +${addon.basePrice ?? addon.pricePerUnit ?? 0}
        </p>
      </div>
    </div>
  );
}

function AddonCardQuantity({
  addon,
  selectedPets,
  applyTo,
  onApplyToChange,
  quantity,
  onQuantityChange,
  onAddRemove,
  isAdded = false,
  selected = false,
  className,
}: AddonCardQuantityProps) {
  const isAll = applyTo === "all";
  const priceLabel = addon.hasUnits
    ? `$${addon.pricePerUnit} / ${addon.unit}`
    : `$${addon.basePrice}`;

  return (
    <Card
      className={cn(
        "flex flex-col min-h-[320px] overflow-hidden",
        selected && "ring-2 ring-primary",
        className
      )}
    >
      <div className="h-40 w-full shrink-0 bg-muted">
        {addon.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={addon.image}
            alt={addon.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted" />
        )}
      </div>
      <CardContent className="p-4 flex flex-col flex-1 space-y-3">
        <div>
          <h4 className="font-semibold text-base">{addon.name}</h4>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {addon.description}
          </p>
        </div>
        {addon.included && addon.included.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {addon.included.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
        <p className="font-semibold text-primary">{priceLabel}</p>
        {selectedPets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Apply to:</span>
            <Select
              value={isAll ? "all" : String(applyTo)}
              onValueChange={(v) => {
                onApplyToChange(
                  addon.id,
                  v === "all" ? "all" : Number(v)
                );
              }}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pets</SelectItem>
                {selectedPets.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {addon.hasUnits ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={quantity === 0}
                onClick={() => onQuantityChange(-1)}
              >
                −
              </Button>
              <span className="text-sm font-medium min-w-[2ch] text-center">
                {quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onQuantityChange(1)}
              >
                +
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant={isAdded ? "default" : "outline"}
              size="sm"
              onClick={onAddRemove}
            >
              {isAdded ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Added
                </>
              ) : (
                "Add"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
