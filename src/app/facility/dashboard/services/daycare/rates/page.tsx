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
import { DollarSign, Clock, Edit, Trash2, Plus, Save, X } from "lucide-react";
import { daycareRates, DaycareRate } from "@/data/daycare";
import { RateColorPicker } from "@/components/facility/RateColorPicker";

export default function DaycareRatesPage() {
  const [rates, setRates] = useState<DaycareRate[]>(daycareRates);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<DaycareRate | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRate, setDeletingRate] = useState<DaycareRate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "hourly" as "hourly" | "half-day" | "full-day",
    basePrice: 0,
    description: "",
    durationHours: 1,
    isActive: true,
    color: "#0284c7",
    sizePricing: {
      small: 0,
      medium: 0,
      large: 0,
      giant: 0,
    },
  });

  const handleAddNew = () => {
    setEditingRate(null);
    setFormData({
      name: "",
      type: "hourly",
      basePrice: 0,
      description: "",
      durationHours: 1,
      isActive: true,
      color: "#0284c7",
      sizePricing: {
        small: 0,
        medium: 0,
        large: 0,
        giant: 0,
      },
    });
    setIsModalOpen(true);
  };

  const handleEdit = (rate: DaycareRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      type: rate.type,
      basePrice: rate.basePrice,
      description: rate.description,
      durationHours: rate.durationHours,
      isActive: rate.isActive,
      color: rate.color ?? "#0284c7",
      sizePricing: { ...rate.sizePricing },
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingRate) {
      setRates(
        rates.map((r) =>
          r.id === editingRate.id
            ? {
                ...r,
                ...formData,
              }
            : r,
        ),
      );
    } else {
      const newRate: DaycareRate = {
        id: `rate-${Date.now()}`,
        ...formData,
      };
      setRates([...rates, newRate]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (rate: DaycareRate) => {
    setDeletingRate(rate);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingRate) {
      setRates(rates.filter((r) => r.id !== deletingRate.id));
    }
    setIsDeleteModalOpen(false);
    setDeletingRate(null);
  };

  const handleToggleActive = (rateId: string) => {
    setRates(
      rates.map((r) => (r.id === rateId ? { ...r, isActive: !r.isActive } : r)),
    );
  };

  const columns: ColumnDef<DaycareRate>[] = [
    {
      key: "name",
      label: "Rate Name",
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
            item.type === "full-day"
              ? "default"
              : item.type === "half-day"
                ? "secondary"
                : "outline"
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
      render: (item) => (
        <span className="font-semibold">${item.basePrice}</span>
      ),
    },
    {
      key: "durationHours",
      label: "Duration",
      icon: Clock,
      defaultVisible: true,
      render: (item) => (
        <span>
          {item.durationHours} {item.durationHours === 1 ? "hour" : "hours"}
        </span>
      ),
    },
    {
      key: "sizePricing",
      label: "Size Pricing",
      defaultVisible: true,
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            S: ${item.sizePricing.small}
          </Badge>
          <Badge variant="outline" className="text-xs">
            M: ${item.sizePricing.medium}
          </Badge>
          <Badge variant="outline" className="text-xs">
            L: ${item.sizePricing.large}
          </Badge>
          <Badge variant="outline" className="text-xs">
            XL: ${item.sizePricing.giant}
          </Badge>
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Switch
          checked={item.isActive}
          onCheckedChange={() => handleToggleActive(item.id)}
        />
      ),
    },
  ];

  // Summary cards
  const activeRates = rates.filter((r) => r.isActive).length;
  const avgPrice =
    rates.length > 0
      ? Math.round(
          rates.reduce((acc, r) => acc + r.basePrice, 0) / rates.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Daycare Rates & Pricing
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage daycare base rates. Discounts, surcharges, and other pricing
          rules are configured in Settings.
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
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Total Rates
                </p>
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
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Rates
                </p>
                <p className="mt-0.5 text-2xl font-bold">{activeRates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-50">
                <DollarSign className="size-5 text-sky-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Avg. Base Price
                </p>
                <p className="mt-0.5 text-2xl font-bold">${avgPrice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Cards Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {rates
          .filter((r) => r.isActive)
          .map((rate) => (
            <Card
              key={rate.id}
              className="relative overflow-hidden transition-shadow hover:shadow-md"
            >
              <div
                className="absolute top-0 right-0 left-0 h-1"
                style={{ backgroundColor: rate.color ?? "#0284c7" }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{rate.name}</CardTitle>
                  <Badge
                    variant={
                      rate.type === "full-day"
                        ? "default"
                        : rate.type === "half-day"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {rate.type.replace("-", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      ${rate.basePrice}
                    </span>
                    <span className="text-muted-foreground">
                      / {rate.durationHours}h
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {rate.description}
                  </p>
                  <div className="border-t pt-2">
                    <p className="text-muted-foreground mb-2 text-xs">
                      Size-based pricing:
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-muted/50 rounded-sm p-2">
                        <p className="text-muted-foreground text-xs">Small</p>
                        <p className="font-semibold">
                          ${rate.sizePricing.small}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-sm p-2">
                        <p className="text-muted-foreground text-xs">Medium</p>
                        <p className="font-semibold">
                          ${rate.sizePricing.medium}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-sm p-2">
                        <p className="text-muted-foreground text-xs">Large</p>
                        <p className="font-semibold">
                          ${rate.sizePricing.large}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-sm p-2">
                        <p className="text-muted-foreground text-xs">Giant</p>
                        <p className="font-semibold">
                          ${rate.sizePricing.giant}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Rates Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Rates</CardTitle>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 size-4" />
              Add Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rates}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search rates..."
            actions={(item) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(item)}
                >
                  <Edit className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(item)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Pricing rules moved to Settings → Pricing Rules */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold">Pricing Rules</p>
            <p className="text-muted-foreground text-xs">
              Multi-pet discounts, late fees, surcharges, and custom fees are
              now managed in Settings.
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

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Rate" : "Add New Rate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Full Day Rate"
                />
              </div>
              <div className="space-y-2">
                <Label>Rate Type</Label>
                <select
                  className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as
                        | "hourly"
                        | "half-day"
                        | "full-day",
                    })
                  }
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
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (hours)</Label>
                <Input
                  type="number"
                  value={formData.durationHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      durationHours: parseInt(e.target.value) || 1,
                    })
                  }
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what's included in this rate..."
                rows={2}
              />
            </div>

            <RateColorPicker
              value={formData.color}
              onChange={(hex) => setFormData({ ...formData, color: hex })}
            />

            <div className="space-y-2">
              <Label>Size-Based Pricing</Label>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Small</Label>
                  <Input
                    type="number"
                    value={formData.sizePricing.small}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizePricing: {
                          ...formData.sizePricing,
                          small: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    Medium
                  </Label>
                  <Input
                    type="number"
                    value={formData.sizePricing.medium}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizePricing: {
                          ...formData.sizePricing,
                          medium: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Large</Label>
                  <Input
                    type="number"
                    value={formData.sizePricing.large}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizePricing: {
                          ...formData.sizePricing,
                          large: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Giant</Label>
                  <Input
                    type="number"
                    value={formData.sizePricing.giant}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizePricing: {
                          ...formData.sizePricing,
                          giant: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              <X className="mr-2 size-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name}>
              <Save className="mr-2 size-4" />
              {editingRate ? "Save Changes" : "Add Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rate</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete{" "}
            <span className="font-semibold">{deletingRate?.name}</span>? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
