"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  groomingQueries,
  findAffectedUpcomingAppointments,
  propagatePackageChangesToUpcoming,
} from "@/lib/api/grooming";
import type { GroomingAppointment } from "@/types/grooming";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  DollarSign,
  Plus,
  Scissors,
  Info,
  Package,
  Trash2,
  FlaskConical,
  Image as ImageIcon,
  Clock,
  CalendarDays,
  X,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  GroomingPackage,
  ProductUsage,
  MeasurementUnit,
  DefaultAddOnRule,
  DefaultAddOnCondition,
  AgeGroupPricingRule,
  AgeGroupAdjustment,
} from "@/types/grooming";
import { groomingProducts } from "@/data/grooming";
import { GROOMING_ADD_ONS } from "@/data/grooming-add-ons";
import {
  describeAddOnConditions,
  describeAgeGroupRule,
} from "@/lib/api/grooming";

// ─── Constants ────────────────────────────────────────────────────────────────

const PET_SIZES = [
  { key: "small", label: "Small", hint: "Under 15 lbs" },
  { key: "medium", label: "Medium", hint: "15–40 lbs" },
  { key: "large", label: "Large", hint: "40–70 lbs" },
  { key: "giant", label: "Giant", hint: "70+ lbs" },
] as const;

const COAT_TYPES = [
  { key: "short", label: "Short" },
  { key: "medium", label: "Medium" },
  { key: "long", label: "Long" },
  { key: "wire", label: "Wire" },
  { key: "curly", label: "Curly" },
  { key: "double", label: "Double" },
] as const;

const COMMON_BREEDS = [
  "Golden Retriever",
  "Labrador",
  "Poodle",
  "Doodle Mix",
  "German Shepherd",
  "Husky",
  "French Bulldog",
  "Shih Tzu",
  "Yorkshire Terrier",
  "Bichon Frise",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function PricePreview({
  basePrice,
  coatAdjustments,
}: {
  basePrice: number;
  coatAdjustments: Record<string, number>;
}) {
  const hasCoatAdj = Object.values(coatAdjustments).some((v) => v !== 0);
  if (!basePrice) return null;
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1 mb-1">
        <Info className="size-3" />
        <span className="font-medium">Live Preview</span>
      </div>
      <p>
        A large dog with a curly coat would be charged:{" "}
        <strong className="text-foreground">
          ${basePrice + (coatAdjustments["curly"] ?? 0)}
        </strong>
        {hasCoatAdj && " (size price + coat adjustment)"}
      </p>
    </div>
  );
}

// ─── Default Add-On rule row (with optional condition builder) ───────────────

const CONDITION_KINDS = [
  { value: "weight-gte", label: "Weight ≥ (lbs)" },
  { value: "weight-lte", label: "Weight ≤ (lbs)" },
  { value: "pet-size-in", label: "Pet size" },
  { value: "coat-type-in", label: "Coat type" },
  { value: "breed-includes", label: "Breed includes" },
] as const;

function DefaultAddOnRuleRow({
  addOnName,
  addOnPrice,
  conditions,
  onConditionsChange,
  onRemove,
}: {
  addOnName: string;
  addOnPrice: number;
  conditions: DefaultAddOnCondition[];
  onConditionsChange: (next: DefaultAddOnCondition[]) => void;
  onRemove: () => void;
}) {
  const [draftKind, setDraftKind] =
    useState<DefaultAddOnCondition["kind"]>("weight-gte");
  const [draftScalar, setDraftScalar] = useState("");
  const [draftValues, setDraftValues] = useState<string[]>([]);

  function addCondition() {
    let next: DefaultAddOnCondition | null = null;
    switch (draftKind) {
      case "weight-gte":
      case "weight-lte": {
        const n = parseFloat(draftScalar);
        if (Number.isNaN(n) || n < 0) {
          toast.error("Enter a positive weight in lbs");
          return;
        }
        next = { kind: draftKind, value: n };
        break;
      }
      case "pet-size-in":
        if (draftValues.length === 0) {
          toast.error("Pick at least one size");
          return;
        }
        next = {
          kind: "pet-size-in",
          values: draftValues as DefaultAddOnCondition extends {
            values: infer V;
          }
            ? V
            : never,
        } as DefaultAddOnCondition;
        break;
      case "coat-type-in":
        if (draftValues.length === 0) {
          toast.error("Pick at least one coat type");
          return;
        }
        next = {
          kind: "coat-type-in",
          values: draftValues as DefaultAddOnCondition extends {
            values: infer V;
          }
            ? V
            : never,
        } as DefaultAddOnCondition;
        break;
      case "breed-includes":
        if (!draftScalar.trim()) {
          toast.error("Enter a breed substring");
          return;
        }
        next = { kind: "breed-includes", value: draftScalar.trim() };
        break;
    }
    if (next) {
      onConditionsChange([...conditions, next]);
      setDraftScalar("");
      setDraftValues([]);
    }
  }

  function removeCondition(idx: number) {
    onConditionsChange(conditions.filter((_, i) => i !== idx));
  }

  const summary = describeAddOnConditions(conditions);
  const PET_SIZE_OPTIONS = ["small", "medium", "large", "giant"];
  const COAT_TYPE_OPTIONS = ["short", "medium", "long", "wire", "curly", "double"];
  const isMultiSelect =
    draftKind === "pet-size-in" || draftKind === "coat-type-in";
  const multiOptions =
    draftKind === "pet-size-in" ? PET_SIZE_OPTIONS : COAT_TYPE_OPTIONS;

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles className="size-3 text-violet-500" />
            {addOnName}
            <span className="text-muted-foreground font-normal">
              · +${addOnPrice}
            </span>
          </p>
          <p
            className={cn(
              "mt-0.5 text-[10px]",
              conditions.length === 0
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300",
            )}
          >
            {conditions.length === 0
              ? "Always attached — every booking gets this add-on"
              : `Only when ${summary}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove default add-on"
          className="text-destructive hover:text-destructive/80 shrink-0 transition-colors"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {conditions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {conditions.map((c, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1 text-[10px]"
            >
              <span>{describeAddOnConditions([c])}</span>
              <button
                type="button"
                onClick={() => removeCondition(i)}
                aria-label="Remove condition"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add-condition row */}
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-muted/20 p-2">
        <Select
          value={draftKind}
          onValueChange={(v) => {
            setDraftKind(v as DefaultAddOnCondition["kind"]);
            setDraftScalar("");
            setDraftValues([]);
          }}
        >
          <SelectTrigger className="h-7 w-40 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value} className="text-xs">
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isMultiSelect ? (
          <div className="flex flex-wrap gap-1">
            {multiOptions.map((opt) => {
              const checked = draftValues.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    setDraftValues((prev) =>
                      checked ? prev.filter((v) => v !== opt) : [...prev, opt],
                    )
                  }
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] capitalize transition-colors",
                    checked
                      ? "border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <Input
            value={draftScalar}
            onChange={(e) => setDraftScalar(e.target.value)}
            placeholder={
              draftKind === "breed-includes"
                ? "e.g. Poodle"
                : "e.g. 30"
            }
            className="h-7 w-28 text-[11px]"
          />
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={addCondition}
        >
          <Plus className="mr-1 size-3" />
          Add condition
        </Button>
      </div>
    </div>
  );
}

// ─── Age-Group pricing rule row ───────────────────────────────────────────────

function AgeGroupRuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: AgeGroupPricingRule;
  onChange: (patch: Partial<AgeGroupPricingRule>) => void;
  onRemove: () => void;
}) {
  function setBound(field: "minMonths" | "maxMonths", raw: string) {
    const n = raw.trim() === "" ? undefined : Math.max(0, Number(raw));
    if (raw.trim() !== "" && Number.isNaN(n)) return;
    onChange({ [field]: n });
  }

  function setMode(mode: AgeGroupAdjustment["mode"]) {
    // Reset the amount when switching mode so we don't keep a percent value
    // around after switching to a flat dollar mode.
    onChange({ adjustment: { mode, amount: 0 } as AgeGroupAdjustment });
  }

  function setAmount(raw: string) {
    const n = raw.trim() === "" ? 0 : Number(raw);
    if (Number.isNaN(n)) return;
    const mode = rule.adjustment.mode;
    if (mode === "percent") {
      onChange({ adjustment: { mode: "percent", amount: n } });
    } else {
      onChange({
        adjustment: { mode, amount: Math.max(0, n) },
      });
    }
  }

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={rule.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Label (e.g. Puppy, Senior)"
            className="h-7 text-xs font-semibold"
          />
          <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">
            {describeAgeGroupRule(rule)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove age-group rule"
          className="text-destructive hover:text-destructive/80 mt-1 shrink-0 transition-colors"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Age range */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Min months
          </Label>
          <Input
            type="number"
            min={0}
            value={rule.minMonths ?? ""}
            onChange={(e) => setBound("minMonths", e.target.value)}
            placeholder="—"
            className="mt-0.5 h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Max months
          </Label>
          <Input
            type="number"
            min={0}
            value={rule.maxMonths ?? ""}
            onChange={(e) => setBound("maxMonths", e.target.value)}
            placeholder="—"
            className="mt-0.5 h-7 text-xs"
          />
        </div>
      </div>

      {/* Adjustment */}
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <Select value={rule.adjustment.mode} onValueChange={setMode}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat-subtract" className="text-xs">
              − Flat discount ($)
            </SelectItem>
            <SelectItem value="flat-add" className="text-xs">
              + Flat surcharge ($)
            </SelectItem>
            <SelectItem value="percent" className="text-xs">
              Percent (signed)
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={rule.adjustment.amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-7 w-20 text-xs"
            step={rule.adjustment.mode === "percent" ? 1 : 0.5}
          />
          <span className="text-[11px] text-muted-foreground">
            {rule.adjustment.mode === "percent" ? "%" : "$"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPackage: GroomingPackage | null;
}

export function ServiceDialog({
  open,
  onOpenChange,
  editingPackage,
}: ServiceDialogProps) {
  const isEditing = !!editingPackage;
  const queryClient = useQueryClient();
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());
  const { data: appointmentsData = [] } = useQuery(
    groomingQueries.appointments(),
  );
  const { data: petPricingData = [] } = useQuery(
    groomingQueries.allPetServicePricing(),
  );
  const activeStylists = useMemo(
    () => stylistsData.filter((s) => s.status === "active"),
    [stylistsData],
  );

  // State for the "apply to upcoming unconfirmed appointments?" prompt that
  // fires after editing an existing service. Set on save; cleared by the
  // prompt's actions.
  const [propagationPrompt, setPropagationPrompt] = useState<{
    updatedPackage: GroomingPackage;
    affected: GroomingAppointment[];
    summary: {
      basePriceChanged: boolean;
      sizePricingChanged: boolean;
      durationChanged: boolean;
      previousBasePrice: number;
      newBasePrice: number;
      previousDurationMin: number;
      newDurationMin: number;
    };
  } | null>(null);

  // ── Form state ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [isActive, setIsActive] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [requiresEval, setRequiresEval] = useState(false);
  const [assignedStylistIds, setAssignedStylistIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  // 0 = no minimum, otherwise hours of advance notice required for online bookings.
  const [minBookingNoticeHours, setMinBookingNoticeHours] = useState<number>(0);
  // 0 = unlimited, otherwise daily cap across all groomers.
  const [maxPerDay, setMaxPerDay] = useState<number>(0);

  // Smart pricing
  const [sizePricing, setSizePricing] = useState({
    small: 0,
    medium: 0,
    large: 0,
    giant: 0,
  });

  // Coat type adjustments (delta from size price)
  const [coatEnabled, setCoatEnabled] = useState(false);
  const [coatAdjustments, setCoatAdjustments] = useState<
    Record<string, number>
  >({
    short: 0,
    medium: 0,
    long: 5,
    wire: 5,
    curly: 10,
    double: 15,
  });

  // Breed overrides
  const [breedEnabled, setBreedEnabled] = useState(false);
  const [breedOverrides, setBreedOverrides] = useState<
    Record<string, number>
  >({});
  const [newBreed, setNewBreed] = useState("");
  const [newBreedPrice, setNewBreedPrice] = useState("");

  // Product usage
  const [productsEnabled, setProductsEnabled] = useState(false);
  const [productUsage, setProductUsage] = useState<ProductUsage[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQty, setSelectedQty] = useState("");

  // Default Add-Ons — rules that auto-attach add-ons during booking creation.
  // Each rule targets one add-on and may carry conditions (pet weight, size,
  // coat type, breed) that restrict the auto-attach to matching pets.
  const [defaultAddOnsEnabled, setDefaultAddOnsEnabled] = useState(false);
  const [defaultAddOnRules, setDefaultAddOnRules] = useState<
    DefaultAddOnRule[]
  >([]);
  const [newRuleAddOnId, setNewRuleAddOnId] = useState("");

  // Age-Group Pricing — the fourth pricing dimension alongside size, breed,
  // and coat. Each rule defines an age range (months) and a price modifier.
  const [ageGroupEnabled, setAgeGroupEnabled] = useState(false);
  const [ageGroupRules, setAgeGroupRules] = useState<AgeGroupPricingRule[]>([]);

  // ── Sync form when editing ──
  useEffect(() => {
    if (!open) return;
    if (editingPackage) {
      setName(editingPackage.name);
      setDescription(editingPackage.description);
      setDuration(editingPackage.duration);
      setIsActive(editingPackage.isActive);
      setIsOnline(true);
      setRequiresEval(editingPackage.requiresEvaluation ?? false);
      setAssignedStylistIds(editingPackage.assignedStylistIds ?? []);
      setImageUrl(editingPackage.imageUrl ?? "");
      setMinBookingNoticeHours(editingPackage.minBookingNoticeHours ?? 0);
      setMaxPerDay(editingPackage.maxPerDay ?? 0);
      setSizePricing({ ...editingPackage.sizePricing });
      const existingCoat = editingPackage.coatAdjustments ?? null;
      setCoatEnabled(!!existingCoat);
      if (existingCoat) {
        setCoatAdjustments({
          short: existingCoat.short ?? 0,
          medium: existingCoat.medium ?? 0,
          long: existingCoat.long ?? 0,
          wire: existingCoat.wire ?? 0,
          curly: existingCoat.curly ?? 0,
          double: existingCoat.double ?? 0,
        });
      }
      const existingBreeds = editingPackage.breedOverrides ?? {};
      setBreedEnabled(Object.keys(existingBreeds).length > 0);
      setBreedOverrides(existingBreeds);
      const existingUsage = editingPackage.productUsage ?? [];
      setProductUsage(existingUsage);
      setProductsEnabled(existingUsage.length > 0);
      const existingDefaults = editingPackage.defaultAddOns ?? [];
      setDefaultAddOnRules(existingDefaults);
      setDefaultAddOnsEnabled(existingDefaults.length > 0);
      const existingAgeRules = editingPackage.ageGroupPricing ?? [];
      setAgeGroupRules(existingAgeRules);
      setAgeGroupEnabled(existingAgeRules.length > 0);
    } else {
      setName("");
      setDescription("");
      setDuration(60);
      setIsActive(true);
      setIsOnline(true);
      setRequiresEval(false);
      setAssignedStylistIds([]);
      setImageUrl("");
      setMinBookingNoticeHours(0);
      setMaxPerDay(0);
      setSizePricing({ small: 0, medium: 0, large: 0, giant: 0 });
      setCoatEnabled(false);
      setBreedEnabled(false);
      setBreedOverrides({});
      setProductUsage([]);
      setProductsEnabled(false);
      setDefaultAddOnRules([]);
      setDefaultAddOnsEnabled(false);
      setAgeGroupRules([]);
      setAgeGroupEnabled(false);
    }
    setNewRuleAddOnId("");
  }, [open, editingPackage]);

  function toggleStylist(id: string) {
    setAssignedStylistIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function addBreedOverride() {
    if (!newBreed.trim() || !newBreedPrice) return;
    setBreedOverrides((prev) => ({
      ...prev,
      [newBreed.trim()]: Number(newBreedPrice),
    }));
    setNewBreed("");
    setNewBreedPrice("");
  }

  function removeBreedOverride(breed: string) {
    setBreedOverrides((prev) => {
      const next = { ...prev };
      delete next[breed];
      return next;
    });
  }

  function addProductUsage() {
    if (!selectedProductId || !selectedQty) return;
    const product = groomingProducts.find((p) => p.id === selectedProductId);
    if (!product) return;
    if (productUsage.some((u) => u.productId === selectedProductId)) {
      toast.error("This product is already added");
      return;
    }
    setProductUsage((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: parseFloat(selectedQty),
        unit: product.measurementUnit as string,
        isOptional: false,
      },
    ]);
    setSelectedProductId("");
    setSelectedQty("");
  }

  function removeProductUsage(productId: string) {
    setProductUsage((prev) => prev.filter((u) => u.productId !== productId));
  }

  function toggleProductOptional(productId: string) {
    setProductUsage((prev) =>
      prev.map((u) =>
        u.productId === productId ? { ...u, isOptional: !u.isOptional } : u,
      ),
    );
  }

  function updateProductQty(productId: string, qty: string) {
    const n = parseFloat(qty);
    if (isNaN(n) || n <= 0) return;
    setProductUsage((prev) =>
      prev.map((u) => (u.productId === productId ? { ...u, quantity: n } : u)),
    );
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (sizePricing.small === 0 && sizePricing.medium === 0) {
      toast.error("Set at least one price");
      return;
    }

    const basePrice =
      sizePricing.medium ||
      sizePricing.small ||
      sizePricing.large ||
      sizePricing.giant;

    const next: GroomingPackage = {
      id: editingPackage?.id ?? `gp-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      basePrice,
      duration,
      sizePricing,
      coatAdjustments: coatEnabled ? coatAdjustments : undefined,
      breedOverrides:
        breedEnabled && Object.keys(breedOverrides).length > 0
          ? breedOverrides
          : undefined,
      includes: editingPackage?.includes ?? [],
      isActive,
      isPopular: editingPackage?.isPopular,
      purchaseCount: editingPackage?.purchaseCount ?? 0,
      createdAt: editingPackage?.createdAt ?? new Date().toISOString(),
      assignedStylistIds:
        assignedStylistIds.length > 0 ? assignedStylistIds : undefined,
      requiresEvaluation: requiresEval || undefined,
      productUsage:
        productsEnabled && productUsage.length > 0 ? productUsage : undefined,
      color: editingPackage?.color,
      imageUrl: imageUrl.trim() || undefined,
      minBookingNoticeHours:
        minBookingNoticeHours > 0 ? minBookingNoticeHours : undefined,
      maxPerDay: maxPerDay > 0 ? maxPerDay : undefined,
      defaultAddOns:
        defaultAddOnsEnabled && defaultAddOnRules.length > 0
          ? defaultAddOnRules
          : undefined,
      ageGroupPricing:
        ageGroupEnabled && ageGroupRules.length > 0
          ? ageGroupRules
          : undefined,
    };

    queryClient.setQueryData<GroomingPackage[]>(
      ["grooming", "packages"],
      (prev = []) =>
        isEditing
          ? prev.map((p) => (p.id === next.id ? next : p))
          : [...prev, next],
    );

    toast.success(isEditing ? `"${name}" updated` : `"${name}" created`);

    // For edits, surface the "apply to upcoming unconfirmed appointments?"
    // prompt when anything that affects price or duration changed. The
    // prompt is a no-op when nothing is affected or the change is purely
    // cosmetic (description, image, stylists assigned, etc.).
    if (isEditing && editingPackage) {
      const prev = editingPackage;
      const sizePricingChanged =
        prev.sizePricing.small !== next.sizePricing.small ||
        prev.sizePricing.medium !== next.sizePricing.medium ||
        prev.sizePricing.large !== next.sizePricing.large ||
        prev.sizePricing.giant !== next.sizePricing.giant;
      const basePriceChanged = prev.basePrice !== next.basePrice;
      const durationChanged = prev.duration !== next.duration;
      const ageOrStylistOrCoatChanged =
        JSON.stringify(prev.ageGroupPricing ?? null) !==
          JSON.stringify(next.ageGroupPricing ?? null) ||
        JSON.stringify(prev.stylistPricing ?? null) !==
          JSON.stringify(next.stylistPricing ?? null) ||
        JSON.stringify(prev.coatAdjustments ?? null) !==
          JSON.stringify(next.coatAdjustments ?? null) ||
        JSON.stringify(prev.breedOverrides ?? null) !==
          JSON.stringify(next.breedOverrides ?? null);

      if (
        basePriceChanged ||
        sizePricingChanged ||
        durationChanged ||
        ageOrStylistOrCoatChanged
      ) {
        const affected = findAffectedUpcomingAppointments(
          next.id,
          appointmentsData,
        );
        if (affected.length > 0) {
          setPropagationPrompt({
            updatedPackage: next,
            affected,
            summary: {
              basePriceChanged,
              sizePricingChanged,
              durationChanged,
              previousBasePrice: prev.basePrice,
              newBasePrice: next.basePrice,
              previousDurationMin: prev.duration,
              newDurationMin: next.duration,
            },
          });
          // Keep ServiceDialog closed and the prompt visible until the user
          // decides. Closing the editor is fine — the package change is
          // already saved either way.
          onOpenChange(false);
          return;
        }
      }
    }

    onOpenChange(false);
  }

  function applyPropagation() {
    if (!propagationPrompt) return;
    const { next, affected } = propagatePackageChangesToUpcoming({
      packageId: propagationPrompt.updatedPackage.id,
      updatedPackage: propagationPrompt.updatedPackage,
      appointments: appointmentsData,
      petPricingOverrides: petPricingData,
    });
    queryClient.setQueryData<GroomingAppointment[]>(
      ["grooming", "appointments"],
      next,
    );
    toast.success(
      `Updated ${affected.length} upcoming appointment${
        affected.length === 1 ? "" : "s"
      } with the new pricing & duration.`,
    );
    setPropagationPrompt(null);
  }

  function skipPropagation() {
    if (!propagationPrompt) return;
    toast.info(
      "Change applies to new bookings only — existing appointments untouched.",
    );
    setPropagationPrompt(null);
  }

  const previewPrice = sizePricing.large;

  function addDefaultAddOnRule() {
    if (!newRuleAddOnId) return;
    if (defaultAddOnRules.some((r) => r.addOnId === newRuleAddOnId)) {
      toast.error("This add-on is already in the default list");
      return;
    }
    setDefaultAddOnRules((prev) => [...prev, { addOnId: newRuleAddOnId }]);
    setNewRuleAddOnId("");
  }

  function removeDefaultAddOnRule(addOnId: string) {
    setDefaultAddOnRules((prev) => prev.filter((r) => r.addOnId !== addOnId));
  }

  function updateRuleConditions(
    addOnId: string,
    next: DefaultAddOnCondition[],
  ) {
    setDefaultAddOnRules((prev) =>
      prev.map((r) =>
        r.addOnId === addOnId
          ? { ...r, conditions: next.length > 0 ? next : undefined }
          : r,
      ),
    );
  }

  function addAgeGroupRule() {
    setAgeGroupRules((prev) => [
      ...prev,
      {
        id: `agp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: prev.length === 0 ? "Puppy" : "New age group",
        maxMonths: prev.length === 0 ? 12 : undefined,
        adjustment: { mode: "flat-subtract", amount: 0 },
      },
    ]);
  }

  function updateAgeGroupRule(
    ruleId: string,
    patch: Partial<AgeGroupPricingRule>,
  ) {
    setAgeGroupRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
    );
  }

  function removeAgeGroupRule(ruleId: string) {
    setAgeGroupRules((prev) => prev.filter((r) => r.id !== ruleId));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="size-4 text-pink-500" />
            {isEditing ? `Edit: ${editingPackage?.name}` : "New Service"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-1">
          {/* ── Basic info ── */}
          <section>
            <SectionLabel>Service Info</SectionLabel>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Full Groom, Bath & Brush"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  placeholder="Shown to clients during online booking…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <ImageIcon className="size-3" />
                  Photo / Icon{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  type="url"
                  placeholder="https://images.example.com/full-groom.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Shown on the online booking page next to the service name.
                </p>
                {imageUrl && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-2 py-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="size-12 rounded-md object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0.2";
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Preview
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium">Available for online booking</p>
                  <p className="text-[10px] text-muted-foreground">
                    Clients can book this service themselves
                  </p>
                </div>
                <Switch checked={isOnline} onCheckedChange={setIsOnline} />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium">Requires evaluation first</p>
                  <p className="text-[10px] text-muted-foreground">
                    Staff must assess pet before confirming
                  </p>
                </div>
                <Switch
                  checked={requiresEval}
                  onCheckedChange={setRequiresEval}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Booking Rules ── */}
          <section>
            <SectionLabel>Booking Rules</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Clock className="size-3" />
                  Minimum Booking Notice
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={minBookingNoticeHours || ""}
                    placeholder="0"
                    onChange={(e) =>
                      setMinBookingNoticeHours(Number(e.target.value) || 0)
                    }
                    className="text-sm"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    hours
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {minBookingNoticeHours > 0
                    ? `Clients can't book online within ${minBookingNoticeHours}h of the appointment. Staff can override manually.`
                    : "No minimum — clients can book up to the start time."}
                </p>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <CalendarDays className="size-3" />
                  Maximum Per Day
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={maxPerDay || ""}
                  placeholder="No limit"
                  onChange={(e) => setMaxPerDay(Number(e.target.value) || 0)}
                  className="mt-1 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {maxPerDay > 0
                    ? `Limit to ${maxPerDay} bookings per day across all groomers.`
                    : "Unlimited bookings per day."}
                </p>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Smart Pricing — three stacked sections (size always visible, coat/breed expandable) ── */}
          <section>
            <SectionLabel>Smart Pricing</SectionLabel>
            <p className="text-xs text-muted-foreground -mt-2 mb-4">
              Set prices for each pet size, then optionally adjust by coat type
              or breed. The system auto-calculates the correct price at booking.
            </p>

            <div className="space-y-3">
              {/* 1. By Pet Size — always visible */}
              <div className="rounded-xl border-2 overflow-hidden">
                <div className="bg-pink-50/60 dark:bg-pink-950/20 px-4 py-2.5 border-b flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">1 · By Pet Size</p>
                    <p className="text-[10px] text-muted-foreground">
                      Required — set a price for each size your facility accepts
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Required
                  </Badge>
                </div>
                <div className="divide-y">
                  {PET_SIZES.map(({ key, label, hint }) => (
                    <div
                      key={key}
                      className="flex items-center gap-4 px-4 py-2.5"
                    >
                      <div className="w-28 flex-shrink-0">
                        <p className="text-xs font-medium">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{hint}</p>
                      </div>
                      <div className="relative flex-1 max-w-[140px]">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                        <Input
                          type="number"
                          min={0}
                          value={sizePricing[key] || ""}
                          placeholder="0"
                          onChange={(e) =>
                            setSizePricing((prev) => ({
                              ...prev,
                              [key]: Number(e.target.value),
                            }))
                          }
                          className="pl-7 h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Adjust by Coat Type — expandable */}
              <Collapsible open={coatEnabled} onOpenChange={setCoatEnabled}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between rounded-xl border-2 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={coatEnabled}
                      className="pointer-events-none"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        2 · Adjust by Coat Type{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Add surcharges for complex coats (long, wire, curly, double)
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      coatEnabled && "rotate-180",
                    )}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-xl border overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2 border-b">
                    <p className="text-xs font-semibold">
                      Coat Surcharge{" "}
                      <span className="text-muted-foreground font-normal">
                        (added on top of size price)
                      </span>
                    </p>
                  </div>
                  <div className="divide-y">
                    {COAT_TYPES.map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex items-center gap-4 px-4 py-2"
                      >
                        <p className="w-20 text-xs font-medium flex-shrink-0">
                          {label}
                        </p>
                        <div className="relative flex-1 max-w-[140px]">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            +$
                          </span>
                          <Input
                            type="number"
                            min={0}
                            value={coatAdjustments[key] ?? 0}
                            onChange={(e) =>
                              setCoatAdjustments((prev) => ({
                                ...prev,
                                [key]: Number(e.target.value),
                              }))
                            }
                            className="pl-8 h-8 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <PricePreview
                  basePrice={previewPrice}
                  coatAdjustments={coatAdjustments}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* 3. Breed-Specific Pricing — expandable */}
            <Collapsible open={breedEnabled} onOpenChange={setBreedEnabled}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between rounded-xl border-2 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={breedEnabled}
                      className="pointer-events-none"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        3 · Breed-Specific Pricing{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Override the size price for specific breeds (e.g., Doodles)
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      breedEnabled && "rotate-180",
                    )}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 rounded-xl border overflow-hidden">
                  {Object.entries(breedOverrides).length > 0 && (
                    <div className="divide-y">
                      {Object.entries(breedOverrides).map(([breed, price]) => (
                        <div
                          key={breed}
                          className="flex items-center justify-between px-4 py-2"
                        >
                          <p className="text-xs font-medium">{breed}</p>
                          <div className="flex items-center gap-3">
                            <p className="text-xs font-semibold">${price}</p>
                            <button
                              onClick={() => removeBreedOverride(breed)}
                              className="text-destructive text-xs hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 p-3 bg-muted/20">
                    <Input
                      placeholder="Breed name"
                      value={newBreed}
                      onChange={(e) => setNewBreed(e.target.value)}
                      className="h-8 text-xs flex-1"
                      list="breed-suggestions"
                    />
                    <datalist id="breed-suggestions">
                      {COMMON_BREEDS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                    <div className="relative w-24 flex-shrink-0">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Price"
                        value={newBreedPrice}
                        onChange={(e) => setNewBreedPrice(e.target.value)}
                        className="pl-6 h-8 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 flex-shrink-0"
                      onClick={addBreedOverride}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            </div>
          </section>

          <Separator />

          {/* ── Staff assignment ── */}
          <section>
            <SectionLabel>Assigned Groomers</SectionLabel>
            <p className="text-xs text-muted-foreground -mt-2 mb-3">
              Leave all unchecked to allow any groomer. Check specific groomers
              to restrict this service.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {activeStylists.map((s) => {
                const assigned = assignedStylistIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleStylist(s.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                      assigned
                        ? "border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-950/20"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <Checkbox
                      checked={assigned}
                      onCheckedChange={() => toggleStylist(s.id)}
                      className="pointer-events-none"
                    />
                    <div>
                      <p className="text-xs font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {s.capacity.skillLevel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* ── Products Used ── */}
          <section>
            <Collapsible open={productsEnabled} onOpenChange={setProductsEnabled}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between rounded-lg border px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <FlaskConical className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">
                        Products & Materials Used{" "}
                        {productUsage.length > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">
                            {productUsage.length}
                          </Badge>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Auto-deducted from inventory when this service completes
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      productsEnabled && "rotate-180",
                    )}
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-3 space-y-3">
                  {/* Current product list */}
                  {productUsage.length > 0 && (
                    <div className="rounded-xl border overflow-hidden">
                      <div className="bg-muted/40 px-4 py-2 border-b">
                        <p className="text-xs font-semibold">Materials per service</p>
                      </div>
                      <div className="divide-y">
                        {productUsage.map((usage) => {
                          const product = groomingProducts.find((p) => p.id === usage.productId);
                          return (
                            <div key={usage.productId} className="flex items-center gap-3 px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{usage.productName}</p>
                                {product && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {product.brand} · {product.measurementUnit}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Input
                                  type="number"
                                  min={0.1}
                                  step={0.1}
                                  value={usage.quantity}
                                  onChange={(e) => updateProductQty(usage.productId, e.target.value)}
                                  className="h-7 w-20 text-xs text-right"
                                />
                                <span className="text-xs text-muted-foreground w-8">
                                  {usage.unit}
                                </span>
                                <div
                                  className="flex items-center gap-1 cursor-pointer"
                                  onClick={() => toggleProductOptional(usage.productId)}
                                >
                                  <Checkbox
                                    checked={usage.isOptional ?? false}
                                    className="pointer-events-none size-3"
                                  />
                                  <span className="text-[10px] text-muted-foreground">optional</span>
                                </div>
                                <button
                                  onClick={() => removeProductUsage(usage.productId)}
                                  className="text-destructive hover:text-destructive/80 transition-colors"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add product row */}
                  <div className="flex gap-2 rounded-xl border bg-muted/20 p-3">
                    <Select
                      value={selectedProductId}
                      onValueChange={setSelectedProductId}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Choose product…" />
                      </SelectTrigger>
                      <SelectContent>
                        {groomingProducts
                          .filter((p) => p.itemType === "consumable" && p.isActive)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-muted-foreground ml-1">
                                ({p.currentStock.toLocaleString()} {p.measurementUnit} in stock)
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      placeholder="Qty"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(e.target.value)}
                      className="h-8 w-20 text-xs"
                    />
                    {selectedProductId && (
                      <span className="self-center text-xs text-muted-foreground w-8 shrink-0">
                        {groomingProducts.find((p) => p.id === selectedProductId)?.measurementUnit ?? ""}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 shrink-0"
                      onClick={addProductUsage}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  {productUsage.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      When a groomer marks this service complete, the system deducts the above quantities automatically.
                      Mark a product as <em>optional</em> to deduct it only when actually used.
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <Separator />

          {/* ── Default Add-Ons (auto-attach during booking) ── */}
          <section>
            <Collapsible
              open={defaultAddOnsEnabled}
              onOpenChange={setDefaultAddOnsEnabled}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Wand2 className="size-4 text-violet-500" />
                    <div className="text-left">
                      <p className="text-xs font-semibold">Default Add-Ons</p>
                      <p className="text-[10px] text-muted-foreground">
                        Auto-attach add-ons when this service is booked — with
                        optional conditions per add-on
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {defaultAddOnRules.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {defaultAddOnRules.length} rule
                        {defaultAddOnRules.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        defaultAddOnsEnabled && "rotate-180",
                      )}
                    />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-2.5">
                  {defaultAddOnRules.length === 0 && (
                    <p className="rounded-md border border-dashed bg-muted/10 px-3 py-3 text-center text-[11px] text-muted-foreground">
                      No default add-ons yet. Add one below — leave it
                      unconditional to always attach, or add conditions to
                      restrict it to matching pets (e.g. weight ≥ 30 lbs).
                    </p>
                  )}

                  {defaultAddOnRules.map((rule) => {
                    const ao = GROOMING_ADD_ONS.find(
                      (a) => a.id === rule.addOnId,
                    );
                    return (
                      <DefaultAddOnRuleRow
                        key={rule.addOnId}
                        addOnName={ao?.name ?? rule.addOnId}
                        addOnPrice={ao?.price ?? 0}
                        conditions={rule.conditions ?? []}
                        onConditionsChange={(next) =>
                          updateRuleConditions(rule.addOnId, next)
                        }
                        onRemove={() => removeDefaultAddOnRule(rule.addOnId)}
                      />
                    );
                  })}

                  {/* Add rule row */}
                  <div className="flex gap-2 rounded-xl border bg-muted/20 p-3">
                    <Select
                      value={newRuleAddOnId}
                      onValueChange={setNewRuleAddOnId}
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue placeholder="Choose an add-on…" />
                      </SelectTrigger>
                      <SelectContent>
                        {GROOMING_ADD_ONS.filter(
                          (a) =>
                            !defaultAddOnRules.some((r) => r.addOnId === a.id),
                        ).map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            <span className="font-medium">{a.name}</span>
                            <span className="ml-1 text-muted-foreground">
                              · +${a.price}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 px-3"
                      onClick={addDefaultAddOnRule}
                      disabled={!newRuleAddOnId}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    When a groomer creates a booking with this service, the
                    matching add-ons auto-attach. Groomers can still uncheck
                    them if the client declines.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <Separator />

          {/* ── Age-Group Pricing (4th pricing dimension) ── */}
          <section>
            <Collapsible
              open={ageGroupEnabled}
              onOpenChange={setAgeGroupEnabled}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="size-4 text-emerald-500" />
                    <div className="text-left">
                      <p className="text-xs font-semibold">
                        Age-Group Pricing
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Different prices for puppies and seniors — applied on
                        top of size pricing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ageGroupRules.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {ageGroupRules.length} rule
                        {ageGroupRules.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        ageGroupEnabled && "rotate-180",
                      )}
                    />
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-2.5">
                  {ageGroupRules.length === 0 && (
                    <p className="rounded-md border border-dashed bg-muted/10 px-3 py-3 text-center text-[11px] text-muted-foreground">
                      No age-group rules yet. Add one below — Puppy (under 12
                      months) typically gets a discount, Senior (96+ months /
                      8+ years) typically gets a premium.
                    </p>
                  )}

                  {ageGroupRules.map((rule) => (
                    <AgeGroupRuleRow
                      key={rule.id}
                      rule={rule}
                      onChange={(patch) => updateAgeGroupRule(rule.id, patch)}
                      onRemove={() => removeAgeGroupRule(rule.id)}
                    />
                  ))}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-full text-xs"
                    onClick={addAgeGroupRule}
                  >
                    <Plus className="mr-1.5 size-3" />
                    Add age group
                  </Button>

                  <p className="text-[11px] text-muted-foreground">
                    Rules apply to the size-default tier. Pet-specific and
                    stylist-specific overrides bypass age adjustments. Order
                    matters — the first matching range wins.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* ── Active toggle ── */}
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Service is active</p>
              <p className="text-xs text-muted-foreground">
                Inactive services are hidden from booking
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? "Save Changes" : "Create Service"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Propagation prompt — fires after editing an existing service when
          price or duration changed AND there are upcoming unconfirmed
          appointments using this service. */}
      <Dialog
        open={!!propagationPrompt}
        onOpenChange={(o) => {
          if (!o) setPropagationPrompt(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Apply to upcoming appointments?
            </DialogTitle>
          </DialogHeader>
          {propagationPrompt && (
            <div className="space-y-3 py-1 text-sm">
              <p>
                <strong>
                  {propagationPrompt.affected.length} upcoming unconfirmed
                  appointment
                  {propagationPrompt.affected.length === 1 ? "" : "s"}
                </strong>{" "}
                use this service. Do you want to apply the updated price and
                duration to{" "}
                {propagationPrompt.affected.length === 1
                  ? "this booking"
                  : "all of them"}
                ?
              </p>

              {/* Diff summary */}
              <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                {propagationPrompt.summary.basePriceChanged && (
                  <p>
                    <span className="font-medium">Base price:</span>{" "}
                    <span className="text-muted-foreground line-through">
                      ${propagationPrompt.summary.previousBasePrice}
                    </span>{" "}
                    →{" "}
                    <span className="font-semibold text-sky-700 dark:text-sky-300">
                      ${propagationPrompt.summary.newBasePrice}
                    </span>
                  </p>
                )}
                {propagationPrompt.summary.sizePricingChanged && (
                  <p>
                    <span className="font-medium">Size pricing:</span>{" "}
                    one or more size brackets changed
                  </p>
                )}
                {propagationPrompt.summary.durationChanged && (
                  <p>
                    <span className="font-medium">Duration:</span>{" "}
                    <span className="text-muted-foreground line-through">
                      {propagationPrompt.summary.previousDurationMin} min
                    </span>{" "}
                    →{" "}
                    <span className="font-semibold text-sky-700 dark:text-sky-300">
                      {propagationPrompt.summary.newDurationMin} min
                    </span>
                  </p>
                )}
              </div>

              {/* Preview list — capped so very large pushes don't blow the
                  modal. Pet-custom and stylist-specific overrides are
                  preserved by the propagator. */}
              {propagationPrompt.affected.length > 0 && (
                <details className="rounded-md border bg-card px-3 py-2 text-xs">
                  <summary className="cursor-pointer font-medium">
                    Show affected appointments (
                    {propagationPrompt.affected.length})
                  </summary>
                  <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
                    {propagationPrompt.affected
                      .sort((a, b) =>
                        `${a.date} ${a.startTime}`.localeCompare(
                          `${b.date} ${b.startTime}`,
                        ),
                      )
                      .slice(0, 50)
                      .map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            {a.date} {a.startTime}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {a.petName}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {a.stylistName}
                          </span>
                        </li>
                      ))}
                    {propagationPrompt.affected.length > 50 && (
                      <li className="text-[10px] text-muted-foreground italic">
                        + {propagationPrompt.affected.length - 50} more
                      </li>
                    )}
                  </ul>
                </details>
              )}

              <p className="text-[11px] text-muted-foreground">
                Only <strong>scheduled</strong> appointments dated today or
                later are affected. Checked-in, completed, cancelled, and
                no-show bookings are left untouched. Pet-specific and
                stylist-specific price overrides survive — only the size /
                age / coat tier is re-derived from the new service config.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={skipPropagation}>
              No, new bookings only
            </Button>
            <Button
              onClick={applyPropagation}
              className="bg-sky-600 text-white hover:bg-sky-700"
            >
              Apply to {propagationPrompt?.affected.length ?? 0} appointment
              {propagationPrompt?.affected.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
