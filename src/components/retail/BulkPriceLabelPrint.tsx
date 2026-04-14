"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { Printer, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/retail";

interface BulkPriceLabelPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  selectedProductIds: Set<string | number>;
}

type SelectionMode = "selected" | "new" | "custom";

const LABEL_SIZES = [
  { value: "standard", label: 'Standard (2" x 1")', width: 192, height: 96 },
  { value: "small", label: 'Small (1.5" x 0.75")', width: 144, height: 72 },
  { value: "large", label: 'Large (3" x 1.5")', width: 288, height: 144 },
] as const;

function isCreatedWithinDays(dateValue: string, days: number) {
  const created = new Date(dateValue);
  if (Number.isNaN(created.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

export function BulkPriceLabelPrint({
  open,
  onOpenChange,
  products,
  selectedProductIds,
}: BulkPriceLabelPrintProps) {
  const [mode, setMode] = useState<SelectionMode>("selected");
  const [newWindowDays, setNewWindowDays] = useState("14");
  const [search, setSearch] = useState("");
  const [customSelected, setCustomSelected] = useState<Set<string>>(new Set());
  const [includeVariants, setIncludeVariants] = useState(false);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [quantityPerItem, setQuantityPerItem] = useState(1);
  const [labelSize, setLabelSize] =
    useState<(typeof LABEL_SIZES)[number]["value"]>("standard");

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const selectedProducts = useMemo(() => {
    if (mode === "selected") {
      return products.filter((product) => selectedProductIds.has(product.id));
    }

    if (mode === "new") {
      const days = parseInt(newWindowDays, 10);
      return products.filter((product) =>
        isCreatedWithinDays(product.createdAt, days),
      );
    }

    return products.filter((product) => customSelected.has(product.id));
  }, [mode, products, selectedProductIds, newWindowDays, customSelected]);

  const labelRows = useMemo(() => {
    const rows: Array<{
      labelId: string;
      productName: string;
      price: number;
      barcode: string;
      sku: string;
      subtitle?: string;
    }> = [];

    for (const product of selectedProducts) {
      if (
        includeVariants &&
        product.hasVariants &&
        product.variants.length > 0
      ) {
        for (const variant of product.variants) {
          for (let i = 0; i < quantityPerItem; i++) {
            rows.push({
              labelId: `${product.id}-${variant.id}-${i}`,
              productName: product.name,
              subtitle: variant.name,
              price: variant.price,
              barcode: variant.barcode || product.barcode,
              sku: variant.sku || product.sku,
            });
          }
        }
      } else {
        for (let i = 0; i < quantityPerItem; i++) {
          rows.push({
            labelId: `${product.id}-${i}`,
            productName: product.name,
            price: product.basePrice,
            barcode: product.barcode,
            sku: product.sku,
          });
        }
      }
    }

    return rows;
  }, [selectedProducts, includeVariants, quantityPerItem]);

  const activeSize =
    LABEL_SIZES.find((size) => size.value === labelSize) ?? LABEL_SIZES[0];

  const toggleCustomProduct = (id: string) => {
    setCustomSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleModeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    nextMode: SelectionMode,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setMode(nextMode);
    }
  };

  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      toast.error("Select at least one product to print labels");
      return;
    }

    if (labelRows.length === 0) {
      toast.error("No labels available with current options");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const labelsHtml = labelRows
      .map((row) => {
        const safeBarcode = (row.barcode || row.sku || "0000000000").trim();
        const barcodeBars = Array.from({ length: 40 })
          .map((_, i) => {
            const v = safeBarcode.charCodeAt(i % safeBarcode.length) + i * 3;
            const width = ((v >> (i % 4)) & 1) + 1;
            return i % 2 === 0
              ? `<rect x="${i * 3}" y="0" width="${width}" height="40" fill="black"/>`
              : "";
          })
          .join("");

        return `
          <div class="price-label">
            <p class="name">${row.productName}</p>
            ${row.subtitle ? `<p class="subtitle">${row.subtitle}</p>` : ""}
            <p class="price">$${row.price.toFixed(2)}</p>
            <p class="sku">SKU: ${row.sku}</p>
            ${
              includeBarcode
                ? `<svg viewBox="0 0 120 40" class="barcode">${barcodeBars}</svg>
                   <p class="barcode-text">${safeBarcode}</p>`
                : ""
            }
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>Bulk Price Labels</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 16px;
              font-family: "Segoe UI", Arial, sans-serif;
              background: #f8fafc;
            }
            .sheet {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
            }
            .price-label {
              width: ${activeSize.width}px;
              height: ${activeSize.height}px;
              border: 1px dashed #94a3b8;
              background: white;
              border-radius: 8px;
              padding: 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-inside: avoid;
            }
            .name {
              margin: 0;
              font-size: ${activeSize.value === "small" ? 9 : 11}px;
              font-weight: 600;
              text-align: center;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .subtitle {
              margin: 1px 0 0;
              font-size: ${activeSize.value === "small" ? 8 : 10}px;
              color: #475569;
              text-align: center;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .price {
              margin: 2px 0 0;
              font-size: ${activeSize.value === "small" ? 11 : 14}px;
              font-weight: 700;
              letter-spacing: 0.2px;
            }
            .sku {
              margin: 1px 0 0;
              font-size: ${activeSize.value === "small" ? 7 : 9}px;
              color: #64748b;
            }
            .barcode {
              width: 72%;
              height: 28%;
              margin-top: 2px;
            }
            .barcode-text {
              margin: 0;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: ${activeSize.value === "small" ? 7 : 8}px;
            }
            @media print {
              body { padding: 0; background: #fff; }
              .price-label {
                border: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">${labelsHtml}</div>
          <script>window.print()</script>
        </body>
      </html>`);

    printWindow.document.close();

    toast.success(
      `${labelRows.length} price label${labelRows.length !== 1 ? "s" : ""} sent to printer`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Bulk Price Label Printing
          </DialogTitle>
          <DialogDescription>
            Print labels by selected products, newly added products, or custom
            picks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-pointer rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:outline-none",
                mode === "selected"
                  ? "border-sky-400 bg-sky-50"
                  : "border-slate-200 hover:bg-slate-50",
              )}
              onClick={() => setMode("selected")}
              onKeyDown={(event) => handleModeKeyDown(event, "selected")}
            >
              <p className="text-sm font-semibold">Selected</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Use checked products from list
              </p>
              <Badge className="mt-2" variant="outline">
                {selectedProductIds.size} selected
              </Badge>
            </div>

            <div
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-pointer rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none",
                mode === "new"
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 hover:bg-slate-50",
              )}
              onClick={() => setMode("new")}
              onKeyDown={(event) => handleModeKeyDown(event, "new")}
            >
              <p className="text-sm font-semibold">New Products</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Auto-pick recently added items
              </p>
              <div className="mt-2">
                <Select value={newWindowDays} onValueChange={setNewWindowDays}>
                  <SelectTrigger
                    className="h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-pointer rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:outline-none",
                mode === "custom"
                  ? "border-violet-400 bg-violet-50"
                  : "border-slate-200 hover:bg-slate-50",
              )}
              onClick={() => setMode("custom")}
              onKeyDown={(event) => handleModeKeyDown(event, "custom")}
            >
              <p className="text-sm font-semibold">Custom Selection</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Choose exactly what to print
              </p>
              <Badge className="mt-2" variant="outline">
                {customSelected.size} picked
              </Badge>
            </div>
          </div>

          {mode === "custom" && (
            <div className="rounded-lg border border-slate-200">
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products by name, SKU, barcode..."
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto p-3">
                {filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {product.sku} · ${product.basePrice.toFixed(2)}
                      </p>
                    </div>
                    <Checkbox
                      checked={customSelected.has(product.id)}
                      onCheckedChange={() => toggleCustomProduct(product.id)}
                    />
                  </label>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    No products found.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Label Size</Label>
              <Select
                value={labelSize}
                onValueChange={(v) =>
                  setLabelSize(v as (typeof LABEL_SIZES)[number]["value"])
                }
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Qty Per Item</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantityPerItem}
                onChange={(e) =>
                  setQuantityPerItem(
                    Math.max(1, parseInt(e.target.value || "1", 10)),
                  )
                }
                className="mt-1 h-8 text-sm"
              />
            </div>

            <label className="mt-5 flex items-center gap-2">
              <Checkbox
                checked={includeVariants}
                onCheckedChange={(checked) =>
                  setIncludeVariants(Boolean(checked))
                }
              />
              <span className="text-xs">Include Variants</span>
            </label>

            <label className="mt-5 flex items-center gap-2">
              <Checkbox
                checked={includeBarcode}
                onCheckedChange={(checked) =>
                  setIncludeBarcode(Boolean(checked))
                }
              />
              <span className="text-xs">Include Barcode</span>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-sky-600" />
              <span className="text-sm font-medium">Print Summary</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                {selectedProducts.length} products
              </p>
              <p className="text-muted-foreground text-xs">
                {labelRows.length} labels total
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint} className="gap-1.5">
            <Printer className="size-4" />
            Print Price Labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
