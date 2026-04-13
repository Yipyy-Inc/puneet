"use client";

import { useState } from "react";
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
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { DollarSign, Plus, Edit, Trash2 } from "lucide-react";
import { boardingRates, BoardingRate } from "@/data/boarding";
import { RateColorPicker } from "@/components/facility/RateColorPicker";

export default function BoardingRatesPage() {
  const [rates, setRates] = useState<BoardingRate[]>(boardingRates);

  // Rate modal state
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<BoardingRate | null>(null);
  const [rateForm, setRateForm] = useState({
    name: "",
    description: "",
    basePrice: 0,
    isActive: true,
    color: "#8b5cf6",
    sizePricing: { small: 0, medium: 0, large: 0, giant: 0 },
  });

  // Delete modal state
  const [deleteRate, setDeleteRate] = useState<BoardingRate | null>(null);

  // Rate handlers
  const handleAddRate = () => {
    setEditingRate(null);
    setRateForm({
      name: "",
      description: "",
      basePrice: 0,
      isActive: true,
      color: "#8b5cf6",
      sizePricing: { small: 0, medium: 0, large: 0, giant: 0 },
    });
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
    });
    setIsRateModalOpen(true);
  };

  const handleSaveRate = () => {
    if (editingRate) {
      setRates(
        rates.map((r) => (r.id === editingRate.id ? { ...r, ...rateForm } : r)),
      );
    } else {
      const newRate: BoardingRate = {
        ...rateForm,
        id: `rate-${Date.now()}`,
      };
      setRates([...rates, newRate]);
    }
    setIsRateModalOpen(false);
  };

  const handleToggleRate = (rate: BoardingRate) => {
    setRates(
      rates.map((r) =>
        r.id === rate.id ? { ...r, isActive: !r.isActive } : r,
      ),
    );
  };

  // Delete handlers
  const handleDelete = () => {
    if (!deleteRate) return;
    setRates(rates.filter((rate) => rate.id !== deleteRate.id));
    setDeleteRate(null);
  };

  // Rate columns
  const rateColumns: ColumnDef<BoardingRate>[] = [
    {
      key: "name",
      label: "Rate Name",
      defaultVisible: true,
      render: (rate) => (
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full shrink-0 ring-1 ring-black/10"
            style={{ backgroundColor: rate.color ?? "#8b5cf6" }}
          />
          <div>
            <p className="font-medium">{rate.name}</p>
            <p className="text-muted-foreground max-w-[200px] truncate text-xs">
              {rate.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "basePrice",
      label: "Base Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (rate) => (
        <span className="font-medium">${rate.basePrice}/night</span>
      ),
    },
    {
      key: "sizePricing",
      label: "Size Pricing",
      defaultVisible: true,
      render: (rate) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            S: ${rate.sizePricing.small}
          </Badge>
          <Badge variant="outline" className="text-xs">
            M: ${rate.sizePricing.medium}
          </Badge>
          <Badge variant="outline" className="text-xs">
            L: ${rate.sizePricing.large}
          </Badge>
          <Badge variant="outline" className="text-xs">
            XL: ${rate.sizePricing.giant}
          </Badge>
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (rate) => (
        <Switch
          checked={rate.isActive}
          onCheckedChange={() => handleToggleRate(rate)}
        />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (rate) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEditRate(rate)}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => setDeleteRate(rate)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Boarding Rates & Pricing
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage nightly rates. Discounts, surcharges, and fee rules are
          configured in Settings.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          onClick={() =>
            document
              .getElementById("section-rates")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Rates
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {rates.filter((r) => r.isActive).length}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {rates.length} total
                </p>
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
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Avg. Nightly Rate
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  $
                  {rates.length > 0
                    ? Math.round(
                        rates.reduce(
                          (total, rate) => total + rate.basePrice,
                          0,
                        ) / rates.length,
                      )
                    : 0}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  based on {rates.length} configured rates
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50">
                <DollarSign className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nightly Rates */}
      <Card
        id="section-rates"
        className="scroll-mt-20 overflow-hidden transition-shadow hover:shadow-md"
      >
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
          />
        </CardContent>
      </Card>

      {/* Pricing rules moved to Settings → Pricing Rules */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold">Pricing Rules</p>
            <p className="text-muted-foreground text-xs">
              Multi-pet discounts, multi-night discounts, peak surcharges, late
              fees, and custom fees are managed in Settings.
            </p>
          </div>
          <a
            href="/facility/dashboard/settings?section=pricing-rules"
            className="text-primary text-sm font-medium hover:underline"
          >
            Go to Pricing Rules →
          </a>
        </CardContent>
      </Card>

      {/* Rate Modal */}
      <Dialog open={isRateModalOpen} onOpenChange={setIsRateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Rate" : "Add New Rate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rateName">Rate Name</Label>
              <Input
                id="rateName"
                value={rateForm.name}
                onChange={(e) =>
                  setRateForm({ ...rateForm, name: e.target.value })
                }
                placeholder="e.g., Premium Suite"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateDescription">Description</Label>
              <Textarea
                id="rateDescription"
                value={rateForm.description}
                onChange={(e) =>
                  setRateForm({ ...rateForm, description: e.target.value })
                }
                placeholder="Describe what's included..."
              />
            </div>
            <RateColorPicker
              value={rateForm.color}
              onChange={(hex) => setRateForm({ ...rateForm, color: hex })}
            />
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (per night)</Label>
              <Input
                id="basePrice"
                type="number"
                value={rateForm.basePrice}
                onChange={(e) =>
                  setRateForm({
                    ...rateForm,
                    basePrice: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Size-Based Pricing</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Small</Label>
                  <Input
                    type="number"
                    value={rateForm.sizePricing.small}
                    onChange={(e) =>
                      setRateForm({
                        ...rateForm,
                        sizePricing: {
                          ...rateForm.sizePricing,
                          small: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Medium
                  </Label>
                  <Input
                    type="number"
                    value={rateForm.sizePricing.medium}
                    onChange={(e) =>
                      setRateForm({
                        ...rateForm,
                        sizePricing: {
                          ...rateForm.sizePricing,
                          medium: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Large</Label>
                  <Input
                    type="number"
                    value={rateForm.sizePricing.large}
                    onChange={(e) =>
                      setRateForm({
                        ...rateForm,
                        sizePricing: {
                          ...rateForm.sizePricing,
                          large: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Giant</Label>
                  <Input
                    type="number"
                    value={rateForm.sizePricing.giant}
                    onChange={(e) =>
                      setRateForm({
                        ...rateForm,
                        sizePricing: {
                          ...rateForm.sizePricing,
                          giant: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="rateActive">Active</Label>
              <Switch
                id="rateActive"
                checked={rateForm.isActive}
                onCheckedChange={(checked) =>
                  setRateForm({ ...rateForm, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRate}>Save Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteRate} onOpenChange={() => setDeleteRate(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete this rate? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRate(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
