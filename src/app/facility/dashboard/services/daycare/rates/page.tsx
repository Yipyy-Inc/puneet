"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Clock, Edit, Trash2, Plus, Save, X, Sparkles, Gift, Check, Home } from "lucide-react";
import { daycareRates, DaycareRate, daycareAddOns, DaycareAddOn } from "@/data/daycare";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import type { ServiceAddOn } from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";
import { useDaycareAreas } from "@/hooks/use-daycare-areas";
import { cn } from "@/lib/utils";

function loadServiceAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const raw = localStorage.getItem("settings-service-addons");
    return raw ? (JSON.parse(raw) as ServiceAddOn[]) : defaultServiceAddOns;
  } catch {
    return defaultServiceAddOns;
  }
}

const EMPTY_RATE = {
  name: "",
  type: "hourly" as "hourly" | "half-day" | "full-day",
  basePrice: 0,
  description: "",
  durationHours: 1,
  isActive: true,
  color: "#0284c7",
  sizePricing: { small: 0, medium: 0, large: 0, giant: 0 },
  includedAddOnIds: [] as string[],
  allowedSectionIds: [] as string[],
};

const EMPTY_ADDON = {
  name: "",
  description: "",
  price: 0,
  duration: 0,
  isActive: true,
};

export default function DaycareRatesPage() {
  const [rates, setRates] = useState<DaycareRate[]>(daycareRates);
  const [addons, setAddons] = useState<DaycareAddOn[]>(daycareAddOns);
  const [serviceAddOns, setServiceAddOns] = useState<ServiceAddOn[]>([]);
  const { areas, sections } = useDaycareAreas();
  const activeSections = sections.filter((s) => s.isActive);

  useEffect(() => {
    setServiceAddOns(loadServiceAddOns().filter((a) => a.isActive && a.applicableServices.includes("daycare")));
  }, []);

  // Rate modal state
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<DaycareRate | null>(null);
  const [rateForm, setRateForm] = useState(EMPTY_RATE);

  // Rate delete state
  const [deletingRate, setDeletingRate] = useState<DaycareRate | null>(null);

  // Add-on modal state
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<DaycareAddOn | null>(null);
  const [addonForm, setAddonForm] = useState(EMPTY_ADDON);

  // Add-on delete state
  const [deletingAddon, setDeletingAddon] = useState<DaycareAddOn | null>(null);

  // ── Rate handlers ──────────────────────────────────────────────────────────
  const handleAddRate = () => {
    setEditingRate(null);
    setRateForm(EMPTY_RATE);
    setIsRateModalOpen(true);
  };

  const handleEditRate = (rate: DaycareRate) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      type: rate.type,
      basePrice: rate.basePrice,
      description: rate.description,
      durationHours: rate.durationHours,
      isActive: rate.isActive,
      color: rate.color ?? "#0284c7",
      sizePricing: { ...rate.sizePricing },
      includedAddOnIds: rate.includedAddOnIds ?? [],
      allowedSectionIds: rate.allowedSectionIds ?? [],
    });
    setIsRateModalOpen(true);
  };

  const handleSaveRate = () => {
    if (editingRate) {
      setRates(rates.map((r) => (r.id === editingRate.id ? { ...r, ...rateForm } : r)));
    } else {
      setRates([...rates, { id: `rate-${Date.now()}`, ...rateForm }]);
    }
    setIsRateModalOpen(false);
  };

  const handleDeleteRate = () => {
    if (deletingRate) setRates(rates.filter((r) => r.id !== deletingRate.id));
    setDeletingRate(null);
  };

  const handleToggleRate = (rateId: string) => {
    setRates(rates.map((r) => (r.id === rateId ? { ...r, isActive: !r.isActive } : r)));
  };

  // ── Add-on handlers ────────────────────────────────────────────────────────
  const handleAddAddon = () => {
    setEditingAddon(null);
    setAddonForm(EMPTY_ADDON);
    setIsAddonModalOpen(true);
  };

  const handleEditAddon = (addon: DaycareAddOn) => {
    setEditingAddon(addon);
    setAddonForm({
      name: addon.name,
      description: addon.description,
      price: addon.price,
      duration: addon.duration,
      isActive: addon.isActive,
    });
    setIsAddonModalOpen(true);
  };

  const handleSaveAddon = () => {
    if (editingAddon) {
      setAddons(addons.map((a) => (a.id === editingAddon.id ? { ...a, ...addonForm } : a)));
    } else {
      setAddons([...addons, { id: `dc-ao-${Date.now()}`, ...addonForm }]);
    }
    setIsAddonModalOpen(false);
  };

  const handleDeleteAddon = () => {
    if (deletingAddon) setAddons(addons.filter((a) => a.id !== deletingAddon.id));
    setDeletingAddon(null);
  };

  const handleToggleAddon = (addonId: string) => {
    setAddons(addons.map((a) => (a.id === addonId ? { ...a, isActive: !a.isActive } : a)));
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const rateColumns: ColumnDef<DaycareRate>[] = [
    {
      key: "name",
      label: "Service Name",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: item.color ?? "#0284c7" }}
          />
          <span className="font-medium">{item.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={
            item.type === "full-day" ? "default" : item.type === "half-day" ? "secondary" : "outline"
          }
        >
          {item.type.replace("-", " ")}
        </Badge>
      ),
    },
    {
      key: "basePrice",
      label: "Base Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => <span className="font-semibold">${item.basePrice}</span>,
    },
    {
      key: "durationHours",
      label: "Duration",
      icon: Clock,
      defaultVisible: true,
      render: (item) => (
        <span>{item.durationHours} {item.durationHours === 1 ? "hour" : "hours"}</span>
      ),
    },
    {
      key: "sizePricing",
      label: "Size Pricing",
      defaultVisible: true,
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">S: ${item.sizePricing.small}</Badge>
          <Badge variant="outline" className="text-xs">M: ${item.sizePricing.medium}</Badge>
          <Badge variant="outline" className="text-xs">L: ${item.sizePricing.large}</Badge>
          <Badge variant="outline" className="text-xs">XL: ${item.sizePricing.giant}</Badge>
        </div>
      ),
    },
    {
      key: "includedAddOns",
      label: "Free Add-Ons",
      icon: Gift,
      defaultVisible: true,
      render: (item) => {
        const ids = item.includedAddOnIds ?? [];
        if (ids.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {ids.map((id: string) => {
              const addon = serviceAddOns.find((a) => a.id === id);
              return addon ? (
                <Badge key={id} variant="secondary" className="gap-1 text-xs">
                  <Gift className="size-2.5 text-emerald-600" />
                  {addon.name}
                </Badge>
              ) : null;
            })}
          </div>
        );
      },
    },
    {
      key: "allowedSections",
      label: "Rooms",
      icon: Home,
      defaultVisible: true,
      render: (item) => {
        const ids = item.allowedSectionIds ?? [];
        if (ids.length === 0)
          return <span className="text-muted-foreground text-xs">All rooms</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {ids.map((id: string) => {
              const sec = sections.find((s) => s.id === id);
              return sec ? (
                <Badge key={id} variant="outline" className="gap-1 text-xs">
                  <Home className="size-2.5" />
                  {sec.name}
                </Badge>
              ) : null;
            })}
          </div>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Switch checked={item.isActive} onCheckedChange={() => handleToggleRate(item.id)} />
      ),
    },
  ];

  const addonColumns: ColumnDef<DaycareAddOn>[] = [
    {
      key: "name",
      label: "Add-on Name",
      icon: Sparkles,
      defaultVisible: true,
      render: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "description",
      label: "Description",
      defaultVisible: true,
      render: (item) => (
        <span className="text-muted-foreground max-w-[260px] truncate text-sm">{item.description}</span>
      ),
    },
    {
      key: "price",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => <span className="font-semibold">+${item.price}</span>,
    },
    {
      key: "duration",
      label: "Duration",
      icon: Clock,
      defaultVisible: true,
      render: (item) => (
        <Badge variant="outline" className="text-xs">
          {item.duration > 0 ? `${item.duration} min` : "—"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Switch checked={item.isActive} onCheckedChange={() => handleToggleAddon(item.id)} />
      ),
    },
  ];

  const activeRates = rates.filter((r) => r.isActive).length;
  const avgPrice = rates.length > 0
    ? Math.round(rates.reduce((acc, r) => acc + r.basePrice, 0) / rates.length)
    : 0;
  const activeAddons = addons.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Daycare Rates & Pricing
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage daycare services and add-ons. Discounts, surcharges, and other pricing rules are configured in Settings.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                <DollarSign className="size-5 text-slate-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Total Services</p>
                <p className="mt-0.5 text-2xl font-bold">{rates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50">
                <Clock className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Active Services</p>
                <p className="mt-0.5 text-2xl font-bold">{activeRates}</p>
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
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Active Add-ons</p>
                <p className="mt-0.5 text-2xl font-bold">{activeAddons}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Cards Preview */}
      <div className="grid gap-4 md:grid-cols-3">
        {rates.filter((r) => r.isActive).map((rate) => (
          <Card key={rate.id} className="relative overflow-hidden transition-shadow hover:shadow-md">
            <div className="absolute top-0 right-0 left-0 h-1" style={{ backgroundColor: rate.color ?? "#0284c7" }} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{rate.name}</CardTitle>
                <Badge variant={rate.type === "full-day" ? "default" : rate.type === "half-day" ? "secondary" : "outline"}>
                  {rate.type.replace("-", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${rate.basePrice}</span>
                  <span className="text-muted-foreground">/ {rate.durationHours}h</span>
                </div>
                <p className="text-muted-foreground text-sm">{rate.description}</p>
                <div className="border-t pt-2">
                  <p className="text-muted-foreground mb-2 text-xs">Size-based pricing:</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {(["small", "medium", "large", "giant"] as const).map((size) => (
                      <div key={size} className="bg-muted/50 rounded-sm p-2">
                        <p className="text-muted-foreground text-xs capitalize">{size === "giant" ? "Giant" : size.charAt(0).toUpperCase() + size.slice(1)}</p>
                        <p className="font-semibold">${rate.sizePricing[size]}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {rate.includedAddOnIds && rate.includedAddOnIds.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-xs">
                      <Gift className="size-3" /> Included free:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {rate.includedAddOnIds.map((id) => {
                        const addon = serviceAddOns.find((a) => a.id === id);
                        return addon ? (
                          <Badge key={id} variant="secondary" className="gap-1 text-xs">
                            <Gift className="size-2.5 text-emerald-600" />
                            {addon.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <div className="border-t pt-2">
                  <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-xs">
                    <Home className="size-3" /> Rooms:
                  </p>
                  {(!rate.allowedSectionIds || rate.allowedSectionIds.length === 0) ? (
                    <span className="text-muted-foreground text-xs">All rooms</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {rate.allowedSectionIds.map((id) => {
                        const sec = sections.find((s) => s.id === id);
                        return sec ? (
                          <Badge key={id} variant="outline" className="gap-1 text-xs">
                            <Home className="size-2.5" />
                            {sec.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="bg-slate-100 border">
          <TabsTrigger value="services">Services ({rates.length})</TabsTrigger>
          <TabsTrigger value="addons">Add-ons ({addons.length})</TabsTrigger>
        </TabsList>

        {/* ── Services Tab ── */}
        <TabsContent value="services" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Services</CardTitle>
                <Button onClick={handleAddRate}>
                  <Plus className="mr-2 size-4" />
                  Add Service
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={rates}
                columns={rateColumns}
                searchKey="name"
                searchPlaceholder="Search services..."
                actions={(item) => (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditRate(item)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingRate(item)}>
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Add-ons Tab ── */}
        <TabsContent value="addons" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daycare Add-ons</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Optional extras customers can add to any daycare booking.
                  </p>
                </div>
                <Button onClick={handleAddAddon}>
                  <Plus className="mr-2 size-4" />
                  Add Add-on
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={addons}
                columns={addonColumns}
                searchKey="name"
                searchPlaceholder="Search add-ons..."
                actions={(item) => (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditAddon(item)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingAddon(item)}>
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pricing rules link */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold">Pricing Rules</p>
            <p className="text-muted-foreground text-xs">
              Multi-pet discounts, late fees, surcharges, and custom fees are now managed in Settings.
            </p>
          </div>
          <a href="/facility/dashboard/settings?section=pricing-rules" className="text-primary text-sm font-medium hover:underline">
            Go to Pricing Rules →
          </a>
        </CardContent>
      </Card>

      {/* ── Rate Add/Edit Modal ── */}
      <Dialog open={isRateModalOpen} onOpenChange={setIsRateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-1">
            <div className="space-y-4 pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input
                    value={rateForm.name}
                    onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                    placeholder="e.g., Full Day Daycare"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                    value={rateForm.type}
                    onChange={(e) => setRateForm({ ...rateForm, type: e.target.value as typeof rateForm.type })}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="half-day">Half-Day</option>
                    <option value="full-day">Full-Day</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Price ($)</Label>
                  <Input
                    type="number"
                    value={rateForm.basePrice}
                    onChange={(e) => setRateForm({ ...rateForm, basePrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (hours)</Label>
                  <Input
                    type="number"
                    value={rateForm.durationHours}
                    onChange={(e) => setRateForm({ ...rateForm, durationHours: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={rateForm.description}
                  onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                  placeholder="Describe what's included..."
                  rows={2}
                />
              </div>
              <RateColorPicker
                value={rateForm.color}
                onChange={(hex) => setRateForm({ ...rateForm, color: hex })}
              />

              {/* ── Included Add-Ons ── */}
              <div className="space-y-2">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Gift className="size-3.5 text-emerald-600" />
                    Included Add-Ons (free)
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    These add-ons are bundled into this rate at no extra charge, even if they have a price in your add-ons catalog.
                  </p>
                </div>
                {serviceAddOns.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
                    No active daycare add-ons found.{" "}
                    <a href="/facility/dashboard/services/daycare/add-ons" className="text-primary underline underline-offset-2">
                      Create add-ons first
                    </a>
                  </p>
                ) : (
                  <div className="rounded-lg border">
                    {serviceAddOns.map((addon, i) => {
                      const selected = rateForm.includedAddOnIds.includes(addon.id);
                      const priceLabel = (() => {
                        switch (addon.pricingType) {
                          case "flat": return `$${addon.price}`;
                          case "per_day": return `$${addon.price}/day`;
                          case "per_session": return `$${addon.price}/${addon.unitLabel ?? "session"}`;
                          case "per_hour": return `$${addon.price}/${addon.unitLabel ?? "hr"}`;
                          case "per_item": return `$${addon.price}/${addon.unitLabel ?? "item"}`;
                          case "percentage_of_booking": return `${addon.price}% of booking`;
                        }
                      })();
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? rateForm.includedAddOnIds.filter((id) => id !== addon.id)
                              : [...rateForm.includedAddOnIds, addon.id];
                            setRateForm({ ...rateForm, includedAddOnIds: next });
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${i > 0 ? "border-t" : ""} ${selected ? "bg-emerald-50/60" : ""}`}
                        >
                          <div className={`flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${selected ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground/30"}`}>
                            {selected && <Check className="size-3 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-none">{addon.name}</p>
                            {addon.description && (
                              <p className="text-muted-foreground mt-0.5 truncate text-xs">{addon.description}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Badge variant="outline" className="text-xs line-through opacity-60">
                              {priceLabel}
                            </Badge>
                            <Badge className="gap-1 bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                              <Gift className="size-2.5" /> Free
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {rateForm.includedAddOnIds.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {rateForm.includedAddOnIds.length} add-on{rateForm.includedAddOnIds.length > 1 ? "s" : ""} included free with this rate
                  </p>
                )}
              </div>

              {/* ── Room / Section Attachment ── */}
              <div className="space-y-2">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Home className="size-3.5 text-blue-600" />
                    Attached Rooms
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Select which play area rooms this rate applies to. Leave all unselected to make it available in every room.
                  </p>
                </div>
                {activeSections.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
                    No active rooms found.{" "}
                    <a href="/facility/dashboard/services/daycare/rooms" className="text-primary underline underline-offset-2">
                      Create rooms first
                    </a>
                  </p>
                ) : (
                  <div className="rounded-lg border">
                    {areas.filter((a) => a.isActive).map((area, areaIdx) => {
                      const areaSections = activeSections.filter((s) => s.playAreaId === area.id);
                      if (areaSections.length === 0) return null;
                      return (
                        <div key={area.id} className={cn(areaIdx > 0 && "border-t")}>
                          {/* Area header */}
                          <div className="bg-muted/30 flex items-center justify-between px-3 py-2">
                            <span className="text-xs font-semibold text-slate-700">{area.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const sectionIds = areaSections.map((s) => s.id);
                                const allSelected = sectionIds.every((id) => rateForm.allowedSectionIds.includes(id));
                                const next = allSelected
                                  ? rateForm.allowedSectionIds.filter((id) => !sectionIds.includes(id))
                                  : [...new Set([...rateForm.allowedSectionIds, ...sectionIds])];
                                setRateForm({ ...rateForm, allowedSectionIds: next });
                              }}
                              className="text-primary text-[10px] underline underline-offset-2 hover:opacity-70"
                            >
                              {areaSections.every((s) => rateForm.allowedSectionIds.includes(s.id)) ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          {/* Section rows */}
                          {areaSections.map((sec, i) => {
                            const selected = rateForm.allowedSectionIds.includes(sec.id);
                            return (
                              <button
                                key={sec.id}
                                type="button"
                                onClick={() => {
                                  const next = selected
                                    ? rateForm.allowedSectionIds.filter((id) => id !== sec.id)
                                    : [...rateForm.allowedSectionIds, sec.id];
                                  setRateForm({ ...rateForm, allowedSectionIds: next });
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                                  i > 0 && "border-t",
                                  selected && "bg-blue-50/60",
                                )}
                              >
                                <div className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                                  selected ? "border-blue-600 bg-blue-600" : "border-muted-foreground/30",
                                )}>
                                  {selected && <Check className="size-3 text-white" />}
                                </div>
                                <div
                                  className="size-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: sec.color ? `var(--color-${sec.color}-500, #64748b)` : "#64748b" }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium leading-none">{sec.name}</p>
                                  {sec.description && (
                                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{sec.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  Cap: {sec.capacity}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
                {rateForm.allowedSectionIds.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {rateForm.allowedSectionIds.length} room{rateForm.allowedSectionIds.length > 1 ? "s" : ""} attached to this rate
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Size-Based Pricing</Label>
                <div className="grid grid-cols-4 gap-3">
                  {(["small", "medium", "large", "giant"] as const).map((size) => (
                    <div key={size} className="space-y-1">
                      <Label className="text-muted-foreground text-xs capitalize">{size}</Label>
                      <Input
                        type="number"
                        value={rateForm.sizePricing[size]}
                        onChange={(e) =>
                          setRateForm({ ...rateForm, sizePricing: { ...rateForm.sizePricing, [size]: parseFloat(e.target.value) || 0 } })
                        }
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rateForm.isActive}
                  onCheckedChange={(checked) => setRateForm({ ...rateForm, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateModalOpen(false)}>
              <X className="mr-2 size-4" /> Cancel
            </Button>
            <Button onClick={handleSaveRate} disabled={!rateForm.name}>
              <Save className="mr-2 size-4" />
              {editingRate ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rate Delete Modal ── */}
      <Dialog open={!!deletingRate} onOpenChange={() => setDeletingRate(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Service</DialogTitle></DialogHeader>
          <p>Are you sure you want to delete <span className="font-semibold">{deletingRate?.name}</span>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRate}>
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add-on Add/Edit Modal ── */}
      <Dialog open={isAddonModalOpen} onOpenChange={setIsAddonModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAddon ? "Edit Add-on" : "Add New Add-on"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add-on Name</Label>
              <Input
                value={addonForm.name}
                onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                placeholder="e.g., Enrichment Activity"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={addonForm.description}
                onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                placeholder="What does this add-on include?"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  value={addonForm.price}
                  onChange={(e) => setAddonForm({ ...addonForm, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={addonForm.duration}
                  onChange={(e) => setAddonForm({ ...addonForm, duration: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={addonForm.isActive}
                onCheckedChange={(checked) => setAddonForm({ ...addonForm, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddonModalOpen(false)}>
              <X className="mr-2 size-4" /> Cancel
            </Button>
            <Button onClick={handleSaveAddon} disabled={!addonForm.name}>
              <Save className="mr-2 size-4" />
              {editingAddon ? "Save Changes" : "Add Add-on"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add-on Delete Modal ── */}
      <Dialog open={!!deletingAddon} onOpenChange={() => setDeletingAddon(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Add-on</DialogTitle></DialogHeader>
          <p>Are you sure you want to delete <span className="font-semibold">{deletingAddon?.name}</span>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingAddon(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAddon}>
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
