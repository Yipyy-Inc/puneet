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
import dynamic from "next/dynamic";

const CameraScanner = dynamic(
  () =>
    import("@/components/retail/CameraScanner").then((m) => ({
      default: m.CameraScanner,
    })),
  { ssr: false },
);

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
  const [cameraOpen, setCameraOpen] = useState(false);
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

  const handleScan = (code: string) => {
    setCameraOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;
    const found = products.find(
      (p) =>
        p.barcode === trimmed || p.variants?.some((v) => v.barcode === trimmed),
    );
    if (found) {
      const variant = found.variants?.find((v) => v.barcode === trimmed);
      const name = variant ? `${found.name} — ${variant.name}` : found.name;
      const price = variant ? variant.price : found.basePrice;
      addToCart(found.id + (variant?.id ?? ""), name, price);
      toast.success(`Scanned: ${name}`);
    } else {
      toast.error(`No product found for barcode: ${trimmed}`);
    }
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
    setCameraOpen(false);
    setActiveCategory("all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[70vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
        {/* ── Fixed header ── */}
        <div className="shrink-0 space-y-3 border-b p-5 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
                <ShoppingBag className="size-4 text-emerald-600" />
              </div>
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
              variant="outline"
              className="h-10 gap-1.5"
              onClick={() => setCameraOpen(true)}
            >
              <Barcode className="size-4" />
              Scan
            </Button>
          </div>

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
            <div className="grid gap-2 md:grid-cols-2">
              {filtered.map((product) => {
                const inCart = cart.has(product.id);
                const cartQty = cart.get(product.id)?.quantity ?? 0;
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "group relative grid grid-cols-[2.75rem,minmax(0,1fr),auto] items-start gap-3 rounded-xl border p-3 transition-all duration-200",
                      inCart
                        ? "border-emerald-300 bg-emerald-50/60 shadow-sm"
                        : "border-slate-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
                        inCart
                          ? "bg-emerald-100"
                          : "bg-slate-100 group-hover:bg-emerald-50",
                      )}
                    >
                      <ShoppingBag
                        className={cn(
                          "size-5 transition-colors",
                          inCart
                            ? "text-emerald-600"
                            : "text-slate-400 group-hover:text-emerald-500",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="pr-1 text-sm/tight font-medium break-words"
                        title={product.name}
                      >
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
                      <div className="flex min-w-[86px] shrink-0 items-center justify-end gap-1 self-start">
                        <button
                          onClick={() =>
                            updateQuantity(product.id, cartQty - 1)
                          }
                          className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition-all hover:bg-emerald-50"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-emerald-700 tabular-nums">
                          {cartQty}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(product.id, cartQty + 1)
                          }
                          className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition-all hover:bg-emerald-50"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          addToCart(product.id, product.name, product.basePrice)
                        }
                        className="flex size-8 shrink-0 items-center justify-center self-start rounded-lg text-slate-300 transition-all hover:scale-110 hover:bg-emerald-50 hover:text-emerald-500"
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
        <div className="shrink-0 border-t bg-slate-50/80 p-5 pt-4">
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
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm"
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
              className="flex-1 gap-1.5 bg-emerald-500 hover:bg-emerald-600"
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

      {/* Camera scanner dialog — same as retail module */}
      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="flex flex-col gap-0 p-0 max-sm:inset-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-sm">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="size-5" />
              Scan Barcode
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-5 pb-5">
            {cameraOpen && <CameraScanner onScan={handleScan} />}
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setCameraOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
