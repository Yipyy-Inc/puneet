"use client";

import { useEffect, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { DollarSign, Plus, Edit, Trash2, Sparkles, Gift } from "lucide-react";
import { boardingRates, BoardingRate } from "@/data/boarding";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import { IncludedAddOnsPicker } from "@/components/facility/add-ons/IncludedAddOnsPicker";
import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";
import type { ServiceAddOn } from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";

function loadBoardingAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const raw = localStorage.getItem("settings-service-addons");
    const all = raw ? (JSON.parse(raw) as ServiceAddOn[]) : defaultServiceAddOns;
    return all.filter((a) => a.applicableServices.includes("boarding"));
  } catch {
    return defaultServiceAddOns.filter((a) => a.applicableServices.includes("boarding"));
  }
}

const EMPTY_RATE = {
  name: "",
  description: "",
  basePrice: 0,
  isActive: true,
  color: "#8b5cf6",
  sizePricing: { small: 0, medium: 0, large: 0, giant: 0 },
  includedAddOnIds: [] as string[],
};

export default function BoardingRatesPage() {
  const [rates, setRates] = useState<BoardingRate[]>(boardingRates);
  const [boardingAddOns, setBoardingAddOns] = useState<ServiceAddOn[]>([]);

  useEffect(() => {
    const sync = () => setBoardingAddOns(loadBoardingAddOns());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Rate modal state
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<BoardingRate | null>(null);
  const [rateForm, setRateForm] = useState(EMPTY_RATE);
  const [deletingRate, setDeletingRate] = useState<BoardingRate | null>(null);

  // ── Rate handlers ──────────────────────────────────────────────────────────
  const handleAddRate = () => {
    setEditingRate(null);
    setRateForm(EMPTY_RATE);
    setIsRateModalOpen(true);
  };

  const handleEditRate = (rate: BoardingRate) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      description: rate.description,
      basePrice: rate.basePrice,
      isActive: rate.isActive,
      color: rate.color ?? "#8b5cf6",
      sizePricing: { ...rate.sizePricing },
      includedAddOnIds: rate.includedAddOnIds ?? [],
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

  const handleToggleRate = (rate: BoardingRate) => {
    setRates(rates.map((r) => (r.id === rate.id ? { ...r, isActive: !r.isActive } : r)));
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const rateColumns: ColumnDef<BoardingRate>[] = [
    {
      key: "name",
      label: "Rate Name",
      defaultVisible: true,
      render: (rate) => (
        <div className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: rate.color ?? "#8b5cf6" }}
          />
          <div>
            <p className="font-medium">{rate.name}</p>
            <p className="text-muted-foreground max-w-[200px] truncate text-xs">{rate.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "basePrice",
      label: "Base Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (rate) => <span className="font-medium">${rate.basePrice}/night</span>,
    },
    {
      key: "sizePricing",
      label: "Size Pricing",
      defaultVisible: true,
      render: (rate) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">S: ${rate.sizePricing.small}</Badge>
          <Badge variant="outline" className="text-xs">M: ${rate.sizePricing.medium}</Badge>
          <Badge variant="outline" className="text-xs">L: ${rate.sizePricing.large}</Badge>
          <Badge variant="outline" className="text-xs">XL: ${rate.sizePricing.giant}</Badge>
        </div>
      ),
    },
    {
      key: "includedAddOns",
      label: "Free Add-Ons",
      icon: Gift,
      defaultVisible: true,
      render: (rate) => {
        const ids = rate.includedAddOnIds ?? [];
        if (ids.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Gift className="size-2.5 text-emerald-600" />
            {ids.length} included
          </Badge>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (rate) => (
        <Switch checked={rate.isActive} onCheckedChange={() => handleToggleRate(rate)} />
      ),
    },
  ];

  const activeAddons = boardingAddOns.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Boarding Rates & Pricing
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage nightly rates and add-ons. Discounts, surcharges, and fee rules are configured in Settings.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Active Rates</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">{rates.filter((r) => r.isActive).length}</p>
                <p className="text-muted-foreground mt-1 text-xs">of {rates.length} total</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                <DollarSign className="size-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Avg. Nightly Rate</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  ${rates.length > 0 ? Math.round(rates.reduce((t, r) => t + r.basePrice, 0) / rates.length) : 0}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">based on {rates.length} rates</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50">
                <DollarSign className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Active Add-ons</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">{activeAddons}</p>
                <p className="text-muted-foreground mt-1 text-xs">of {boardingAddOns.length} total</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50">
                <Sparkles className="size-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="bg-slate-100 border">
          <TabsTrigger value="services">Nightly Rates ({rates.length})</TabsTrigger>
          <TabsTrigger value="addons">Add-ons ({boardingAddOns.length})</TabsTrigger>
        </TabsList>

        {/* ── Services Tab ── */}
        <TabsContent value="services" className="mt-0 space-y-4">
          <Card className="scroll-mt-20 overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                <div className="flex size-8 items-center justify-center rounded-lg bg-slate-200">
                  <DollarSign className="size-4 text-slate-700" />
                </div>
                Nightly Rates
              </CardTitle>
              <Button onClick={handleAddRate} size="sm" className="gap-1.5">
                <Plus className="size-3.5" />
                Add Rate
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={rates}
                columns={rateColumns}
                searchKey="name"
                searchPlaceholder="Search rates..."
                actions={(rate) => (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEditRate(rate)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeletingRate(rate)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Add-ons Tab ── */}
        <TabsContent value="addons" className="mt-0 space-y-4">
          <AddOnsManager serviceFilter="boarding" />
        </TabsContent>
      </Tabs>

      {/* Pricing rules link */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold">Pricing Rules</p>
            <p className="text-muted-foreground text-xs">
              Multi-pet discounts, multi-night discounts, peak surcharges, late fees, and custom fees are managed in Settings.
            </p>
          </div>
          <a href="/facility/dashboard/settings?section=pricing-rules" className="text-primary text-sm font-medium hover:underline">
            Go to Pricing Rules →
          </a>
        </CardContent>
      </Card>

      {/* ── Rate Add/Edit Modal ── */}
      <Dialog open={isRateModalOpen} onOpenChange={setIsRateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Rate" : "Add New Rate"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-1">
            <div className="space-y-4 pb-2">
              <div className="space-y-2">
                <Label>Rate Name</Label>
                <Input
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  placeholder="e.g., Premium Suite"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={rateForm.description}
                  onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                  placeholder="Describe what's included..."
                />
              </div>
              <RateColorPicker
                value={rateForm.color}
                onChange={(hex) => setRateForm({ ...rateForm, color: hex })}
              />
              <div className="space-y-2">
                <Label>Base Price (per night)</Label>
                <Input
                  type="number"
                  value={rateForm.basePrice}
                  onChange={(e) => setRateForm({ ...rateForm, basePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Size-Based Pricing</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["small", "medium", "large", "giant"] as const).map((size) => (
                    <div key={size}>
                      <Label className="text-muted-foreground text-xs capitalize">{size}</Label>
                      <Input
                        type="number"
                        value={rateForm.sizePricing[size]}
                        onChange={(e) =>
                          setRateForm({ ...rateForm, sizePricing: { ...rateForm.sizePricing, [size]: parseFloat(e.target.value) || 0 } })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <IncludedAddOnsPicker
                serviceFilter="boarding"
                selectedIds={rateForm.includedAddOnIds}
                onChange={(ids) => setRateForm({ ...rateForm, includedAddOnIds: ids })}
              />
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={rateForm.isActive}
                  onCheckedChange={(checked) => setRateForm({ ...rateForm, isActive: checked })}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRate} disabled={!rateForm.name}>Save Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rate Delete Modal ── */}
      <Dialog open={!!deletingRate} onOpenChange={() => setDeletingRate(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-destructive">Confirm Deletion</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure you want to delete this rate? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRate}>
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
