"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ShoppingBag,
  Barcode,
  Plus,
  Check,
  Package,
  X,
  Minus,
  SlidersHorizontal,
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
    const activeProducts = products.filter((p) => p.status === "active");
    const counts = new Map<string, number>();
    for (const p of activeProducts) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return { total: activeProducts.length, counts };
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
        p.brand?.toLowerCase().includes(q)
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
      const variant = found.variants?.find((v) => v.barcode === barcodeInput);
      const name = variant ? `${found.name} — ${variant.name}` : found.name;
      const price = variant ? variant.price : found.basePrice;
      addToCart(found.id + (variant?.id ?? ""), name, price);
      toast.success(`Scanned: ${name}`);
    } else {
      toast.error("Product not found");
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
    setActiveCategory("all");
    toast.success(
      `${cartCount} item${cartCount !== 1 ? "s" : ""} added to invoice`,
    );
  };

  const handleClose = () => {
    setSearchQuery("");
    setScanMode(false);
    setActiveCategory("all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* ── Fixed header ── */}
        <div className="shrink-0 space-y-3 border-b p-5 pb-4">
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
                placeholder="Search by name, SKU, barcode, or brand..."
                className="h-10 pl-10"
                autoFocus
              />
            </div>
            <Button
              variant={scanMode ? "default" : "outline"}
              className="h-10 gap-1.5"
              onClick={() => setScanMode(!scanMode)}
            >
              <Barcode className="size-4" />
              Scan
            </Button>
          </div>

          {/* Scanner input */}
          {scanMode && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
              <Barcode className="size-4 shrink-0 text-blue-600" />
              <Input
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleScan();
                }}
                placeholder="Scan or enter barcode..."
                className="h-8 flex-1 border-blue-200 bg-white text-sm"
                autoFocus={scanMode}
              />
              <Button
                size="sm"
                className="h-8"
                onClick={handleScan}
                disabled={!barcodeInput.trim()}
              >
                Add
              </Button>
            </div>
          )}

          {/* Category filter + result count */}
          <div className="flex items-center gap-2">
            <Select value={activeCategory} onValueChange={setActiveCategory}>
              <SelectTrigger className="h-9 w-[200px] text-xs">
                <SlidersHorizontal className="text-muted-foreground mr-1 size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Categories ({categories.total})
                </SelectItem>
                {Array.from(categories.counts.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([cat, count]) => (
                    <SelectItem key={cat} value={cat}>
                      {cat} ({count})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── Scrollable product list — fills remaining space ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="text-muted-foreground/20 mx-auto size-12" />
              <p className="text-muted-foreground mt-3 text-sm">
                No products found
              </p>
              <p className="text-muted-foreground/60 mt-1 text-xs">
                Try a different search or category
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((product) => {
                const inCart = cart.has(product.id);
                const cartQty = cart.get(product.id)?.quantity ?? 0;
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "group relative flex items-start gap-3 rounded-xl border p-3 transition-all",
                      inCart
                        ? "border-primary/40 bg-primary/5"
                        : "hover:border-primary/20 hover:shadow-sm",
                    )}
                  >
                    <div className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-lg">
                      <ShoppingBag className="text-muted-foreground/60 size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight font-medium">
                        {product.name}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {product.brand ?? product.category}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-[tabular-nums] text-sm font-bold">
                          ${product.basePrice.toFixed(2)}
                        </span>
                        {product.stock != null && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                              product.stock <= (product.minStock ?? 5)
                                ? "bg-red-50 text-red-600"
                                : "bg-emerald-50 text-emerald-600",
                            )}
                          >
                            {product.stock} in stock
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Add / Quantity stepper */}
                    {inCart ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateQuantity(product.id, cartQty - 1)
                          }
                          className="text-muted-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md border transition-colors"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {cartQty}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(product.id, cartQty + 1)
                          }
                          className="text-muted-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md border transition-colors"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          addToCart(product.id, product.name, product.basePrice)
                        }
                        className="text-muted-foreground/40 hover:text-primary hover:bg-primary/10 flex size-8 items-center justify-center rounded-lg transition-all"
                      >
                        <Plus className="size-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Fixed footer — cart summary + actions ── */}
        <div className="bg-muted/20 shrink-0 border-t p-5 pt-4">
          {cartItems.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">
                  {cartCount} item{cartCount !== 1 ? "s" : ""} selected
                </p>
                <button
                  onClick={() => setCart(new Map())}
                  className="text-muted-foreground text-xs hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-20 space-y-1 overflow-y-auto">
                {cartItems.map(([id, item]) => (
                  <div
                    key={id}
                    className="bg-background flex items-center gap-2 rounded-lg px-3 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ×{item.quantity}
                    </span>
                    <span className="w-14 text-right font-[tabular-nums] text-xs font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={handleConfirm}
              disabled={cartItems.length === 0}
            >
              <Check className="size-4" />
              Add to Invoice
              {cartTotal > 0 && (
                <span className="font-[tabular-nums]">
                  — ${cartTotal.toFixed(2)}
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
