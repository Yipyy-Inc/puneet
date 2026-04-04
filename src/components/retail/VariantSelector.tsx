"use client";

import { useState } from "react";
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
  design: "Design",
  custom: "Option",
};

// Dimensions that are visual (show image thumbnails instead of text pills)
const VISUAL_DIMS = new Set(["color", "colour", "pattern", "design", "style"]);
const isVisual = (dim: string) => VISUAL_DIMS.has(dim.toLowerCase());

// Accent colors for known color names — drives border glow + dot badge
const COLOR_HEX: Record<string, string> = {
  red: "#EF4444",
  coral: "#FB7185",
  pink: "#F472B6",
  rose: "#F43F5E",
  orange: "#F97316",
  amber: "#F59E0B",
  yellow: "#FBBF24",
  lime: "#84CC16",
  green: "#22C55E",
  forest: "#166534",
  emerald: "#10B981",
  teal: "#0D9488",
  cyan: "#06B6D4",
  sky: "#0EA5E9",
  blue: "#3B82F6",
  navy: "#1E3A5F",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  purple: "#A855F7",
  lavender: "#C4B5FD",
  fuchsia: "#E879F9",
  brown: "#92400E",
  gray: "#9CA3AF",
  grey: "#9CA3AF",
  blush: "#FBA4C0",
  white: "#F8FAFC",
  black: "#1F2937",
  silver: "#CBD5E1",
  gold: "#D97706",
  beige: "#E5D4B3",
  tan: "#D4A574",
  cream: "#FEF3C7",
  charcoal: "#374151",
};

/** Returns the hex for a color label, or undefined if not mapped. */
const getColorHex = (label: string) => COLOR_HEX[label.toLowerCase().trim()];

// ─── Multi-dimensional selector ───────────────────────────────────────────────
// Used when variants have variantAttributes (e.g. { Size: "Small", Color: "Red" })

function MultiDimSelector({
  product,
  onAddToCart,
  onClose,
}: {
  product: Product;
  onAddToCart: (v: ProductVariant, qty: number) => void;
  onClose: () => void;
}) {
  const variants = product.variants ?? [];

  // Derive ordered list of dimensions + their unique values.
  // No manual useMemo — React Compiler handles memoization.
  const order: string[] = [];
  const dimMap = new Map<string, string[]>();
  for (const v of variants) {
    if (!v.variantAttributes) continue;
    for (const [dim, val] of Object.entries(v.variantAttributes)) {
      if (!dimMap.has(dim)) {
        dimMap.set(dim, []);
        order.push(dim);
      }
      if (!dimMap.get(dim)!.includes(val)) dimMap.get(dim)!.push(val);
    }
  }
  const dimensions = order.map((dim) => ({ dim, values: dimMap.get(dim)! }));

  // Initialize selection from first in-stock variant
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0] ?? null;

  const [selected, setSelected] = useState<Record<string, string>>(
    () => firstInStock?.variantAttributes ?? {},
  );
  const [quantity, setQuantity] = useState(1);

  // Find the variant that matches all selected dimensions
  const selectedVariant =
    variants.find(
      (v) =>
        v.variantAttributes &&
        Object.entries(selected).every(
          ([dim, val]) => v.variantAttributes![dim] === val,
        ),
    ) ?? null;

  // For a given dimension value, find the first variant that matches it
  // plus all OTHER currently selected dimensions — for image + stock lookup
  const getVariantForDimValue = (dim: string, val: string) =>
    variants.find(
      (v) =>
        v.variantAttributes?.[dim] === val &&
        Object.entries(selected)
          .filter(([d]) => d !== dim)
          .every(([d, v2]) => v.variantAttributes?.[d] === v2),
    ) ??
    // fallback: ignore other dims (still shows an image)
    variants.find((v) => v.variantAttributes?.[dim] === val) ??
    null;

  const isComboAvailable = (dim: string, val: string) => {
    // Is there any in-stock variant that has this value for this dim
    // and is compatible with other current selections?
    return variants.some(
      (v) =>
        v.variantAttributes?.[dim] === val &&
        v.stock > 0 &&
        Object.entries(selected)
          .filter(([d]) => d !== dim)
          .every(([d, v2]) => v.variantAttributes?.[d] === v2),
    );
  };

  const headerImage =
    selectedVariant?.imageUrl ?? product.imageUrl ?? undefined;

  const handleAdd = () => {
    if (!selectedVariant || selectedVariant.stock === 0) return;
    onAddToCart(selectedVariant, quantity);
    onClose();
    setQuantity(1);
  };

  return (
    <div className="space-y-4 py-1">
      {/* Product header — image updates with selection */}
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl shadow-sm">
          {headerImage ? (
            <img
              src={headerImage}
              alt={selectedVariant?.name ?? product.name}
              className="size-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="bg-muted flex size-full items-center justify-center">
              <Package className="text-muted-foreground/30 size-8" />
            </div>
          )}
        </div>
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

      {/* Per-dimension selectors */}
      {dimensions.map(({ dim, values }) => (
        <div key={dim}>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            {TYPE_LABELS[dim.toLowerCase()] ?? dim}
          </p>

          {isVisual(dim) ? (
            /* Image thumbnail grid for visual dimensions (Color, Design…) */
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const match = getVariantForDimValue(dim, val);
                const isSelected = selected[dim] === val;
                const available = isComboAvailable(dim, val);
                const colorHex = getColorHex(val);

                return (
                  <button
                    key={val}
                    type="button"
                    disabled={!available}
                    onClick={() =>
                      setSelected((prev) => ({ ...prev, [dim]: val }))
                    }
                    style={
                      isSelected && colorHex
                        ? {
                            borderColor: colorHex,
                            boxShadow: `0 0 0 3px ${colorHex}30`,
                          }
                        : undefined
                    }
                    className={cn(
                      "relative flex w-[72px] flex-col items-center gap-1 rounded-xl border-2 p-1.5 transition-all",
                      isSelected
                        ? colorHex
                          ? "" // border + shadow via inline style
                          : "border-primary ring-primary/20 ring-2"
                        : "border-border hover:border-muted-foreground/30",
                      !available && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {/* Variant thumbnail with accent strip + color dot */}
                    <div className="relative size-12 overflow-hidden rounded-lg">
                      {match?.imageUrl ? (
                        <img
                          src={match.imageUrl}
                          alt={val}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex size-full items-center justify-center">
                          <Package className="text-muted-foreground/30 size-5" />
                        </div>
                      )}
                      {/* Colored accent strip at bottom of thumbnail */}
                      {colorHex && (
                        <div
                          className="absolute right-0 bottom-0 left-0 h-1"
                          style={{ backgroundColor: colorHex }}
                        />
                      )}
                      {/* Color dot badge — bottom-right corner */}
                      {colorHex && (
                        <div
                          className="absolute right-0.5 bottom-1.5 size-3 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: colorHex }}
                        />
                      )}
                    </div>
                    <span className="w-full truncate text-center text-[10px] leading-tight font-medium">
                      {val}
                    </span>
                    {!available && (
                      <span className="text-[9px] text-red-500">
                        Out of stock
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Text pill buttons for non-visual dimensions (Size, Weight…) */
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const isSelected = selected[dim] === val;
                const available = isComboAvailable(dim, val);

                return (
                  <button
                    key={val}
                    type="button"
                    disabled={!available}
                    onClick={() =>
                      setSelected((prev) => ({ ...prev, [dim]: val }))
                    }
                    className={cn(
                      "rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                        : "border-border hover:border-muted-foreground/30",
                      !available && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {val}
                    {!available && (
                      <span className="text-muted-foreground ml-1 text-[10px]">
                        · out of stock
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Selected variant summary */}
      {selectedVariant ? (
        <div className="bg-muted/20 rounded-lg border px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{selectedVariant.name}</p>
              <p className="text-muted-foreground text-xs">
                SKU: {selectedVariant.sku}
                {selectedVariant.barcode &&
                  ` · Barcode: ${selectedVariant.barcode}`}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs font-medium",
                  selectedVariant.stock === 0
                    ? "text-red-600"
                    : selectedVariant.stock <= (selectedVariant.minStock ?? 5)
                      ? "text-amber-600"
                      : "text-emerald-600",
                )}
              >
                {selectedVariant.stock === 0
                  ? "Out of stock"
                  : selectedVariant.stock <= (selectedVariant.minStock ?? 5)
                    ? `Low stock — ${selectedVariant.stock} left`
                    : `${selectedVariant.stock} in stock`}
              </p>
            </div>
            <p className="font-[tabular-nums] text-lg font-bold">
              ${selectedVariant.price.toFixed(2)}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-muted/10 rounded-lg border border-dashed px-4 py-3 text-center">
          <p className="text-muted-foreground text-sm">
            This combination is unavailable
          </p>
        </div>
      )}

      {/* Quantity + Add to Cart */}
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
      <Button
        onClick={handleAdd}
        disabled={!selectedVariant || selectedVariant.stock === 0}
        className="w-full gap-1.5"
      >
        <ShoppingCart className="size-4" />
        Add to Cart
        {selectedVariant && selectedVariant.stock > 0 && (
          <span className="font-[tabular-nums]">
            — ${(selectedVariant.price * quantity).toFixed(2)}
          </span>
        )}
      </Button>
    </div>
  );
}

// ─── Single-dimensional selector ──────────────────────────────────────────────
// Backward-compatible: products with a single variantType (size, flavor, etc.)
// Color variants show image thumbnails; everything else shows text pills.

function SingleDimSelector({
  product,
  onAddToCart,
  onClose,
}: {
  product: Product;
  onAddToCart: (v: ProductVariant, qty: number) => void;
  onClose: () => void;
}) {
  const variants = product.variants ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(
    variants.find((v) => v.stock > 0)?.id ?? variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? null;
  const headerImage =
    selectedVariant?.imageUrl ?? product.imageUrl ?? undefined;

  // Group by variantType — no useMemo, React Compiler optimizes
  const groupMap = new Map<string, ProductVariant[]>();
  for (const v of variants) {
    const t = v.variantType ?? "option";
    if (!groupMap.has(t)) groupMap.set(t, []);
    groupMap.get(t)!.push(v);
  }
  const groups = Array.from(groupMap.entries());

  const handleAdd = () => {
    if (!selectedVariant || selectedVariant.stock === 0) return;
    onAddToCart(selectedVariant, quantity);
    onClose();
    setQuantity(1);
  };

  return (
    <div className="space-y-4 py-1">
      {/* Product header */}
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl shadow-sm">
          {headerImage ? (
            <img
              src={headerImage}
              alt={selectedVariant?.name ?? product.name}
              className="size-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="bg-muted flex size-full items-center justify-center">
              <Package className="text-muted-foreground/30 size-8" />
            </div>
          )}
        </div>
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

      {groups.map(([type, groupVariants]) => (
        <div key={type}>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            {TYPE_LABELS[type] ?? type}
          </p>

          {isVisual(type) ? (
            <div className="flex flex-wrap gap-2">
              {groupVariants.map((v) => {
                const isSelected = selectedId === v.id;
                const outOfStock = v.stock <= 0;
                const label = v.variantValue ?? v.name;
                const colorHex = getColorHex(label);

                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => setSelectedId(v.id)}
                    style={
                      isSelected && colorHex
                        ? {
                            borderColor: colorHex,
                            boxShadow: `0 0 0 3px ${colorHex}30`,
                          }
                        : undefined
                    }
                    className={cn(
                      "relative flex w-[72px] flex-col items-center gap-1 rounded-xl border-2 p-1.5 transition-all",
                      isSelected
                        ? colorHex
                          ? ""
                          : "border-primary ring-primary/20 ring-2"
                        : "border-border hover:border-muted-foreground/30",
                      outOfStock && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <div className="relative size-12 overflow-hidden rounded-lg">
                      {v.imageUrl ? (
                        <img
                          src={v.imageUrl}
                          alt={label}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex size-full items-center justify-center">
                          <Package className="text-muted-foreground/30 size-5" />
                        </div>
                      )}
                      {/* Colored accent strip */}
                      {colorHex && (
                        <div
                          className="absolute right-0 bottom-0 left-0 h-1"
                          style={{ backgroundColor: colorHex }}
                        />
                      )}
                      {/* Color dot badge */}
                      {colorHex && (
                        <div
                          className="absolute right-0.5 bottom-1.5 size-3 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: colorHex }}
                        />
                      )}
                    </div>
                    <span className="w-full truncate text-center text-[10px] leading-tight font-medium">
                      {label}
                    </span>
                    <span className="text-muted-foreground font-[tabular-nums] text-[10px]">
                      ${v.price.toFixed(2)}
                    </span>
                    {outOfStock && (
                      <span className="text-[9px] text-red-500">
                        Out of stock
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {groupVariants.map((v) => {
                const isSelected = selectedId === v.id;
                const outOfStock = v.stock <= 0;
                const isLowStock = v.stock > 0 && v.stock <= (v.minStock ?? 5);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => setSelectedId(v.id)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                        : "border-border hover:border-muted-foreground/30",
                      outOfStock && "cursor-not-allowed opacity-40",
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
          )}
        </div>
      ))}

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

      {/* Quantity + Add to Cart */}
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
      <Button
        onClick={handleAdd}
        disabled={!selectedVariant || selectedVariant.stock === 0}
        className="w-full gap-1.5"
      >
        <ShoppingCart className="size-4" />
        Add to Cart
        {selectedVariant && selectedVariant.stock > 0 && (
          <span className="font-[tabular-nums]">
            — ${(selectedVariant.price * quantity).toFixed(2)}
          </span>
        )}
      </Button>
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────────

export function VariantSelector({
  open,
  onOpenChange,
  product,
  onAddToCart,
}: VariantSelectorProps) {
  const isMultiDim = (product.variants ?? []).some(
    (v) => v.variantAttributes && Object.keys(v.variantAttributes).length > 0,
  );

  const handleAdd = (variant: ProductVariant, qty: number) => {
    onAddToCart(variant, qty);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Select Variant</DialogTitle>
        </DialogHeader>

        <div className="max-h-[72vh] overflow-y-auto pr-1">
          {isMultiDim ? (
            <MultiDimSelector
              product={product}
              onAddToCart={handleAdd}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <SingleDimSelector
              product={product}
              onAddToCart={handleAdd}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
