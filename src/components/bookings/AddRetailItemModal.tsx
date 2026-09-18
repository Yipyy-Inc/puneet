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
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRetailProducts } from "@/lib/api/retail-store";
import { NO_ITEMS } from "@/lib/no-items";
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
  const { t, fill, locale } = useStaffText("addRetailItem");
  const money = (value: number) => formatMoney(value, locale);
  const [cart, setCart] = useState<
    Map<string, { name: string; price: number; quantity: number }>
  >(new Map());
  // The facility shelf (retail_products), not `@/data/retail` — a sample
  // shop whose items and prices went onto real bills.
  const { data: shelf } = useRetailProducts();
  const products = shelf ?? NO_ITEMS;

  const categories = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === "active");
    const counts = new Map<string, number>();
    for (const p of activeProducts) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return { total: activeProducts.length, counts };
  }, [products]);

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
  }, [products, searchQuery, activeCategory]);

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
      toast.success(fill("scanned", { name }));
    } else {
      toast.error(fill("noBarcode", { code: trimmed }));
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
    // The page says "added" once the lines are written; this said it first.
    onAddItems(items);
    onOpenChange(false);
    setCart(new Map());
    setSearchQuery("");
    setActiveCategory("all");
  };

  const handleClose = () => {
    setSearchQuery("");
    setCameraOpen(false);
    setActiveCategory("all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* ── Fixed header ── */}
        <div className="border-line shrink-0 space-y-3 border-b p-5 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5" />
              {t("title")}
            </DialogTitle>
          </DialogHeader>

          {/* Search + Scan toggle */}
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="text-ink-tertiary absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="pl-10"
                autoFocus
              />
            </div>
            <Button variant="outline" onClick={() => setCameraOpen(true)}>
              <Barcode className="size-4" />
              {t("scan")}
            </Button>
          </div>

          {/* Category filter + result count */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={activeCategory} onValueChange={setActiveCategory}>
              <SelectTrigger className="w-[220px] max-w-full text-sm">
                <SlidersHorizontal className="text-ink-tertiary mr-1 size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {fill("allCategories", { n: categories.total })}
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
            <span className="text-ink-tertiary text-xs">
              {fill(filtered.length === 1 ? "productsOne" : "productsMany", {
                n: filtered.length,
              })}
            </span>
          </div>
        </div>

        {/* ── Scrollable product list — fills remaining space ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="text-ink-disabled mx-auto size-6" />
              <p className="text-body-ink mt-3 text-sm">{t("noProducts")}</p>
              <p className="text-ink-tertiary mt-1 text-xs">
                {t("noProductsHint")}
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
                    // Chosen is a 2px ring, never a tint (§6 rules 1 and 2).
                    className={cn(
                      "border-line grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border p-3",
                      inCart && "shadow-[inset_0_0_0_2px_var(--primary)]",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-body-ink text-sm/tight font-semibold wrap-break-word">
                        {product.name}
                      </p>
                      <p className="text-ink-tertiary mt-0.5 text-xs">
                        {product.brand ?? product.category}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-body-ink text-sm font-bold tabular-nums">
                          {money(product.basePrice)}
                        </span>
                        {product.stock != null && (
                          <span
                            className={cn(
                              "text-xs",
                              product.stock <= (product.minStock ?? 5)
                                ? "text-warning font-semibold"
                                : "text-ink-tertiary",
                            )}
                          >
                            {fill("inStock", { n: product.stock })}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Add / Quantity stepper */}
                    {inCart ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={fill("oneLess", { name: product.name })}
                          onClick={() =>
                            updateQuantity(product.id, cartQty - 1)
                          }
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="text-body-ink w-6 text-center text-sm font-bold tabular-nums">
                          {cartQty}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={fill("oneMore", { name: product.name })}
                          onClick={() =>
                            updateQuantity(product.id, cartQty + 1)
                          }
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={fill("add", { name: product.name })}
                        onClick={() =>
                          addToCart(product.id, product.name, product.basePrice)
                        }
                      >
                        <Plus className="size-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Fixed footer — cart summary + actions ── */}
        <div className="border-line shrink-0 border-t p-5 pt-4">
          {cartItems.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-body-ink text-xs font-semibold">
                  {fill(cartCount === 1 ? "selectedOne" : "selectedMany", {
                    n: cartCount,
                  })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCart(new Map())}
                >
                  {t("clearAll")}
                </Button>
              </div>
              <ul className="max-h-24 space-y-1 overflow-y-auto">
                {cartItems.map(([id, item]) => (
                  <li
                    key={id}
                    className="border-line flex items-center gap-2 rounded-2xl border px-3 py-1"
                  >
                    <span className="text-body-ink min-w-0 flex-1 truncate text-xs font-semibold">
                      {item.name}
                    </span>
                    <span className="text-ink-tertiary text-xs tabular-nums">
                      ×{item.quantity}
                    </span>
                    <span className="text-body-ink text-right text-xs font-semibold tabular-nums">
                      {money(item.price * item.quantity)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={fill("remove", { name: item.name })}
                      onClick={() => removeFromCart(id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              {t("keep")}
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={cartItems.length === 0}
            >
              <Check className="size-4" />
              {cartTotal > 0
                ? fill("addWithTotal", { amount: money(cartTotal) })
                : t("addToBill")}
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
              {t("scanTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-5 pb-5">
            {cameraOpen && <CameraScanner onScan={handleScan} />}
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setCameraOpen(false)}
            >
              {t("closeScanner")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
