"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ShoppingBag,
  Barcode,
  Plus,
  Check,
  Package,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { products } from "@/data/retail";

interface AddRetailItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItems: (
    items: { name: string; price: number; quantity: number }[],
  ) => void;
}

export function AddRetailItemModal({
  open,
  onOpenChange,
  onAddItems,
}: AddRetailItemModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [scanMode, setScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<
    Map<string, { name: string; price: number; quantity: number }>
  >(new Map());

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["all", ...Array.from(cats).sort()];
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (p.status !== "active") return false;
      if (activeCategory !== "all" && p.category !== activeCategory)
        return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  const handleScan = () => {
    if (!barcodeInput.trim()) return;
    const found = products.find(
      (p) =>
        p.barcode === barcodeInput ||
        p.variants?.some((v) => v.barcode === barcodeInput),
    );
    if (found) {
      const variant = found.variants?.find(
        (v) => v.barcode === barcodeInput,
      );
      const name = variant
        ? `${found.name} — ${variant.name}`
        : found.name;
      const price = variant ? variant.price : found.basePrice;
      addToCart(found.id + (variant?.id ?? ""), name, price);
      toast.success(`Scanned: ${name}`);
    } else {
      toast.error("Product not found for this barcode");
    }
    setBarcodeInput("");
  };

  const addToCart = (id: string, name: string, price: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(id, { name, price, quantity: 1 });
      }
      return next;
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => {
      const next = new Map(prev);
      const item = next.get(id);
      if (item) next.set(id, { ...item, quantity: qty });
      return next;
    });
  };

  const cartItems = Array.from(cart.entries());
  const cartTotal = cartItems.reduce(
    (s, [, item]) => s + item.price * item.quantity,
    0,
  );
  const cartCount = cartItems.reduce((s, [, item]) => s + item.quantity, 0);

  const handleConfirm = () => {
    const items = cartItems.map(([, item]) => ({
      name: item.name,
      price: item.price * item.quantity,
      quantity: item.quantity,
    }));
    onAddItems(items);
    onOpenChange(false);
    setCart(new Map());
    setSearchQuery("");
    toast.success(
      `${cartCount} item${cartCount !== 1 ? "s" : ""} added to invoice`,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setSearchQuery("");
          setScanMode(false);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5" />
            Add Products to Invoice
          </DialogTitle>
        </DialogHeader>

        {/* Search + Scan toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, SKU, or brand..."
              className="pl-10"
              autoFocus
            />
          </div>
          <Button
            variant={scanMode ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setScanMode(!scanMode)}
          >
            <Barcode className="size-4" />
            Scan
          </Button>
        </div>

        {/* Barcode scanner */}
        {scanMode && (
          <div className="animate-in fade-in flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 duration-150">
            <Barcode className="mt-0.5 size-5 shrink-0 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                Barcode Scanner
              </p>
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleScan();
                  }}
                  placeholder="Scan or type barcode..."
                  className="h-8 flex-1 bg-white text-xs"
                  autoFocus={scanMode}
                />
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleScan}
                  disabled={!barcodeInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                activeCategory === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted/50",
              )}
            >
              {cat === "all" ? "All Products" : cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="text-muted-foreground/30 mx-auto size-10" />
              <p className="text-muted-foreground mt-2 text-sm">
                No products found
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((product) => {
                const inCart = cart.has(product.id);
                const cartQty = cart.get(product.id)?.quantity ?? 0;
                return (
                  <button
                    key={product.id}
                    onClick={() =>
                      addToCart(
                        product.id,
                        product.name,
                        product.basePrice,
                      )
                    }
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                      inCart
                        ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
                        : "hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
                      <ShoppingBag className="text-muted-foreground size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {product.brand && `${product.brand} · `}
                        {product.category}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-[tabular-nums] text-sm font-semibold">
                          ${product.basePrice.toFixed(2)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px]"
                        >
                          SKU: {product.sku}
                        </Badge>
                      </div>
                    </div>
                    {inCart ? (
                      <Badge className="bg-primary shrink-0">
                        {cartQty}
                      </Badge>
                    ) : (
                      <Plus className="text-muted-foreground/30 mt-1 size-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart summary */}
        {cartItems.length > 0 && (
          <div className="animate-in slide-in-from-bottom-2 space-y-2 rounded-xl border bg-muted/20 p-3 duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">
                Cart ({cartCount} item{cartCount !== 1 ? "s" : ""})
              </p>
              <button
                onClick={() => setCart(new Map())}
                className="text-muted-foreground text-xs hover:underline"
              >
                Clear
              </button>
            </div>
            <div className="max-h-[120px] space-y-1 overflow-y-auto">
              {cartItems.map(([id, item]) => (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-md bg-background px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(id, item.quantity - 1);
                      }}
                      className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded border text-xs"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(id, item.quantity + 1);
                      }}
                      className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded border text-xs"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-16 text-right font-[tabular-nums] text-xs font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromCart(id);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span className="font-[tabular-nums]">
                ${cartTotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={cartItems.length === 0}
            className="gap-1.5"
          >
            <Check className="size-4" />
            Add {cartCount} Item{cartCount !== 1 ? "s" : ""} to Invoice —
            ${cartTotal.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
