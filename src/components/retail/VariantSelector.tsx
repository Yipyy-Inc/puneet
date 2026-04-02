"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Minus, Plus, Package, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant } from "@/data/retail";

interface VariantSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onAddToCart: (variant: ProductVariant, quantity: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  weight: "Weight",
  size: "Size",
  color: "Color",
  flavor: "Flavor",
  quantity: "Pack Size",
  scent: "Scent",
  material: "Material",
};

const COLOR_SWATCHES: Record<string, string> = {
  Red: "bg-red-500",
  Blue: "bg-blue-500",
  Green: "bg-emerald-500",
  Pink: "bg-pink-400",
  Black: "bg-gray-900",
  Brown: "bg-amber-700",
  Purple: "bg-purple-500",
  Yellow: "bg-yellow-400",
  Orange: "bg-orange-500",
  White: "bg-white border-2 border-gray-200",
};

export function VariantSelector({
  open,
  onOpenChange,
  product,
  onAddToCart,
}: VariantSelectorProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants?.[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  // Group variants by type
  const variantGroups = useMemo(() => {
    const groups = new Map<string, ProductVariant[]>();
    for (const v of product.variants ?? []) {
      const type = v.variantType ?? "option";
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(v);
    }
    return Array.from(groups.entries());
  }, [product.variants]);

  const selectedVariant = product.variants?.find(
    (v) => v.id === selectedVariantId,
  );

  const handleAdd = () => {
    if (!selectedVariant) return;
    onAddToCart(selectedVariant, quantity);
    onOpenChange(false);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Select Variant</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Product header */}
          <div className="flex items-center gap-4">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="size-20 shrink-0 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="bg-muted flex size-20 shrink-0 items-center justify-center rounded-xl">
                <Package className="text-muted-foreground/30 size-8" />
              </div>
            )}
            <div>
              <p className="font-semibold">{product.name}</p>
              {product.brand && (
                <p className="text-muted-foreground text-sm">{product.brand}</p>
              )}
              <p className="text-muted-foreground text-xs">
                SKU: {product.sku} · {product.category}
              </p>
            </div>
          </div>

          {/* Variant groups */}
          {variantGroups.map(([type, variants]) => {
            const isColor = type === "color";
            return (
              <div key={type}>
                <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                  {TYPE_LABELS[type] ?? type}
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    const outOfStock = v.stock <= 0;
                    const isLowStock =
                      v.stock > 0 && v.stock <= (v.minStock ?? 5);

                    if (isColor) {
                      const swatch =
                        COLOR_SWATCHES[v.variantValue ?? ""] ??
                        "bg-muted border-2";
                      return (
                        <button
                          key={v.id}
                          disabled={outOfStock}
                          onClick={() => setSelectedVariantId(v.id)}
                          className={cn(
                            "relative flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all",
                            isSelected
                              ? "border-primary ring-primary/20 ring-2"
                              : "hover:border-muted-foreground/20 border-transparent",
                            outOfStock && "cursor-not-allowed opacity-30",
                          )}
                        >
                          <div
                            className={cn(
                              "size-8 rounded-full shadow-sm",
                              swatch,
                            )}
                          />
                          <span className="text-[10px] font-medium">
                            {v.variantValue}
                          </span>
                          <span className="text-muted-foreground font-[tabular-nums] text-[10px]">
                            ${v.price.toFixed(2)}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={v.id}
                        disabled={outOfStock}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={cn(
                          "rounded-lg border-2 px-3 py-2 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                            : "border-border hover:border-muted-foreground/30",
                          outOfStock && "cursor-not-allowed opacity-30",
                        )}
                      >
                        <p className="text-sm font-medium">
                          {v.name || v.variantValue}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="font-[tabular-nums] text-xs font-semibold">
                            ${v.price.toFixed(2)}
                          </span>
                          <span
                            className={cn(
                              "text-[10px]",
                              outOfStock
                                ? "text-red-600"
                                : isLowStock
                                  ? "text-amber-600"
                                  : "text-emerald-600",
                            )}
                          >
                            {outOfStock
                              ? "Out of stock"
                              : isLowStock
                                ? `Low: ${v.stock} left`
                                : `${v.stock} in stock`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Selected variant summary */}
          {selectedVariant && (
            <div className="bg-muted/20 rounded-lg border px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {selectedVariant.name || selectedVariant.variantValue}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    SKU: {selectedVariant.sku}
                    {selectedVariant.barcode &&
                      ` · Barcode: ${selectedVariant.barcode}`}
                  </p>
                </div>
                <p className="font-[tabular-nums] text-lg font-bold">
                  ${selectedVariant.price.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Quantity</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-3" />
              </Button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val > 0) setQuantity(val);
                }}
                onFocus={(e) => e.target.select()}
                className="focus:border-primary h-8 w-12 rounded border bg-transparent text-center text-sm font-medium focus:outline-none"
              />
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedVariant}
            className="gap-1.5"
          >
            <ShoppingCart className="size-4" />
            Add to Cart
            {selectedVariant && (
              <span className="font-[tabular-nums]">
                — ${(selectedVariant.price * quantity).toFixed(2)}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
