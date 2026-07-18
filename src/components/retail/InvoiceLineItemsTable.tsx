"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Check,
  Plus,
  ArrowLeft,
  Save,
  AlertTriangle,
  CheckCircle2,
  Printer,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Product, PricingMethod } from "@/types/retail";
import { retailConfig } from "@/data/retail-config";
import { sellingFromMargin } from "@/lib/retail-pricing";
import { BulkPriceLabelPrint } from "@/components/retail/BulkPriceLabelPrint";
import { getOpenPurchaseOrderForSupplier } from "@/data/retail";
import {
  applyInvoiceImport,
  type ApplyInvoiceImportResult,
} from "@/lib/retail/apply-invoice-import";
import type { ExtractedLineItem } from "@/lib/retail/invoice-extraction";
import {
  matchLineToProduct,
  type MatchBucket,
} from "@/lib/retail/invoice-matching";
import {
  costPerSellableUnit,
  totalSellableUnits,
  unitTypeFromPackageUnit,
  packageUnitFromUnitType,
  UNIT_TYPES,
  type UnitType,
} from "@/lib/retail/invoice-line-math";

/** Suggest a short SKU from a product name (editable afterward). */
function suggestSku(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "SKU-01";
  const code = words
    .slice(0, 4)
    .map((w) => w[0])
    .join("");
  return `${code}-01`;
}

const CUSTOM_BRAND = "__custom_brand__";

interface Row {
  id: string;
  description: string;
  matchProductId: string | null;
  matchVariantId: string | null;
  matchLabel: string | null;
  tier: MatchBucket;
  confirmed: boolean;
  isNewProduct: boolean;
  qty: number;
  unitCost: number;
  unitType: UnitType;
  itemsPerUnit: number;
  include: boolean;
  /** True once the row's unit config has been saved back to the product. */
  packagingSaved: boolean;
  /** When false, keep the matched product's stored cost on import. */
  applyCostUpdate: boolean;
  // New-product fields (used when isNewProduct — the product is created on import).
  newName: string;
  newCategory: string;
  newBrand: string;
  newBrandCustom: boolean;
  newSku: string;
  newSkuTouched: boolean;
  newPricingMethod: PricingMethod;
  newMarginPercent: number;
}

interface PickCandidate {
  productId: string;
  variantId: string | null;
  label: string;
  sku: string;
}

interface ImportHeader {
  supplierId: string | null;
  supplierName: string;
  invoiceNumber: string;
  /** From Step 2; null when unknown (e.g. manual entry). */
  invoiceTotal: number | null;
  invoiceFileName?: string;
}

interface InvoiceLineItemsTableProps {
  /** Extracted lines to review; empty for manual entry. */
  initialLines: ExtractedLineItem[];
  /** Full product list for matching + the search-and-pick picker. */
  products: Product[];
  /** Confirmed invoice header from Step 2 (absent for manual entry). */
  header?: ImportHeader;
  onBack: () => void;
}

function toUnitType(raw: string | undefined): UnitType {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("case")) return "Case";
  if (v.includes("box")) return "Box";
  if (v.includes("bag")) return "Bag";
  if (v.includes("pack")) return "Pack";
  if (v.includes("bundle")) return "Bundle";
  return "Each";
}

function buildRow(
  li: ExtractedLineItem,
  index: number,
  products: Product[],
): Row {
  const description = li.description || li.rawText || "";
  const result = matchLineToProduct(description, products);
  const matchedProduct = result.product;

  // If the matched product has a saved "Packaged as", auto-fill the unit config
  // from it so staff just confirm; otherwise fall back to the extracted values.
  const pkg = matchedProduct?.packagedAs;
  const unitType = pkg
    ? unitTypeFromPackageUnit(pkg.unitType)
    : toUnitType(li.unit);
  const itemsPerUnit = pkg
    ? (pkg.itemsPerPackage ?? 1)
    : (li.itemsPerUnit ?? 1);

  return {
    id: `row-${index}`,
    description,
    matchProductId: matchedProduct?.id ?? null,
    matchVariantId: null,
    matchLabel: matchedProduct?.name ?? null,
    tier: result.bucket,
    confirmed: false,
    isNewProduct: !matchedProduct,
    qty: li.quantity ?? 1,
    unitCost: li.unitCost ?? 0,
    unitType,
    itemsPerUnit,
    include: true,
    packagingSaved: false,
    applyCostUpdate: true,
    // Pre-fill new-product fields from the line (used if this becomes a new product).
    newName: description,
    newCategory: "",
    newBrand: "",
    newBrandCustom: false,
    newSku: suggestSku(description),
    newSkuTouched: false,
    newPricingMethod: retailConfig.pricingConfig.defaultPricingMethod,
    newMarginPercent: retailConfig.pricingConfig.defaultMarginPercent ?? 0,
  };
}

export function InvoiceLineItemsTable({
  initialLines,
  products,
  header,
  onBack,
}: InvoiceLineItemsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    initialLines.map((li, i) => buildRow(li, i, products)),
  );
  const nextId = useRef(initialLines.length);
  const [view, setView] = useState<"table" | "summary" | "success">("table");
  const [applyResult, setApplyResult] =
    useState<ApplyInvoiceImportResult | null>(null);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  // An existing OPEN PO for this supplier, if any (spec 2.4). Offer to link.
  const openPo = header?.supplierId
    ? getOpenPurchaseOrderForSupplier(header.supplierId)
    : undefined;
  const [linkToPo, setLinkToPo] = useState(true);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => {
    const id = `row-${nextId.current++}`;
    setRows((prev) => [
      ...prev,
      {
        id,
        description: "",
        matchProductId: null,
        matchVariantId: null,
        matchLabel: null,
        tier: "unmatched",
        confirmed: false,
        isNewProduct: true,
        qty: 1,
        unitCost: 0,
        unitType: "Each",
        itemsPerUnit: 1,
        include: true,
        packagingSaved: false,
        applyCostUpdate: true,
        newName: "",
        newCategory: "",
        newBrand: "",
        newBrandCustom: false,
        newSku: "",
        newSkuTouched: false,
        newPricingMethod: retailConfig.pricingConfig.defaultPricingMethod,
        newMarginPercent: retailConfig.pricingConfig.defaultMarginPercent ?? 0,
      },
    ]);
  };

  const includedRows = rows.filter((r) => r.include);
  const includedCount = includedRows.length;
  const excludedCount = rows.length - includedCount;
  const newCount = includedRows.filter((r) => r.isNewProduct).length;
  const updateCount = includedCount - newCount;
  const lineSum =
    Math.round(includedRows.reduce((s, r) => s + r.qty * r.unitCost, 0) * 100) /
    100;
  const invoiceTotal = header?.invoiceTotal ?? null;
  const totalMismatch =
    invoiceTotal != null && Math.abs(lineSum - invoiceTotal) > 0.01;
  const missingCategory = includedRows.some(
    (r) => r.isNewProduct && !r.newCategory.trim(),
  );

  // Matched lines whose per-sellable cost differs from the product's stored cost.
  const varianceRows = includedRows
    .filter((r) => !r.isNewProduct && r.matchProductId)
    .map((r) => {
      const product = products.find((p) => p.id === r.matchProductId);
      if (!product) return null;
      const newCost = costPerSellableUnit(
        r.unitCost,
        r.itemsPerUnit,
        r.unitType,
      );
      return { row: r, product, oldCost: product.baseCostPrice, newCost };
    })
    .filter(
      (v): v is NonNullable<typeof v> => v != null && v.newCost !== v.oldCost,
    );

  const handleApply = () => {
    const result = applyInvoiceImport({
      rows,
      invoiceNumber: header?.invoiceNumber ?? "",
      supplierId: header?.supplierId ?? null,
      supplierName: header?.supplierName || "Unknown supplier",
      invoiceFile: header?.invoiceFileName
        ? { name: header.invoiceFileName }
        : undefined,
      linkToPoId: openPo && linkToPo ? openPo.id : undefined,
    });
    setApplyResult(result);
    setView("success");
    toast.success(
      `Import complete — ${result.updatedProductIds.length} updated, ${result.newProductIds.length} created`,
    );
  };

  // ── Success screen (task #32) ──────────────────────────────────────────────
  if (view === "success" && applyResult) {
    const { updatedProductIds, newProductIds } = applyResult;
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
            <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-base font-semibold">Import complete</p>
          <p className="text-muted-foreground text-sm">
            {updatedProductIds.length} product
            {updatedProductIds.length === 1 ? "" : "s"} updated,{" "}
            {newProductIds.length} new product
            {newProductIds.length === 1 ? "" : "s"} created.
          </p>
          <p className="text-muted-foreground text-xs">
            {applyResult.linkedToExisting
              ? "Received into the existing purchase order."
              : "A new purchase order was created and marked received."}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push("/facility/dashboard/services/retail/products")
            }
          >
            View updated products
          </Button>
          {newProductIds.length > 0 && (
            <Button onClick={() => setLabelPrintOpen(true)}>
              <Printer className="mr-2 size-4" />
              Print price labels for new products
            </Button>
          )}
        </div>
        <BulkPriceLabelPrint
          open={labelPrintOpen}
          onOpenChange={setLabelPrintOpen}
          products={products}
          selectedProductIds={new Set(newProductIds)}
        />
      </div>
    );
  }

  // ── Import summary ─────────────────────────────────────────────────────────
  if (view === "summary") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-semibold">{updateCount}</p>
            <p className="text-muted-foreground text-xs">Existing to update</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-semibold">{newCount}</p>
            <p className="text-muted-foreground text-xs">New to create</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-semibold">{excludedCount}</p>
            <p className="text-muted-foreground text-xs">Excluded</p>
          </div>
        </div>

        {openPo && (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={linkToPo}
              onCheckedChange={(c) => setLinkToPo(Boolean(c))}
              aria-label="Link to existing purchase order"
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">
                Link to existing PO {openPo.orderNumber}?
              </span>
              <span className="text-muted-foreground block text-xs">
                {header?.supplierName} has an open order (
                {openPo.status.replace(/_/g, " ")}).{" "}
                {linkToPo
                  ? "It will be marked received and these lines appended."
                  : "A new received PO will be created instead."}
              </span>
            </span>
          </label>
        )}

        {varianceRows.length > 0 && (
          <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>
                {varianceRows.length} product
                {varianceRows.length === 1 ? " has" : "s have"} a different cost
                price than recorded. Costs will be updated to match the invoice.
              </p>
            </div>
            <div className="divide-y divide-amber-200 dark:divide-amber-900">
              {varianceRows.map((v) => (
                <label
                  key={v.row.id}
                  className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Checkbox
                      checked={v.row.applyCostUpdate}
                      onCheckedChange={(c) =>
                        update(v.row.id, { applyCostUpdate: Boolean(c) })
                      }
                      aria-label={`Update cost for ${v.product.name}`}
                    />
                    <span className="text-foreground">{v.product.name}</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="text-muted-foreground line-through">
                      ${v.oldCost.toFixed(2)}
                    </span>{" "}
                    &rarr;{" "}
                    <span
                      className={cn(
                        "font-medium",
                        v.row.applyCostUpdate
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      ${v.newCost.toFixed(2)}
                    </span>
                    {!v.row.applyCostUpdate && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (keeping old)
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-muted/40 flex items-center justify-between rounded-lg border p-3 text-sm">
          <span className="text-muted-foreground">
            Included line-item total
          </span>
          <span className="font-medium">${lineSum.toFixed(2)}</span>
        </div>

        {totalMismatch && (
          <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Your line item total (${lineSum.toFixed(2)}) does not match the
              invoice total (${invoiceTotal?.toFixed(2)}). Double-check excluded
              lines before continuing.
            </p>
          </div>
        )}

        {missingCategory && (
          <div className="text-destructive flex gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>Set a category for every new product before importing.</p>
          </div>
        )}

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => setView("table")}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
          <Button
            onClick={handleApply}
            disabled={includedCount === 0 || missingCategory}
          >
            <PackageCheck className="mr-2 size-4" />
            Apply Import
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-h-[55vh] overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-10">Incl.</TableHead>
              <TableHead className="min-w-[180px]">
                Invoice Description
              </TableHead>
              <TableHead className="min-w-[200px]">Matched Product</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-24">Unit Cost</TableHead>
              <TableHead className="w-28">Unit Type</TableHead>
              <TableHead className="w-24">Items / Unit</TableHead>
              <TableHead className="w-28 text-right">Cost / Sellable</TableHead>
              <TableHead className="w-24 text-right">Total Units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isEach = row.unitType === "Each";
              const ipuInvalid =
                !isEach && (!row.itemsPerUnit || row.itemsPerUnit < 1);
              const costPer = costPerSellableUnit(
                row.unitCost,
                row.itemsPerUnit,
                row.unitType,
              );
              const totalUnits = totalSellableUnits(
                row.qty,
                row.itemsPerUnit,
                row.unitType,
              );
              return (
                <Fragment key={row.id}>
                  <TableRow
                    data-included={row.include}
                    className="data-[included=false]:opacity-50"
                  >
                    <TableCell>
                      <Checkbox
                        checked={row.include}
                        onCheckedChange={(v) =>
                          update(row.id, { include: Boolean(v) })
                        }
                        aria-label="Include line"
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.description || (
                        <span className="text-muted-foreground italic">
                          Manual entry
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ProductMatchCell
                        row={row}
                        products={products}
                        onChange={(patch) => update(row.id, patch)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={row.qty}
                        onChange={(e) =>
                          update(row.id, {
                            qty: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="h-8 w-16 text-sm"
                        aria-label="Invoice quantity"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.unitCost}
                        onChange={(e) =>
                          update(row.id, {
                            unitCost: Math.max(
                              0,
                              parseFloat(e.target.value) || 0,
                            ),
                          })
                        }
                        className="h-8 w-20 text-sm"
                        aria-label="Invoice unit cost"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.unitType}
                        onValueChange={(v) =>
                          update(row.id, {
                            unitType: v as UnitType,
                            // Reset to 1 when switching to Each.
                            itemsPerUnit:
                              v === "Each" ? 1 : row.itemsPerUnit || 1,
                          })
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-full text-sm"
                          aria-label="Unit type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_TYPES.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isEach ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={row.itemsPerUnit}
                          onChange={(e) =>
                            update(row.id, {
                              itemsPerUnit: Math.max(
                                0,
                                parseInt(e.target.value, 10) || 0,
                              ),
                            })
                          }
                          className={cn(
                            "h-8 w-20 text-sm",
                            ipuInvalid &&
                              "border-destructive focus-visible:ring-destructive/30",
                          )}
                          aria-label="Items per unit"
                          aria-invalid={ipuInvalid}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {ipuInvalid ? "—" : `$${costPer.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {ipuInvalid ? "—" : totalUnits}
                    </TableCell>
                  </TableRow>
                  {row.isNewProduct && (
                    <TableRow
                      data-included={row.include}
                      className="hover:bg-transparent data-[included=false]:opacity-50"
                    >
                      <TableCell />
                      <TableCell colSpan={8} className="pt-0">
                        <NewProductFields
                          row={row}
                          onChange={(patch) => update(row.id, patch)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground py-8 text-center text-sm"
                >
                  No line items yet. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Add line
        </Button>
        <p className="text-muted-foreground text-xs">
          {includedCount} of {rows.length} item
          {rows.length === 1 ? "" : "s"} included
        </p>
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        <Button
          onClick={() => setView("summary")}
          disabled={includedCount === 0}
        >
          Continue to Summary
        </Button>
      </div>
    </div>
  );
}

// ─── Matched-product cell ────────────────────────────────────────────────────

const TIER_LABEL: Record<Exclude<MatchBucket, "unmatched">, string> = {
  high: "High match",
  medium: "Medium match",
};

function ProductMatchCell({
  row,
  products,
  onChange,
}: {
  row: Row;
  products: Product[];
  onChange: (patch: Partial<Row>) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const flat: PickCandidate[] = products.flatMap((p) =>
      p.hasVariants && p.variants.length > 0
        ? p.variants.map((v) => ({
            productId: p.id,
            variantId: v.id as string | null,
            label: `${p.name} — ${v.name}`,
            sku: v.sku,
          }))
        : [
            {
              productId: p.id,
              variantId: null as string | null,
              label: p.name,
              sku: p.sku,
            },
          ],
    );
    if (!q) return flat.slice(0, 30);
    return flat
      .filter(
        (c) =>
          c.label.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [products, query]);

  const pick = (c: {
    productId: string;
    variantId: string | null;
    label: string;
  }) => {
    // Auto-fill the unit config from the newly-picked product's "Packaged as".
    const picked = products.find((p) => p.id === c.productId);
    const pkg = picked?.packagedAs;
    onChange({
      matchProductId: c.productId,
      matchVariantId: c.variantId,
      matchLabel: c.label,
      isNewProduct: false,
      confirmed: true,
      tier: row.tier === "unmatched" ? "high" : row.tier,
      packagingSaved: false,
      ...(pkg
        ? {
            unitType: unitTypeFromPackageUnit(pkg.unitType),
            itemsPerUnit: pkg.itemsPerPackage ?? 1,
          }
        : {}),
    });
    setPickerOpen(false);
    setQuery("");
  };

  // Offer to save the row's unit config back to the product when it's matched to
  // a real product and differs from that product's stored "Packaged as".
  const matchedProduct = row.matchProductId
    ? products.find((p) => p.id === row.matchProductId)
    : undefined;
  const storedPkg = matchedProduct?.packagedAs;
  const currentIpu = row.unitType === "Each" ? 1 : row.itemsPerUnit;
  const differsFromStored =
    !storedPkg ||
    unitTypeFromPackageUnit(storedPkg.unitType) !== row.unitType ||
    (row.unitType !== "Each" &&
      (storedPkg.itemsPerPackage ?? 1) !== currentIpu);
  const offerSave =
    !row.isNewProduct &&
    !!matchedProduct &&
    !row.packagingSaved &&
    differsFromStored &&
    !(row.unitType !== "Each" && (!row.itemsPerUnit || row.itemsPerUnit < 1));

  const savePackaging = () => {
    // Look up fresh inside the handler (not the render-scope const) so the
    // mock in-place mutation doesn't trip the React Compiler purity rule.
    const target = products.find((p) => p.id === row.matchProductId);
    if (!target) return;
    target.packagedAs =
      row.unitType === "Each"
        ? { unitType: "each" }
        : {
            unitType: packageUnitFromUnitType(row.unitType),
            itemsPerPackage: row.itemsPerUnit,
          };
    onChange({ packagingSaved: true });
    toast.success(`Saved default packaging for ${target.name}`);
  };

  const savePackagingButton = offerSave ? (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground h-6 gap-1 px-2 text-xs"
      onClick={savePackaging}
    >
      <Save className="size-3" />
      Save packaging to product
    </Button>
  ) : null;

  const picker = (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          {row.confirmed || row.isNewProduct ? "Change" : "Change…"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products or SKU…"
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {results.map((c) => (
            <button
              key={`${c.productId}-${c.variantId ?? "base"}`}
              type="button"
              onClick={() => pick(c)}
              className="hover:bg-muted flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left"
            >
              <span className="text-sm">{c.label}</span>
              <span className="text-muted-foreground text-xs">{c.sku}</span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-muted-foreground px-2 py-4 text-center text-xs">
              No products found.
            </p>
          )}
        </div>
        <div className="border-t p-1">
          <button
            type="button"
            onClick={() => {
              onChange({
                isNewProduct: true,
                confirmed: false,
                matchProductId: null,
                matchVariantId: null,
                matchLabel: null,
                tier: "unmatched",
              });
              setPickerOpen(false);
              setQuery("");
            }}
            className="hover:bg-muted flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm"
          >
            <Plus className="size-3.5" />
            Create as new product
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Confirmed states
  if (row.confirmed && !row.isNewProduct) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Check className="size-4 shrink-0 text-emerald-600" />
        <span className="text-sm">{row.matchLabel}</span>
        {picker}
        {savePackagingButton}
      </div>
    );
  }
  if (row.confirmed && row.isNewProduct) {
    return (
      <div className="flex items-center gap-1.5">
        <Check className="size-4 shrink-0 text-emerald-600" />
        <span className="text-sm">New product</span>
        {picker}
      </div>
    );
  }

  // Unconfirmed — unmatched (New Product suggestion)
  if (row.isNewProduct) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className="bg-orange-100 text-xs font-normal text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
          New Product
        </Badge>
        {picker}
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => onChange({ confirmed: true })}
        >
          Confirm new
        </Button>
      </div>
    );
  }

  // Unconfirmed — system suggested a match
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm">{row.matchLabel}</span>
      <Badge
        className={cn(
          "text-xs font-normal",
          row.tier === "high"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        )}
      >
        {row.tier !== "unmatched" ? TIER_LABEL[row.tier] : ""}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 text-xs"
        onClick={() => onChange({ confirmed: true })}
      >
        Confirm
      </Button>
      {picker}
      {savePackagingButton}
    </div>
  );
}

// ─── New-product inline fields (spec: create product during import) ──────────

function NewProductFields({
  row,
  onChange,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
}) {
  const costBasis = costPerSellableUnit(
    row.unitCost,
    row.itemsPerUnit,
    row.unitType,
  );
  const marginSelling = sellingFromMargin(
    costBasis,
    row.newMarginPercent,
    retailConfig.pricingConfig.rounding,
  );
  const categoryMissing = !row.newCategory;

  return (
    <div className="bg-muted/30 space-y-3 rounded-md border p-3">
      <p className="text-muted-foreground text-xs font-medium">
        New product details
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label className="text-xs">Product Name</Label>
          <Input
            value={row.newName}
            onChange={(e) => {
              const name = e.target.value;
              onChange({
                newName: name,
                ...(row.newSkuTouched ? {} : { newSku: suggestSku(name) }),
              });
            }}
            className="h-8 text-sm"
            aria-label="Product Name"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={row.newCategory}
            onValueChange={(v) => onChange({ newCategory: v })}
          >
            <SelectTrigger
              aria-label="Category"
              className={cn(
                "h-8 text-sm",
                categoryMissing &&
                  "border-destructive focus-visible:ring-destructive/30",
              )}
            >
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {retailConfig.categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoryMissing && (
            <span className="text-destructive text-[10px]">
              Required to import
            </span>
          )}
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Brand</Label>
          {row.newBrandCustom ? (
            <Input
              autoFocus
              value={row.newBrand}
              onChange={(e) => onChange({ newBrand: e.target.value })}
              placeholder="Brand name"
              className="h-8 text-sm"
            />
          ) : (
            <Select
              value={row.newBrand || ""}
              onValueChange={(v) =>
                v === CUSTOM_BRAND
                  ? onChange({ newBrandCustom: true, newBrand: "" })
                  : onChange({ newBrand: v })
              }
            >
              <SelectTrigger aria-label="Brand" className="h-8 text-sm">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {retailConfig.brands.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_BRAND}>+ Other brand…</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">SKU</Label>
          <Input
            value={row.newSku}
            onChange={(e) =>
              onChange({ newSku: e.target.value, newSkuTouched: true })
            }
            className="h-8 text-sm"
            aria-label="SKU"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label className="text-xs">Pricing Method</Label>
          <Select
            value={row.newPricingMethod}
            onValueChange={(v) =>
              onChange({ newPricingMethod: v as PricingMethod })
            }
          >
            <SelectTrigger aria-label="Pricing method" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Price</SelectItem>
              <SelectItem value="margin">Product Margin %</SelectItem>
              <SelectItem value="brand_rule">Brand Rule</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {row.newPricingMethod === "margin" && (
          <div className="grid gap-1">
            <Label className="text-xs">Margin %</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.1}
                value={row.newMarginPercent}
                onChange={(e) =>
                  onChange({
                    newMarginPercent: parseFloat(e.target.value) || 0,
                  })
                }
                className="h-8 w-20 text-sm"
                aria-label="Margin percent"
              />
              <span className="text-muted-foreground text-xs">
                &rarr; Sells at{" "}
                <span className="text-foreground font-medium">
                  ${marginSelling.toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-[11px]">
        Created as Active on import and added to the Products list — image,
        description, online visibility &amp; variants are editable afterward.
      </p>
    </div>
  );
}
