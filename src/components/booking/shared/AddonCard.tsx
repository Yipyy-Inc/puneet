"use client";

import Image from "next/image";
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
        `flex min-h-[280px] cursor-pointer flex-col overflow-hidden rounded-xl border-2 text-left transition-all`,
        selected
          ? "border-primary bg-primary/5 ring-primary ring-2"
          : `border-border hover:border-primary/50`,
        className,
      )}
    >
      <div className="bg-muted relative h-32 shrink-0">
        {addonWithExtras.image ? (
          <Image
            src={addonWithExtras.image}
            alt={addon.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Scissors className="text-muted-foreground h-8 w-8" />
          </div>
        )}
        {selected && (
          <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-full p-1">
            <CheckCircle className="size-4" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h4 className="text-base font-semibold">{addon.name}</h4>
        {addonWithExtras.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {addonWithExtras.description}
          </p>
        )}
        <p className="text-primary mt-auto pt-2 font-semibold">
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
        "flex min-h-[320px] flex-col overflow-hidden",
        selected && "ring-primary ring-2",
        className,
      )}
    >
      <div className="bg-muted relative h-40 w-full shrink-0">
        {addon.image ? (
          <Image
            src={addon.image}
            alt={addon.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="bg-muted flex h-full w-full items-center justify-center" />
        )}
      </div>
      <CardContent className="flex flex-1 flex-col space-y-3 p-4">
        <div>
          <h4 className="text-base font-semibold">{addon.name}</h4>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {addon.description}
          </p>
        </div>
        {addon.included && addon.included.length > 0 && (
          <ul className="text-muted-foreground space-y-0.5 text-xs">
            {addon.included.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-center gap-1">
                <CheckCircle className="text-primary h-3 w-3 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
        <p className="text-primary font-semibold">{priceLabel}</p>
        {selectedPets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Apply to:</span>
            <Select
              value={isAll ? "all" : String(applyTo)}
              onValueChange={(v) => {
                onApplyToChange(addon.id, v === "all" ? "all" : Number(v));
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
        <div className="mt-auto flex items-center gap-2 pt-1">
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
              <span className="min-w-[2ch] text-center text-sm font-medium">
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
                  <CheckCircle className="mr-1 h-3 w-3" />
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
