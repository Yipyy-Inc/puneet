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
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  DollarSign,
  Plus,
  Scissors,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type { GroomingPackage } from "@/types/grooming";

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
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());
  const activeStylists = useMemo(
    () => stylistsData.filter((s) => s.status === "active"),
    [stylistsData],
  );

  // ── Form state ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [isActive, setIsActive] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [requiresEval, setRequiresEval] = useState(false);
  const [assignedStylistIds, setAssignedStylistIds] = useState<string[]>([]);

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
      setSizePricing({ ...editingPackage.sizePricing });
      setCoatEnabled(false);
      setBreedEnabled(false);
      setBreedOverrides({});
    } else {
      setName("");
      setDescription("");
      setDuration(60);
      setIsActive(true);
      setIsOnline(true);
      setRequiresEval(false);
      setAssignedStylistIds([]);
      setSizePricing({ small: 0, medium: 0, large: 0, giant: 0 });
      setCoatEnabled(false);
      setBreedEnabled(false);
      setBreedOverrides({});
    }
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

  function handleSave() {
    if (!name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (sizePricing.small === 0 && sizePricing.medium === 0) {
      toast.error("Set at least one price");
      return;
    }
    toast.success(
      isEditing ? `"${name}" updated` : `"${name}" created`,
    );
    onOpenChange(false);
  }

  const previewPrice = sizePricing.large;

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

          {/* ── Smart Pricing — all three adjustment types in one place ── */}
          <section>
            <div className="flex items-start justify-between mb-3">
              <div>
                <SectionLabel>Smart Pricing</SectionLabel>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300 border-0"
              >
                Size · Breed · Coat
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground -mt-2 mb-4">
              Set prices for each pet size, then optionally adjust by breed or
              coat type. The system auto-calculates the correct price at booking.
            </p>

            {/* Size pricing table */}
            <div className="rounded-xl border overflow-hidden mb-4">
              <div className="bg-muted/40 px-4 py-2 border-b">
                <p className="text-xs font-semibold">By Pet Size</p>
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

            {/* Coat type adjustments */}
            <Collapsible open={coatEnabled} onOpenChange={setCoatEnabled}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between rounded-lg border px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors mb-3">
                  <div>
                    <p className="text-xs font-medium">
                      Adjust by Coat Type{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Add surcharges for complex coats
                    </p>
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
                <div className="rounded-xl border overflow-hidden mb-3">
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

            {/* Breed overrides */}
            <Collapsible open={breedEnabled} onOpenChange={setBreedEnabled}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between rounded-lg border px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-xs font-medium">
                      Breed-Specific Pricing{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Override price for specific breeds
                    </p>
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
    </Dialog>
  );
}
