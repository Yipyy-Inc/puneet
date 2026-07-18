"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Package,
  Truck,
  Tag,
  Ruler,
  Shield,
  Sparkles,
  Pencil,
  GitMerge,
  Globe,
  Mail,
  Phone,
  User,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  ExternalLink,
  Receipt,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFacilityRole } from "@/hooks/use-facility-role";
import {
  retailConfig,
  type RetailSupplier,
  type RetailBrand,
  type RetailTaxMode,
  type RetailReceiptFormat,
} from "@/data/retail-config";
import { retailMutations } from "@/lib/api/retail";
import { products, type PricingMethod } from "@/data/retail";
import type { RoundingRule } from "@/lib/retail-pricing";

const TAX_MODES: { value: RetailTaxMode; label: string; hint: string }[] = [
  { value: "HST", label: "HST", hint: "Harmonized Sales Tax" },
  { value: "GST", label: "GST", hint: "Goods & Services Tax" },
  { value: "PST", label: "PST", hint: "Provincial Sales Tax" },
  { value: "QST", label: "QST", hint: "Quebec Sales Tax" },
];

const COLOR_OPTIONS = [
  { value: "red", label: "Red", dot: "bg-red-500" },
  { value: "amber", label: "Amber", dot: "bg-amber-500" },
  { value: "emerald", label: "Green", dot: "bg-emerald-500" },
  { value: "blue", label: "Blue", dot: "bg-blue-500" },
  { value: "purple", label: "Purple", dot: "bg-purple-500" },
  { value: "pink", label: "Pink", dot: "bg-pink-500" },
  { value: "slate", label: "Gray", dot: "bg-slate-500" },
];

let _id = 800;
function nextId(prefix: string) {
  _id += 1;
  return `${prefix}-${_id}`;
}

export function RetailSettings() {
  const { role } = useFacilityRole();
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState(retailConfig.categories);
  const [suppliers, setSuppliers] = useState(retailConfig.suppliers);
  const [brands, setBrands] = useState(retailConfig.brands);
  const [tags, setTags] = useState(retailConfig.productTags);
  const [units, setUnits] = useState(retailConfig.unitsOfMeasure);

  // Tax configuration — single source of truth for the POS + Invoice Template
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    String(retailConfig.taxConfig.defaultRate),
  );
  const [taxMode, setTaxMode] = useState<RetailTaxMode>(
    retailConfig.taxConfig.taxMode,
  );
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState(
    retailConfig.taxConfig.registrationNumber,
  );
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(
    retailConfig.taxConfig.showBreakdownOnReceipt,
  );
  const [exemptCategoryIds, setExemptCategoryIds] = useState<string[]>(
    retailConfig.taxConfig.exemptCategoryIds,
  );

  // Receipt / POS presentation
  const [receiptHeader, setReceiptHeader] = useState(
    retailConfig.receiptConfig.header,
  );
  const [receiptFooter, setReceiptFooter] = useState(
    retailConfig.receiptConfig.footer,
  );
  const [receiptFormat, setReceiptFormat] = useState<RetailReceiptFormat>(
    retailConfig.receiptConfig.format,
  );
  const [receiptShowLogo, setReceiptShowLogo] = useState(
    retailConfig.receiptConfig.showLogo,
  );
  const [receiptReturnPolicy, setReceiptReturnPolicy] = useState(
    retailConfig.receiptConfig.returnPolicy,
  );

  // Low stock alerts
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(retailConfig.lowStockConfig.defaultThreshold),
  );
  const [lowStockNotify, setLowStockNotify] = useState(
    retailConfig.lowStockConfig.notifyStaff,
  );

  // Default pricing method + margin (spec 1.8) — seeds the product form's
  // create path (1.2). The rounding rule is preserved as-is.
  const [defaultPricingMethod, setDefaultPricingMethod] =
    useState<PricingMethod>(retailConfig.pricingConfig.defaultPricingMethod);
  const [defaultMarginPercent, setDefaultMarginPercent] = useState(
    retailConfig.pricingConfig.defaultMarginPercent != null
      ? String(retailConfig.pricingConfig.defaultMarginPercent)
      : "",
  );
  const [rounding, setRounding] = useState<RoundingRule>(
    retailConfig.pricingConfig.rounding,
  );

  // Inline add state
  const [newCat, setNewCat] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [newUnit, setNewUnit] = useState("");

  // ── Manage Brands (spec 1.6): rename + merge to keep brand names canonical ──
  const [renameBrand, setRenameBrand] = useState<RetailBrand | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeBrand, setMergeBrand] = useState<RetailBrand | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

  // Same normalization resolveBrandRule uses, so counts/moves match rule lookups.
  const normalizeBrand = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, "");

  const brandProductCount = (name: string) => {
    const key = normalizeBrand(name);
    return products.filter((p) => normalizeBrand(p.brand) === key).length;
  };

  const addBrand = () => {
    const name = newBrand.trim();
    if (!name) return;
    if (brands.some((b) => normalizeBrand(b.name) === normalizeBrand(name))) {
      toast.error(`"${name}" already exists as a brand.`);
      return;
    }
    setBrands([...brands, { id: nextId("br"), name }]);
    setNewBrand("");
  };

  const handleRenameBrand = () => {
    if (!renameBrand) return;
    const newName = renameValue.trim();
    if (!newName) return;
    const oldName = renameBrand.name;
    if (normalizeBrand(newName) === normalizeBrand(oldName)) {
      // Same name (or only casing/spacing changed on itself) — just relabel.
      const relabeled = brands.map((b) =>
        b.id === renameBrand.id ? { ...b, name: newName } : b,
      );
      setBrands(relabeled);
      retailConfig.brands = relabeled;
      setRenameBrand(null);
      return;
    }
    if (
      brands.some(
        (b) =>
          b.id !== renameBrand.id &&
          normalizeBrand(b.name) === normalizeBrand(newName),
      )
    ) {
      toast.error(
        `"${newName}" already exists. Use Merge to combine the two brands.`,
      );
      return;
    }

    const updatedBrands = brands.map((b) =>
      b.id === renameBrand.id ? { ...b, name: newName } : b,
    );
    setBrands(updatedBrands);
    retailConfig.brands = updatedBrands;

    // Reassign products and any margin rule that referenced the old name so the
    // rename is the canonical, permanent fix (resolveBrandRule stays tolerant
    // as a safety net, but this removes the ambiguity at the source).
    const key = normalizeBrand(oldName);
    let moved = 0;
    for (const p of products) {
      if (normalizeBrand(p.brand) === key) {
        p.brand = newName;
        moved += 1;
      }
    }
    for (const rule of retailConfig.brandMarginRules) {
      if (normalizeBrand(rule.brandName) === key) rule.brandName = newName;
    }
    toast.success(
      `Renamed to "${newName}"${moved ? ` — updated ${moved} product${moved === 1 ? "" : "s"}` : ""}.`,
    );
    setRenameBrand(null);
  };

  const handleMergeBrand = () => {
    if (!mergeBrand || !mergeTargetId) return;
    const target = brands.find((b) => b.id === mergeTargetId);
    if (!target || target.id === mergeBrand.id) return;

    const sourceKey = normalizeBrand(mergeBrand.name);
    const targetKey = normalizeBrand(target.name);
    const targetName = target.name;

    // Reassign every product from the source brand to the target brand.
    let moved = 0;
    for (const p of products) {
      if (normalizeBrand(p.brand) === sourceKey) {
        p.brand = targetName;
        moved += 1;
      }
    }

    // Collapse rules: drop the source's rule; if the target had none, carry the
    // source's margin over so the merged brand keeps a rule.
    const rules = retailConfig.brandMarginRules;
    const sourceRule = rules.find(
      (r) => normalizeBrand(r.brandName) === sourceKey,
    );
    const targetHasRule = rules.some(
      (r) => normalizeBrand(r.brandName) === targetKey,
    );
    let nextRules = rules.filter(
      (r) => normalizeBrand(r.brandName) !== sourceKey,
    );
    if (sourceRule && !targetHasRule) {
      nextRules = [...nextRules, { ...sourceRule, brandName: targetName }];
    }
    retailConfig.brandMarginRules = nextRules;

    const updatedBrands = brands.filter((b) => b.id !== mergeBrand.id);
    setBrands(updatedBrands);
    retailConfig.brands = updatedBrands;

    toast.success(
      `Merged "${mergeBrand.name}" into "${targetName}" — moved ${moved} product${moved === 1 ? "" : "s"}.`,
    );
    setMergeBrand(null);
    setMergeTargetId("");
  };

  const toggleCategoryExempt = (categoryId: string) => {
    setExemptCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const saveTaxConfig = useMutation({
    ...retailMutations.updateTaxConfig({
      defaultRate: Number.parseFloat(defaultTaxRate) || 0,
      taxMode,
      registrationNumber: taxRegistrationNumber.trim(),
      showBreakdownOnReceipt: showTaxBreakdown,
      // Keep only exemptions for categories that still exist
      exemptCategoryIds: exemptCategoryIds.filter((id) =>
        categories.some((c) => c.id === id),
      ),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retail", "tax-config"] });
    },
  });

  const saveReceiptConfig = useMutation({
    ...retailMutations.updateReceiptConfig({
      header: receiptHeader.trim(),
      footer: receiptFooter.trim(),
      format: receiptFormat,
      showLogo: receiptShowLogo,
      returnPolicy: receiptReturnPolicy.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retail", "receipt-config"] });
    },
  });

  const saveLowStockConfig = useMutation({
    ...retailMutations.updateLowStockConfig({
      defaultThreshold: Math.max(
        0,
        Number.parseInt(lowStockThreshold, 10) || 0,
      ),
      notifyStaff: lowStockNotify,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["retail", "low-stock-config"],
      });
    },
  });

  const savePricingConfig = useMutation({
    ...retailMutations.updatePricingConfig({
      defaultPricingMethod,
      defaultMarginPercent:
        defaultMarginPercent.trim() === ""
          ? undefined
          : Number.parseFloat(defaultMarginPercent) || 0,
      rounding,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["retail", "pricing-config"],
      });
    },
  });

  const handleSendTestReceipt = () => {
    const via =
      receiptFormat === "both"
        ? "print and email"
        : receiptFormat === "email"
          ? "email"
          : "print";
    toast.success(`Test receipt sent via ${via}`);
  };

  const handleSave = () => {
    retailConfig.categories = categories;
    retailConfig.suppliers = suppliers;
    retailConfig.brands = brands;
    retailConfig.productTags = tags;
    retailConfig.unitsOfMeasure = units;
    saveTaxConfig.mutate();
    saveReceiptConfig.mutate();
    saveLowStockConfig.mutate();
    savePricingConfig.mutate();
    toast.success("Retail settings saved");
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Retail settings are only accessible to facility owners and managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Retail / POS Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure product categories, suppliers, brands, tags, and units for
          your retail module.
        </p>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4" />
            Product Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="bg-background flex items-center gap-2 rounded-lg border px-3 py-2"
            >
              <Input
                value={cat.name}
                onChange={(e) => {
                  const next = [...categories];
                  next[idx] = { ...cat, name: e.target.value };
                  setCategories(next);
                }}
                className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Select
                value={cat.status}
                onValueChange={(v) => {
                  const next = [...categories];
                  next[idx] = {
                    ...cat,
                    status: v as "active" | "draft",
                  };
                  setCategories(next);
                }}
              >
                <SelectTrigger className="h-6 w-20 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">
                    Active
                  </SelectItem>
                  <SelectItem value="draft" className="text-xs">
                    Draft
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                onClick={() =>
                  setCategories(categories.filter((_, i) => i !== idx))
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCat.trim()) {
                  setCategories([
                    ...categories,
                    {
                      id: nextId("cat"),
                      name: newCat.trim(),
                      status: "active",
                      sortOrder: categories.length,
                    },
                  ]);
                  setNewCat("");
                }
              }}
              placeholder="Add category..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newCat.trim()}
              onClick={() => {
                setCategories([
                  ...categories,
                  {
                    id: nextId("cat"),
                    name: newCat.trim(),
                    status: "active",
                    sortOrder: categories.length,
                  },
                ]);
                setNewCat("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers */}
      <SupplierSection
        suppliers={suppliers}
        onUpdate={setSuppliers}
        nextId={nextId}
      />

      {/* Default Pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4" />
            Default Pricing
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            How new products are priced by default. Individual products can
            still override this on their own page.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Default Pricing Method</Label>
            <Select
              value={defaultPricingMethod}
              onValueChange={(v) => setDefaultPricingMethod(v as PricingMethod)}
            >
              <SelectTrigger
                aria-label="Default Pricing Method"
                className="h-9 max-w-[240px] text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Price</SelectItem>
                <SelectItem value="margin">Product Margin %</SelectItem>
                <SelectItem value="brand_rule">Brand Rule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {defaultPricingMethod === "margin" && (
            <div className="space-y-1.5">
              <Label htmlFor="default-margin-percent" className="text-xs">
                Default Margin %
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="default-margin-percent"
                  type="number"
                  min="0"
                  step="0.1"
                  value={defaultMarginPercent}
                  onChange={(e) => setDefaultMarginPercent(e.target.value)}
                  placeholder="0"
                  className="h-9 max-w-[160px] text-sm"
                />
                <span className="text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Pre-fills the margin field when a new product is created in
                margin mode.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Selling Price Rounding</Label>
            <Select
              value={rounding}
              onValueChange={(v) => setRounding(v as RoundingRule)}
            >
              <SelectTrigger
                aria-label="Selling Price Rounding"
                className="h-9 max-w-[240px] text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No rounding</SelectItem>
                <SelectItem value="nearest_0.05">Nearest $0.05</SelectItem>
                <SelectItem value="nearest_0.10">Nearest $0.10</SelectItem>
                <SelectItem value="nearest_0.25">Nearest $0.25</SelectItem>
                <SelectItem value="nearest_0.50">Nearest $0.50</SelectItem>
                <SelectItem value="up_whole_dollar">
                  Round up to whole dollar
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Applies to every margin-calculated price (product form, brand
              rules, invoice import). Changing this affects future calculations
              only — it does not re-round prices that are already set.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tax Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="size-4" />
            Tax Configuration
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Single source of truth for POS and invoice tax. Replaces the
            hardcoded tax logic in the point-of-sale module.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Default rate + tax mode */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="default-tax-rate" className="text-xs">
                Default Tax Rate (%)
              </Label>
              <Input
                id="default-tax-rate"
                type="number"
                step="0.001"
                min="0"
                max="100"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
                placeholder="5"
                className="h-9 text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Applied to all taxable products unless overridden
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tax Mode</Label>
              <Select
                value={taxMode}
                onValueChange={(v) => setTaxMode(v as RetailTaxMode)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="font-medium">{m.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {m.hint}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                For Canadian facilities
              </p>
            </div>
          </div>

          {/* Registration number */}
          <div className="space-y-1.5">
            <Label htmlFor="tax-registration" className="text-xs">
              Tax Registration Number
            </Label>
            <Input
              id="tax-registration"
              value={taxRegistrationNumber}
              onChange={(e) => setTaxRegistrationNumber(e.target.value)}
              placeholder="e.g. 123456789 RT0001"
              className="h-9 text-sm"
            />
          </div>

          <Separator />

          {/* Show breakdown on receipt */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                Show tax breakdown on receipt
              </p>
              <p className="text-muted-foreground text-xs">
                Itemize each tax line on printed and emailed receipts.
              </p>
            </div>
            <Switch
              checked={showTaxBreakdown}
              onCheckedChange={setShowTaxBreakdown}
            />
          </div>

          <Separator />

          {/* Per-category tax exemptions */}
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Tax-exempt categories</p>
              <p className="text-muted-foreground text-xs">
                Products in an exempt category are sold without tax.
              </p>
            </div>
            {categories.length === 0 ? (
              <p className="text-muted-foreground py-2 text-xs">
                Add product categories above to configure exemptions.
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <span className="text-sm">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      {exemptCategoryIds.includes(cat.id) && (
                        <Badge variant="secondary" className="text-[10px]">
                          Exempt
                        </Badge>
                      )}
                      <Switch
                        checked={exemptCategoryIds.includes(cat.id)}
                        onCheckedChange={() => toggleCategoryExempt(cat.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manage Brands */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4" />
            Manage Brands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {brands.map((brand) => {
              const count = brandProductCount(brand.name);
              return (
                <div
                  key={brand.id}
                  className="bg-background flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{brand.name}</span>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {count} {count === 1 ? "product" : "products"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Rename ${brand.name}`}
                      onClick={() => {
                        setRenameBrand(brand);
                        setRenameValue(brand.name);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Merge ${brand.name}`}
                      disabled={brands.length < 2}
                      onClick={() => {
                        setMergeBrand(brand);
                        setMergeTargetId("");
                      }}
                    >
                      <GitMerge className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      aria-label={`Delete ${brand.name}`}
                      onClick={() =>
                        setBrands(brands.filter((b) => b.id !== brand.id))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {brands.length === 0 && (
              <p className="text-muted-foreground py-2 text-center text-sm">
                No brands yet.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addBrand();
              }}
              placeholder="Add brand..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newBrand.trim()}
              onClick={addBrand}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rename Brand */}
      <Dialog
        open={!!renameBrand}
        onOpenChange={(open) => !open && setRenameBrand(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Brand Name</Label>
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameBrand();
              }}
              placeholder="Brand name"
            />
            <p className="text-muted-foreground text-xs">
              Updates the name on every product using this brand and on its
              margin rule, so &ldquo;Brand Rule&rdquo; pricing keeps matching.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameBrand(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameBrand} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Brand */}
      <Dialog
        open={!!mergeBrand}
        onOpenChange={(open) => {
          if (!open) {
            setMergeBrand(null);
            setMergeTargetId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-muted-foreground text-sm">
              Move every product from{" "}
              <span className="text-foreground font-medium">
                {mergeBrand?.name}
              </span>{" "}
              to another brand, then remove{" "}
              <span className="text-foreground font-medium">
                {mergeBrand?.name}
              </span>
              . Duplicate margin rules are collapsed into one.
            </p>
            <div className="space-y-2">
              <Label>Merge into</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger aria-label="Merge into">
                  <SelectValue placeholder="Select target brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands
                    .filter((b) => b.id !== mergeBrand?.id)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({brandProductCount(b.name)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMergeBrand(null);
                setMergeTargetId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleMergeBrand} disabled={!mergeTargetId}>
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4" />
            Product Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => {
              const colorDot =
                COLOR_OPTIONS.find((c) => c.value === tag.color)?.dot ??
                "bg-slate-500";
              return (
                <div
                  key={tag.id}
                  className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1"
                >
                  <div className={cn("size-2 rounded-full", colorDot)} />
                  <span className="text-xs font-medium">{tag.name}</span>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="h-8 flex-1 text-sm"
            />
            <Select value={newTagColor} onValueChange={setNewTagColor}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "size-2.5 rounded-full",
                      COLOR_OPTIONS.find((c) => c.value === newTagColor)?.dot,
                    )}
                  />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2.5 rounded-full", c.dot)} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newTag.trim()}
              onClick={() => {
                setTags([
                  ...tags,
                  {
                    id: nextId("tag"),
                    name: newTag.trim(),
                    color: newTagColor,
                  },
                ]);
                setNewTag("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Units of Measure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Ruler className="size-4" />
            Units of Measure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {units.map((unit, idx) => (
              <div
                key={unit.id}
                className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1"
              >
                <span className="text-xs font-medium">{unit.name}</span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setUnits(units.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newUnit.trim()) {
                  setUnits([
                    ...units,
                    { id: nextId("unit"), name: newUnit.trim() },
                  ]);
                  setNewUnit("");
                }
              }}
              placeholder="Add unit..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newUnit.trim()}
              onClick={() => {
                setUnits([
                  ...units,
                  { id: nextId("unit"), name: newUnit.trim() },
                ]);
                setNewUnit("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="low-stock-threshold" className="text-xs">
              Default low-stock threshold (units)
            </Label>
            <Input
              id="low-stock-threshold"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder="5"
              className="h-9 max-w-[160px] text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Alert me when any product falls below this many units. Per-product
              overrides are set from the individual product page.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                Send low-stock alert to staff notifications
              </p>
              <p className="text-muted-foreground text-xs">
                Post an alert to the staff notifications channel when a product
                hits its threshold.
              </p>
            </div>
            <Switch
              checked={lowStockNotify}
              onCheckedChange={setLowStockNotify}
            />
          </div>
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="size-4" />
            Receipt Settings
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Customize how POS receipts look and how they reach customers.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="receipt-header" className="text-xs">
              Receipt header
            </Label>
            <Textarea
              id="receipt-header"
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
              placeholder="Custom text shown at the top of the receipt (e.g. store name, address)"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt-footer" className="text-xs">
              Receipt footer
            </Label>
            <Textarea
              id="receipt-footer"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="e.g. Thank you for shopping with us!"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Receipt format</Label>
              <Select
                value={receiptFormat}
                onValueChange={(v) =>
                  setReceiptFormat(v as RetailReceiptFormat)
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="print">Print</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                How receipts are delivered at checkout.
              </p>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Show facility logo</p>
                <p className="text-muted-foreground text-xs">
                  Print the facility logo at the top of the receipt.
                </p>
              </div>
              <Switch
                checked={receiptShowLogo}
                onCheckedChange={setReceiptShowLogo}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt-return-policy" className="text-xs">
              Return policy
            </Label>
            <Textarea
              id="receipt-return-policy"
              value={receiptReturnPolicy}
              onChange={(e) => setReceiptReturnPolicy(e.target.value)}
              placeholder="e.g. Returns accepted within 30 days with receipt."
              rows={2}
              className="text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Printed near the bottom of every receipt.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSendTestReceipt}
            >
              <Send className="size-3.5" />
              Send test receipt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Retail Settings
        </Button>
      </div>
    </div>
  );
}

// ── Supplier Section ─────────────────────────────────────────────────

function emptySupplier(id: string): RetailSupplier {
  return { id, name: "", status: "active" };
}

function SupplierSection({
  suppliers,
  onUpdate,
  nextId,
}: {
  suppliers: RetailSupplier[];
  onUpdate: (s: RetailSupplier[]) => void;
  nextId: (prefix: string) => string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RetailSupplier | null>(null);
  const [form, setForm] = useState<RetailSupplier>(emptySupplier(""));
  const [showPassword, setShowPassword] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptySupplier(nextId("sup")));
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (sup: RetailSupplier) => {
    setEditing(sup);
    setForm({ ...sup });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (editing) {
      onUpdate(suppliers.map((s) => (s.id === editing.id ? form : s)));
      toast.success(`"${form.name}" updated`);
    } else {
      onUpdate([...suppliers, form]);
      toast.success(`"${form.name}" added`);
    }
    setModalOpen(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100">
              <Truck className="size-4 text-indigo-700" />
            </div>
            Suppliers
            <Badge variant="secondary" className="text-[10px]">
              {suppliers.length}
            </Badge>
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add Supplier
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Truck className="text-muted-foreground/30 size-10" />
              <p className="text-muted-foreground mt-2 text-sm">
                No suppliers yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{sup.name}</p>
                      {sup.status === "inactive" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                      {sup.orderingPortalUrl && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <KeyRound className="size-2.5" />
                          Portal
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                      {sup.contactPerson && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {sup.contactPerson}
                        </span>
                      )}
                      {sup.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          {sup.email}
                        </span>
                      )}
                      {sup.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {sup.phone}
                        </span>
                      )}
                      {sup.paymentTerms && (
                        <Badge variant="outline" className="text-[10px]">
                          {sup.paymentTerms}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openEdit(sup)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() => {
                        onUpdate(suppliers.filter((s) => s.id !== sup.id));
                        toast.success(`"${sup.name}" removed`);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
            {/* Company */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Company
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Supplier Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. PawNutrition Inc."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Website</Label>
                  <div className="relative">
                    <Globe className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.website ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          website: e.target.value || undefined,
                        })
                      }
                      placeholder="https://..."
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input
                  value={form.address ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value || undefined })
                  }
                  placeholder="Street address, city, state, zip"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Contact Person
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <div className="relative">
                    <User className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.contactPerson ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contactPerson: e.target.value || undefined,
                        })
                      }
                      placeholder="Contact name"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.phone ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value || undefined })
                      }
                      placeholder="(555) 000-0000"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.email ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value || undefined })
                      }
                      placeholder="email@supplier.com"
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ordering Portal */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Ordering Portal
              </p>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs">Portal URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ExternalLink className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                      <Input
                        value={form.orderingPortalUrl ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            orderingPortalUrl: e.target.value || undefined,
                          })
                        }
                        placeholder="https://portal.supplier.com"
                        className="pl-8"
                      />
                    </div>
                    {form.orderingPortalUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          window.open(form.orderingPortalUrl, "_blank")
                        }
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Username</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={form.orderingPortalUsername ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            orderingPortalUsername: e.target.value || undefined,
                          })
                        }
                        placeholder="Username"
                      />
                      {form.orderingPortalUsername && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              form.orderingPortalUsername!,
                              "Username",
                            )
                          }
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Password</Label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={form.orderingPortalPassword ?? ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              orderingPortalPassword:
                                e.target.value || undefined,
                            })
                          }
                          placeholder="Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-muted-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                        >
                          {showPassword ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                      {form.orderingPortalPassword && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              form.orderingPortalPassword!,
                              "Password",
                            )
                          }
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Notes */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Payment & Notes
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Terms</Label>
                  <Select
                    value={form.paymentTerms ?? ""}
                    onValueChange={(v) =>
                      setForm({ ...form, paymentTerms: v || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">COD</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={form.status ?? "active"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        status: v as "active" | "inactive",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value || undefined })
                  }
                  placeholder="Special instructions, minimum orders, etc."
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
