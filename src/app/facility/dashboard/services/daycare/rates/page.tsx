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
import { Separator } from "@/components/ui/separator";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { DollarSign, Clock, Edit, Trash2, Plus, Save, X } from "lucide-react";
import { daycareRates, DaycareRate } from "@/data/daycare";

export default function DaycareRatesPage() {
  const [rates, setRates] = useState<DaycareRate[]>(daycareRates);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<DaycareRate | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRate, setDeletingRate] = useState<DaycareRate | null>(null);

  const [pricingSettings, setPricingSettings] = useState({
    fullDayRate: 35,
    halfDayRate: 22,
    multiPetDiscount: 10,
    packageDiscountEnabled: true,
  });

  const [isEditingPricing, setIsEditingPricing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "hourly" as "hourly" | "half-day" | "full-day",
    basePrice: 0,
    description: "",
    durationHours: 1,
    isActive: true,
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
          <div
            className={`size-2 rounded-full ${item.isActive ? "bg-success" : `bg-muted`} `}
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
      {/* Pricing Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pricing Configuration</CardTitle>
              <p className="text-muted-foreground text-sm">
                Base pricing and discount settings for daycare services
              </p>
            </div>
            {!isEditingPricing ? (
              <Button onClick={() => setIsEditingPricing(true)}>
                <Edit className="mr-2 size-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditingPricing(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setIsEditingPricing(false)}>
                  <Save className="mr-2 size-4" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Day Rate ($)</Label>
              <Input
                type="number"
                value={pricingSettings.fullDayRate}
                onChange={(e) =>
                  setPricingSettings({
                    ...pricingSettings,
                    fullDayRate: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!isEditingPricing}
              />
            </div>
            <div className="space-y-2">
              <Label>Half Day Rate ($)</Label>
              <Input
                type="number"
                value={pricingSettings.halfDayRate}
                onChange={(e) =>
                  setPricingSettings({
                    ...pricingSettings,
                    halfDayRate: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!isEditingPricing}
              />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Package Discounts</Label>
              <p className="text-muted-foreground text-sm">
                Offer discounted rates for daycare packages
              </p>
            </div>
            <Switch
              checked={pricingSettings.packageDiscountEnabled}
              onCheckedChange={(checked) =>
                setPricingSettings({
                  ...pricingSettings,
                  packageDiscountEnabled: checked,
                })
              }
              disabled={!isEditingPricing}
            />
          </div>
          <div className="space-y-2">
            <Label>Multi-Pet Discount (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={pricingSettings.multiPetDiscount}
                onChange={(e) =>
                  setPricingSettings({
                    ...pricingSettings,
                    multiPetDiscount: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditingPricing}
                className="w-24"
              />
              <span className="text-muted-foreground">
                % off for additional pets
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <DollarSign className="text-primary size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rates.length}</p>
                <p className="text-muted-foreground text-sm">Total Rates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 rounded-lg p-2">
                <Clock className="text-success size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeRates}</p>
                <p className="text-muted-foreground text-sm">Active Rates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-info/10 rounded-lg p-2">
                <DollarSign className="text-info size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">${avgPrice}</p>
                <p className="text-muted-foreground text-sm">Avg. Base Price</p>
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
                className={`absolute top-0 right-0 left-0 h-1 ${
                  rate.type === "full-day"
                    ? "bg-primary"
                    : rate.type === "half-day"
                      ? "bg-secondary"
                      : "bg-muted-foreground"
                } `}
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
