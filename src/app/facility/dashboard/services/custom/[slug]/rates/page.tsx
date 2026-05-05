"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomServices } from "@/hooks/use-custom-services";
import type {
  CustomServiceVariant,
  ServiceAddOn,
} from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";
import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";
import {
  DollarSign,
  Clock,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Star,
  Package,
} from "lucide-react";
import { toast } from "sonner";

function loadCustomAddOns(slug: string): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const raw = localStorage.getItem("settings-service-addons");
    const all = raw ? (JSON.parse(raw) as ServiceAddOn[]) : defaultServiceAddOns;
    return all.filter((a) => a.applicableServices.includes(slug));
  } catch {
    return defaultServiceAddOns.filter((a) => a.applicableServices.includes(slug));
  }
}

interface VariantFormState {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  isPopular: boolean;
}

const EMPTY_VARIANT: VariantFormState = {
  name: "",
  description: "",
  durationMinutes: 60,
  price: 0,
  isActive: true,
  isPopular: false,
};

function VariantDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CustomServiceVariant | null;
  onSave: (form: VariantFormState, editing: CustomServiceVariant | null) => void;
}) {
  const [form, setForm] = useState<VariantFormState>(() =>
    editing
      ? {
          name: editing.name,
          description: editing.description ?? "",
          durationMinutes: editing.durationMinutes,
          price: editing.price,
          isActive: editing.isActive,
          isPopular: editing.isPopular ?? false,
        }
      : EMPTY_VARIANT,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Variant" : "New Variant"}</DialogTitle>
          <DialogDescription>
            Variants are the bookable options of this service (e.g. half-day,
            full-day, express, deluxe).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Half Day, Full Day, Express Wash"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Shown to customers when they book."
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min={0}
                step={5}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    durationMinutes: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-muted-foreground text-xs">
                Inactive variants are hidden from booking.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Highlight as popular</p>
              <p className="text-muted-foreground text-xs">
                Adds a Popular badge in booking flows.
              </p>
            </div>
            <Switch
              checked={form.isPopular}
              onCheckedChange={(v) => setForm({ ...form, isPopular: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 size-4" /> Cancel
          </Button>
          <Button
            disabled={!form.name.trim()}
            onClick={() => onSave(form, editing)}
          >
            <Save className="mr-2 size-4" />
            {editing ? "Save Changes" : "Create Variant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomServiceRatesPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug, updateModule } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");

  const variants = useMemo<CustomServiceVariant[]>(
    () => serviceModule?.pricing.variants ?? [],
    [serviceModule],
  );

  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] =
    useState<CustomServiceVariant | null>(null);
  const [deletingVariant, setDeletingVariant] =
    useState<CustomServiceVariant | null>(null);

  const [customAddOns, setCustomAddOns] = useState<ServiceAddOn[]>([]);

  useEffect(() => {
    if (!slug) return;
    const sync = () => setCustomAddOns(loadCustomAddOns(slug));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [slug]);

  if (!serviceModule) return null;

  const activeVariants = variants.filter((v) => v.isActive).length;
  const activeAddOns = customAddOns.filter((a) => a.isActive).length;
  const minPrice = variants.length
    ? Math.min(...variants.map((v) => v.price))
    : serviceModule.pricing.basePrice;
  const maxPrice = variants.length
    ? Math.max(...variants.map((v) => v.price))
    : serviceModule.pricing.basePrice;

  function persistVariants(next: CustomServiceVariant[]) {
    updateModule(serviceModule!.id, {
      pricing: { ...serviceModule!.pricing, variants: next },
    });
  }

  function handleVariantSave(
    form: VariantFormState,
    editing: CustomServiceVariant | null,
  ) {
    const next: CustomServiceVariant = {
      id: editing?.id ?? `var-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      durationMinutes: form.durationMinutes,
      price: form.price,
      isActive: form.isActive,
      isPopular: form.isPopular || undefined,
    };
    persistVariants(
      editing
        ? variants.map((v) => (v.id === editing.id ? next : v))
        : [...variants, next],
    );
    toast.success(editing ? `"${next.name}" updated` : `"${next.name}" created`);
    setVariantDialogOpen(false);
    setEditingVariant(null);
  }
  function handleVariantDelete() {
    if (!deletingVariant) return;
    persistVariants(variants.filter((v) => v.id !== deletingVariant.id));
    toast.success(`"${deletingVariant.name}" deleted`);
    setDeletingVariant(null);
  }
  function toggleVariant(id: string) {
    persistVariants(
      variants.map((v) => (v.id === id ? { ...v, isActive: !v.isActive } : v)),
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            {serviceModule.name} — Rates
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Create the bookable variants of this service and the add-ons
            customers can attach to them.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-50">
                <Package className="size-5 text-sky-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Variants
                </p>
                <p className="mt-0.5 text-2xl font-bold">{activeVariants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                <DollarSign className="size-5 text-slate-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Price Range
                </p>
                <p className="mt-0.5 text-2xl font-bold">
                  {minPrice === maxPrice
                    ? `$${minPrice}`
                    : `$${minPrice}–$${maxPrice}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50">
                <Sparkles className="size-5 text-violet-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Add-ons
                </p>
                <p className="mt-0.5 text-2xl font-bold">{activeAddOns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="variants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="variants">
            Services
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {variants.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="addons">
            Add-ons
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {customAddOns.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Variants tab ── */}
        <TabsContent value="variants" className="mt-0 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Each variant is a separately bookable option (e.g. Half Day, Full
              Day, Express, Deluxe).
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingVariant(null);
                setVariantDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 size-4" />
              New Variant
            </Button>
          </div>
          {variants.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
              <Package className="text-muted-foreground/50 size-8" />
              <div className="text-center">
                <p className="text-sm font-medium">No variants yet</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Create the first bookable option for {serviceModule.name}.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingVariant(null);
                  setVariantDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" />
                Add Variant
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {variants.map((v) => (
                    <div
                      key={v.id}
                      className="hover:bg-muted/30 flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{v.name}</p>
                          {v.isPopular && (
                            <Badge className="border-0 bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Star className="mr-1 size-2.5" />
                              Popular
                            </Badge>
                          )}
                          {!v.isActive && (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {v.description && (
                          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                            {v.description}
                          </p>
                        )}
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {v.durationMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="size-3" />
                            {v.price}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Switch
                          checked={v.isActive}
                          onCheckedChange={() => toggleVariant(v.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            setEditingVariant(v);
                            setVariantDialogOpen(true);
                          }}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive size-8"
                          onClick={() => setDeletingVariant(v)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Add-ons tab ── */}
        <TabsContent value="addons" className="mt-0 space-y-4">
          {slug && <AddOnsManager serviceFilter={slug} />}
        </TabsContent>
      </Tabs>

      {/* Variant editor */}
      <VariantDialog
        key={editingVariant?.id ?? "new-variant"}
        open={variantDialogOpen}
        onOpenChange={(v) => {
          setVariantDialogOpen(v);
          if (!v) setEditingVariant(null);
        }}
        editing={editingVariant}
        onSave={handleVariantSave}
      />

      {/* Variant delete confirmation */}
      <Dialog
        open={!!deletingVariant}
        onOpenChange={(open) => !open && setDeletingVariant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Variant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingVariant?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingVariant(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVariantDelete}>
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
