"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";
import { toast } from "sonner";
import { useFacilityRole } from "@/hooks/use-facility-role";
import type {
  RetailConfig,
  RetailSupplier,
  RetailBrand,
  RetailTaxMode,
  RetailReceiptFormat,
} from "@/data/retail-config";
import type { PricingMethod, Product } from "@/types/retail";
import { useRetailConfig } from "@/hooks/use-retail-config";
import { retailKeys, useRetailProducts } from "@/lib/api/retail-store";
import { Skeleton } from "@/components/ui/skeleton";
import { NO_ITEMS } from "@/lib/no-items";
import type { RoundingRule } from "@/lib/retail-pricing";

// The `label` is the CODE — HST, GST, PST, QST are the same four letters in
// both languages, and they are what a facility writes on a receipt. Only the
// expansion is translated, and it is a key.
const TAX_MODES: { value: RetailTaxMode; label: string; hintKey: string }[] = [
  { value: "HST", label: "HST", hintKey: "taxHst" },
  { value: "GST", label: "GST", hintKey: "taxGst" },
  { value: "PST", label: "PST", hintKey: "taxPst" },
  { value: "QST", label: "QST", hintKey: "taxQst" },
];

/**
 * ── THE SECTION SAVES THE FACILITY'S RETAIL CONFIGURATION ────────────────
 *
 * It assigned into `retailConfig` — a module object from
 * `@/data/retail-config` — and renamed brands on the fixture's thirteen
 * products in place: every save lasted until the page reloaded, and the till
 * never saw it. It writes the `retail_config` settings domain now
 * (lib/settings/retail-config.ts) through `useRetailConfig`, and a brand
 * rename or merge renames the brand on the facility's real products.
 *
 * A supplier's portal password is not kept: a login in plain text inside a
 * settings blob is a credential nobody meant to store.
 */
// Same normalization resolveBrandRule uses, so counts and moves match rule
// lookups.
function normalizeBrand(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/** Rename the brand on every product that carries `fromKey`. Returns how many. */
async function reassignProducts(
  products: readonly Product[],
  fromKey: string,
  toName: string,
): Promise<number> {
  const moving = products.filter((p) => normalizeBrand(p.brand) === fromKey);
  for (const p of moving) {
    const response = await fetch(
      `/api/retail/products/${encodeURIComponent(p.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: toName }),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? String(response.status));
    }
  }
  return moving.length;
}

/**
 * Fill a translated template.
 *
 * Module level, not a closure in the component: the brand handlers above
 * mutate `retailConfig` and the products fixture in place, and the React
 * Compiler will not memoise a scope that does that — closing over a
 * component-scope helper drags those statements into a scope it then refuses,
 * with twelve "This value cannot be modified" errors.
 */
function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, value),
    template,
  );
}

const COLOR_OPTIONS = [
  { value: "red", key: "colourRed", dot: "bg-red-500" },
  { value: "amber", key: "colourAmber", dot: "bg-amber-500" },
  { value: "emerald", key: "colourGreen", dot: "bg-emerald-500" },
  { value: "blue", key: "colourBlue", dot: "bg-blue-500" },
  { value: "purple", key: "colourPurple", dot: "bg-purple-500" },
  { value: "pink", key: "colourPink", dot: "bg-pink-500" },
  { value: "slate", key: "colourGrey", dot: "bg-slate-500" },
];

let _id = 800;
function nextId(prefix: string) {
  _id += 1;
  return `${prefix}-${_id}`;
}

export function RetailSettings() {
  // Not until the saved configuration is in: a form seeded from the fallback
  // and saved would overwrite what the facility set.
  const { config, pending, save } = useRetailConfig();
  const products = useRetailProducts().data ?? NO_ITEMS;
  if (pending) {
    return <Skeleton className="h-96 rounded-3xl" />;
  }
  return (
    <RetailSettingsForm initial={config} save={save} products={products} />
  );
}

function RetailSettingsForm({
  initial,
  save,
  products,
}: {
  initial: RetailConfig;
  save: (next: RetailConfig) => Promise<unknown>;
  products: readonly Product[];
}) {
  const retailConfig = initial;
  const t = useSettingsText().section("retail");
  const { role } = useFacilityRole();
  const queryClient = useQueryClient();
  const [brandRules, setBrandRules] = useState(initial.brandMarginRules);
  const [saving, setSaving] = useState(false);
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

  const handleRenameBrand = async () => {
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
      void save(currentConfig({ brands: relabeled })).catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      );
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

    // Reassign products and any margin rule that referenced the old name so the
    // rename is the canonical, permanent fix (resolveBrandRule stays tolerant
    // as a safety net, but this removes the ambiguity at the source).
    const key = normalizeBrand(oldName);
    const renamedRules = brandRules.map((rule) =>
      normalizeBrand(rule.brandName) === key
        ? { ...rule, brandName: newName }
        : rule,
    );
    setBrandRules(renamedRules);
    let moved = 0;
    try {
      await save(
        currentConfig({
          brands: updatedBrands,
          brandMarginRules: renamedRules,
        }),
      );
      moved = await reassignProducts(products, key, newName);
      void queryClient.invalidateQueries({ queryKey: retailKeys.all });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }
    // Was a template with English pluralisation ("product" + "s") spliced
    // into the middle of the sentence. French agrees the participle as well,
    // so each count owns a whole sentence.
    toast.success(
      moved === 0
        ? fill(t("renamedNoProducts"), { name: newName })
        : moved === 1
          ? fill(t("renamedOne"), { name: newName })
          : fill(t("renamedMany"), { name: newName, count: String(moved) }),
    );
    setRenameBrand(null);
  };

  const handleMergeBrand = async () => {
    if (!mergeBrand || !mergeTargetId) return;
    const target = brands.find((b) => b.id === mergeTargetId);
    if (!target || target.id === mergeBrand.id) return;

    const sourceKey = normalizeBrand(mergeBrand.name);
    const targetKey = normalizeBrand(target.name);
    const targetName = target.name;

    // Collapse rules: drop the source's rule; if the target had none, carry the
    // source's margin over so the merged brand keeps a rule.
    const rules = brandRules;
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
    const updatedBrands = brands.filter((b) => b.id !== mergeBrand.id);
    setBrands(updatedBrands);
    setBrandRules(nextRules);

    // The list and the rules, written; then every product from the source
    // brand moved onto the target.
    let moved = 0;
    try {
      await save(
        currentConfig({ brands: updatedBrands, brandMarginRules: nextRules }),
      );
      moved = await reassignProducts(products, sourceKey, targetName);
      void queryClient.invalidateQueries({ queryKey: retailKeys.all });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

    toast.success(
      moved === 1
        ? fill(t("mergedOne"), { from: mergeBrand.name, into: targetName })
        : fill(t("mergedMany"), {
            from: mergeBrand.name,
            into: targetName,
            count: String(moved),
          }),
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

  // Everything this section edits, as the configuration it saves.
  const currentConfig = (patch: Partial<RetailConfig> = {}): RetailConfig => ({
    ...initial,
    categories,
    // The portal password is not stored; see the header.
    suppliers: suppliers.map(
      ({ orderingPortalPassword: _password, ...rest }) => rest,
    ),
    brands,
    productTags: tags,
    unitsOfMeasure: units,
    taxConfig: {
      defaultRate: Number.parseFloat(defaultTaxRate) || 0,
      taxMode,
      registrationNumber: taxRegistrationNumber.trim(),
      showBreakdownOnReceipt: showTaxBreakdown,
      // Keep only exemptions for categories that still exist
      exemptCategoryIds: exemptCategoryIds.filter((id) =>
        categories.some((c) => c.id === id),
      ),
    },
    receiptConfig: {
      header: receiptHeader.trim(),
      footer: receiptFooter.trim(),
      format: receiptFormat,
      showLogo: receiptShowLogo,
      returnPolicy: receiptReturnPolicy.trim(),
    },
    lowStockConfig: {
      defaultThreshold: Math.max(
        0,
        Number.parseInt(lowStockThreshold, 10) || 0,
      ),
      notifyStaff: lowStockNotify,
    },
    pricingConfig: {
      defaultPricingMethod,
      defaultMarginPercent:
        defaultMarginPercent.trim() === ""
          ? undefined
          : Number.parseFloat(defaultMarginPercent) || 0,
      rounding,
    },
    brandMarginRules: brandRules,
    ...patch,
  });

  const handleSendTestReceipt = () => {
    const via =
      receiptFormat === "both"
        ? "testSentBoth"
        : receiptFormat === "email"
          ? "testSentEmail"
          : "testSentPrint";
    toast.success(t(via));
  };

  // The toast waits for the write; a refusal keeps everything typed.
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await save(currentConfig());
      toast.success(t("saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">{t("denied")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4" />
            {t("categories")}
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
                <SelectTrigger className="min-w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">
                    {t("active")}
                  </SelectItem>
                  <SelectItem value="draft" className="text-xs">
                    {t("draft")}
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
              placeholder={t("addCategory")}
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
            {t("defaultPricing")}
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            {t("defaultPricingHelp")}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("pricingMethod")}</Label>
            <Select
              value={defaultPricingMethod}
              onValueChange={(v) => setDefaultPricingMethod(v as PricingMethod)}
            >
              <SelectTrigger
                aria-label={t("pricingMethod")}
                className="max-w-[240px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{t("pricingManual")}</SelectItem>
                <SelectItem value="margin">{t("pricingMargin")}</SelectItem>
                <SelectItem value="brand_rule">{t("pricingBrand")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {defaultPricingMethod === "margin" && (
            <div className="space-y-1.5">
              <Label htmlFor="default-margin-percent" className="text-xs">
                {t("defaultMargin")}
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
                {t("defaultMarginHelp")}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t("rounding")}</Label>
            <Select
              value={rounding}
              onValueChange={(v) => setRounding(v as RoundingRule)}
            >
              <SelectTrigger
                aria-label={t("rounding")}
                className="max-w-[240px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("roundingNone")}</SelectItem>
                <SelectItem value="nearest_0.05">{t("rounding005")}</SelectItem>
                <SelectItem value="nearest_0.10">{t("rounding010")}</SelectItem>
                <SelectItem value="nearest_0.25">{t("rounding025")}</SelectItem>
                <SelectItem value="nearest_0.50">{t("rounding050")}</SelectItem>
                <SelectItem value="up_whole_dollar">
                  {t("roundingWhole")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{t("roundingHelp")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tax Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="size-4" />
            {t("tax")}
          </CardTitle>
          <p className="text-muted-foreground text-xs">{t("taxHelp")}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Default rate + tax mode */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="default-tax-rate" className="text-xs">
                {t("defaultTaxRate")}
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
                {t("defaultTaxRateHelp")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("taxMode")}</Label>
              <Select
                value={taxMode}
                onValueChange={(v) => setTaxMode(v as RetailTaxMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="font-medium">{m.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {t(m.hintKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {t("taxModeHelp")}
              </p>
            </div>
          </div>

          {/* Registration number */}
          <div className="space-y-1.5">
            <Label htmlFor="tax-registration" className="text-xs">
              {t("taxNumber")}
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
              <p className="text-sm font-medium">{t("showTaxBreakdown")}</p>
              <p className="text-muted-foreground text-xs">
                {t("showTaxBreakdownHelp")}
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
              <p className="text-sm font-medium">{t("exemptCategories")}</p>
              <p className="text-muted-foreground text-xs">
                {t("exemptCategoriesHelp")}
              </p>
            </div>
            {categories.length === 0 ? (
              <p className="text-muted-foreground py-2 text-xs">
                {t("exemptCategoriesEmpty")}
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
                          {t("exempt")}
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
            {t("brands")}
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
                      aria-label={`${t("rename")} — ${brand.name}`}
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
                      aria-label={`${t("merge")} — ${brand.name}`}
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
                      aria-label={`${t("delete")} — ${brand.name}`}
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
                {t("noBrands")}
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
              placeholder={t("addBrand")}
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
            <DialogTitle>{t("renameBrand")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t("brandName")}</Label>
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRenameBrand();
              }}
              placeholder={t("brandName")}
            />
            <p className="text-muted-foreground text-xs">
              {t("renameBrandHelp")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameBrand(null)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => void handleRenameBrand()}
              disabled={!renameValue.trim()}
            >
              {t("saveShort")}
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
            <DialogTitle>{t("mergeBrand")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-muted-foreground text-sm">
              {/* One sentence in the catalogue with the brand as a
                  placeholder. The previous version was three JSX fragments —
                  "Move every product from", "to another brand, then remove",
                  ". Duplicate margin rules…" — which no translator can
                  reorder, and French puts the object elsewhere in the
                  clause. §5q. */}
              <InterpolatedText
                template={t("mergeBrandHelp")}
                placeholder="{brand}"
              >
                <span className="text-foreground font-medium">
                  {mergeBrand?.name}
                </span>
              </InterpolatedText>
            </p>
            <div className="space-y-2">
              <Label>{t("mergeInto")}</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger aria-label={t("mergeInto")}>
                  <SelectValue placeholder={t("selectTargetBrand")} />
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
              {t("cancel")}
            </Button>
            <Button
              onClick={() => void handleMergeBrand()}
              disabled={!mergeTargetId}
            >
              {t("merge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4" />
            {t("tags")}
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
                  className="bg-background flex min-h-10 items-center gap-1.5 rounded-full border px-3 max-lg:min-h-12"
                >
                  <div className={cn("size-2 rounded-full", colorDot)} />
                  <span className="text-xs font-medium">{tag.name}</span>
                  <button
                    className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-full max-lg:size-11"
                    onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={t("addTag")}
              className="h-8 flex-1 text-sm"
            />
            <Select value={newTagColor} onValueChange={setNewTagColor}>
              <SelectTrigger className="min-w-24">
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
                      {t(c.key)}
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
            {t("units")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {units.map((unit, idx) => (
              <div
                key={unit.id}
                className="bg-background flex min-h-10 items-center gap-1.5 rounded-full border px-3 max-lg:min-h-12"
              >
                <span className="text-xs font-medium">{unit.name}</span>
                <button
                  className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-full max-lg:size-11"
                  onClick={() => setUnits(units.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-4" />
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
              placeholder={t("addUnit")}
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
            {t("lowStock")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="low-stock-threshold" className="text-xs">
              {t("lowStockThreshold")}
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
              {t("lowStockThresholdHelp")}
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t("lowStockNotify")}</p>
              <p className="text-muted-foreground text-xs">
                {t("lowStockNotifyHelp")}
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
            {t("receipts")}
          </CardTitle>
          <p className="text-muted-foreground text-xs">{t("receiptsHelp")}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="receipt-header" className="text-xs">
              {t("receiptHeader")}
            </Label>
            <Textarea
              id="receipt-header"
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
              placeholder={t("receiptHeaderPlaceholder")}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt-footer" className="text-xs">
              {t("receiptFooter")}
            </Label>
            <Textarea
              id="receipt-footer"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder={t("receiptFooterPlaceholder")}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("receiptFormat")}</Label>
              <Select
                value={receiptFormat}
                onValueChange={(v) =>
                  setReceiptFormat(v as RetailReceiptFormat)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="print">{t("receiptPrint")}</SelectItem>
                  <SelectItem value="email">{t("email")}</SelectItem>
                  <SelectItem value="both">{t("receiptBoth")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {t("receiptFormatHelp")}
              </p>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t("receiptLogo")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("receiptLogoHelp")}
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
              {t("returnPolicy")}
            </Label>
            <Textarea
              id="receipt-return-policy"
              value={receiptReturnPolicy}
              onChange={(e) => setReceiptReturnPolicy(e.target.value)}
              placeholder={t("returnPolicyPlaceholder")}
              rows={2}
              className="text-sm"
            />
            <p className="text-muted-foreground text-xs">
              {t("returnPolicyHelp")}
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
              {t("sendTestReceipt")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="gap-1.5"
        >
          {t("save")}
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
  const t = useSettingsText().section("retail");
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
      toast.error(t("supplierNameRequired"));
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
            {t("suppliers")}
            <Badge variant="secondary" className="text-[10px]">
              {suppliers.length}
            </Badge>
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="size-3.5" />
            {t("addSupplier")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Truck className="text-muted-foreground/30 size-10" />
              <p className="text-muted-foreground mt-2 text-sm">
                {t("noSuppliers")}
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
                          {t("inactive")}
                        </Badge>
                      )}
                      {sup.orderingPortalUrl && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <KeyRound className="size-2.5" />
                          {t("portal")}
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
                  <div className="flex items-center gap-1">
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
              {editing ? t("editSupplier") : t("addSupplier")}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
            {/* Company */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                {t("company")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {t("supplierName")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("supplierNamePlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("website")}</Label>
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
                <Label className="text-xs">{t("address")}</Label>
                <Input
                  value={form.address ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value || undefined })
                  }
                  placeholder={t("addressPlaceholder")}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                {t("contactPerson")}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("name")}</Label>
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
                      placeholder={t("contactNamePlaceholder")}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("phone")}</Label>
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
                  <Label className="text-xs">{t("email")}</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.email ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value || undefined })
                      }
                      placeholder={t("emailPlaceholder")}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ordering Portal */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                {t("orderingPortal")}
              </p>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("portalUrl")}</Label>
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
                    <Label className="text-xs">{t("username")}</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={form.orderingPortalUsername ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            orderingPortalUsername: e.target.value || undefined,
                          })
                        }
                        placeholder={t("username")}
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
                    <Label className="text-xs">{t("password")}</Label>
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
                          placeholder={t("password")}
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
                {t("paymentAndNotes")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("paymentTerms")}</Label>
                  <Select
                    value={form.paymentTerms ?? ""}
                    onValueChange={(v) =>
                      setForm({ ...form, paymentTerms: v || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">COD</SelectItem>
                      <SelectItem value="Net 15">{t("termsNet15")}</SelectItem>
                      <SelectItem value="Net 30">{t("termsNet30")}</SelectItem>
                      <SelectItem value="Net 60">{t("termsNet60")}</SelectItem>
                      <SelectItem value="Prepaid">
                        {t("termsPrepaid")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("status")}</Label>
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
                      <SelectItem value="active">{t("active")}</SelectItem>
                      <SelectItem value="inactive">{t("inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("notes")}</Label>
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value || undefined })
                  }
                  placeholder={t("notesPlaceholder")}
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave}>
              {editing ? t("saveChanges") : t("addSupplier")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
