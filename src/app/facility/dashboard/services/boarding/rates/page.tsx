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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Percent,
  Calendar,
  Moon,
  TrendingUp,
} from "lucide-react";
import { PricingRulesPanel } from "@/components/facility/PricingRulesPanel";
import {
  boardingRates,
  multiNightDiscounts,
  peakSurcharges,
  BoardingRate,
  MultiNightDiscount,
  PeakSurcharge,
} from "@/data/boarding";

export default function BoardingRatesPage() {
  const [rates, setRates] = useState<BoardingRate[]>(boardingRates);
  const [discounts, setDiscounts] =
    useState<MultiNightDiscount[]>(multiNightDiscounts);
  const [surcharges, setSurcharges] = useState<PeakSurcharge[]>(peakSurcharges);

  // Rate modal state
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<BoardingRate | null>(null);
  const [rateForm, setRateForm] = useState({
    name: "",
    description: "",
    basePrice: 0,
    isActive: true,
    sizePricing: { small: 0, medium: 0, large: 0, giant: 0 },
  });

  // Discount modal state
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] =
    useState<MultiNightDiscount | null>(null);
  const [discountForm, setDiscountForm] = useState({
    name: "",
    minNights: 3,
    maxNights: null as number | null,
    discountPercent: 5,
    isActive: true,
  });

  // Surcharge modal state
  const [isSurchargeModalOpen, setIsSurchargeModalOpen] = useState(false);
  const [editingSurcharge, setEditingSurcharge] =
    useState<PeakSurcharge | null>(null);
  const [surchargeForm, setSurchargeForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    surchargePercent: 15,
    isActive: true,
    dateMode: "specific" as "specific" | "repeat",
    surchargeType: "flat" as "percentage" | "flat",
    surchargeAmount: 10,
    scope: "per_each_pet" as "per_each_pet" | "first_pet_only",
    chargePerLodging: false,
    applicableServices: ["boarding"] as string[],
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    type: "rate" | "discount" | "surcharge";
    item: BoardingRate | MultiNightDiscount | PeakSurcharge;
  } | null>(null);

  // Rate handlers
  const handleAddRate = () => {
    setEditingRate(null);
    setRateForm({
      name: "",
      description: "",
      basePrice: 0,
      isActive: true,
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

  // Discount handlers
  const handleAddDiscount = () => {
    setEditingDiscount(null);
    setDiscountForm({
      name: "",
      minNights: 3,
      maxNights: null,
      discountPercent: 5,
      isActive: true,
    });
    setIsDiscountModalOpen(true);
  };

  const handleEditDiscount = (discount: MultiNightDiscount) => {
    setEditingDiscount(discount);
    setDiscountForm({
      name: discount.name,
      minNights: discount.minNights,
      maxNights: discount.maxNights,
      discountPercent: discount.discountPercent,
      isActive: discount.isActive,
    });
    setIsDiscountModalOpen(true);
  };

  const handleSaveDiscount = () => {
    if (editingDiscount) {
      setDiscounts(
        discounts.map((d) =>
          d.id === editingDiscount.id ? { ...d, ...discountForm } : d,
        ),
      );
    } else {
      const newDiscount: MultiNightDiscount = {
        ...discountForm,
        id: `discount-${Date.now()}`,
      };
      setDiscounts([...discounts, newDiscount]);
    }
    setIsDiscountModalOpen(false);
  };

  const handleToggleDiscount = (discount: MultiNightDiscount) => {
    setDiscounts(
      discounts.map((d) =>
        d.id === discount.id ? { ...d, isActive: !d.isActive } : d,
      ),
    );
  };

  // Surcharge handlers
  const handleAddSurcharge = () => {
    setEditingSurcharge(null);
    setSurchargeForm({
      name: "",
      startDate: "",
      endDate: "",
      surchargePercent: 15,
      isActive: true,
      dateMode: "specific",
      surchargeType: "flat",
      surchargeAmount: 10,
      scope: "per_each_pet",
      chargePerLodging: false,
      applicableServices: ["boarding"],
    });
    setIsSurchargeModalOpen(true);
  };

  const handleEditSurcharge = (surcharge: PeakSurcharge) => {
    setEditingSurcharge(surcharge);
    setSurchargeForm({
      name: surcharge.name,
      startDate: surcharge.startDate,
      endDate: surcharge.endDate,
      surchargePercent: surcharge.surchargePercent,
      isActive: surcharge.isActive,
      dateMode: surcharge.dateMode ?? "specific",
      surchargeType: surcharge.surchargeType ?? "percentage",
      surchargeAmount: surcharge.surchargeAmount ?? 0,
      scope: surcharge.scope ?? "per_each_pet",
      chargePerLodging: surcharge.chargePerLodging ?? false,
      applicableServices: surcharge.applicableServices ?? ["boarding"],
    });
    setIsSurchargeModalOpen(true);
  };

  const handleSaveSurcharge = () => {
    if (editingSurcharge) {
      setSurcharges(
        surcharges.map((s) =>
          s.id === editingSurcharge.id ? { ...s, ...surchargeForm } : s,
        ),
      );
    } else {
      const newSurcharge: PeakSurcharge = {
        ...surchargeForm,
        id: `peak-${Date.now()}`,
      };
      setSurcharges([...surcharges, newSurcharge]);
    }
    setIsSurchargeModalOpen(false);
  };

  const handleToggleSurcharge = (surcharge: PeakSurcharge) => {
    setSurcharges(
      surcharges.map((s) =>
        s.id === surcharge.id ? { ...s, isActive: !s.isActive } : s,
      ),
    );
  };

  // Delete handlers
  const handleDelete = () => {
    if (!deleteModal) return;

    if (deleteModal.type === "rate") {
      setRates(rates.filter((r) => r.id !== deleteModal.item.id));
    } else if (deleteModal.type === "discount") {
      setDiscounts(discounts.filter((d) => d.id !== deleteModal.item.id));
    } else {
      setSurcharges(surcharges.filter((s) => s.id !== deleteModal.item.id));
    }
    setDeleteModal(null);
  };

  // Rate columns
  const rateColumns: ColumnDef<BoardingRate>[] = [
    {
      key: "name",
      label: "Rate Name",
      defaultVisible: true,
      render: (rate) => (
        <div>
          <p className="font-medium">{rate.name}</p>
          <p className="text-muted-foreground max-w-[200px] truncate text-xs">
            {rate.description}
          </p>
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
            onClick={() => setDeleteModal({ type: "rate", item: rate })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Discount columns
  const discountColumns: ColumnDef<MultiNightDiscount>[] = [
    {
      key: "name",
      label: "Discount Name",
      defaultVisible: true,
      render: (discount) => (
        <span className="font-medium">{discount.name}</span>
      ),
    },
    {
      key: "nights",
      label: "Night Range",
      icon: Moon,
      defaultVisible: true,
      render: (discount) => (
        <span>
          {discount.minNights}
          {discount.maxNights ? ` - ${discount.maxNights}` : "+"} nights
        </span>
      ),
    },
    {
      key: "discountPercent",
      label: "Discount",
      icon: Percent,
      defaultVisible: true,
      render: (discount) => (
        <Badge variant="success" className="font-medium">
          {discount.discountPercent}% off
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (discount) => (
        <Switch
          checked={discount.isActive}
          onCheckedChange={() => handleToggleDiscount(discount)}
        />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (discount) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEditDiscount(discount)}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => setDeleteModal({ type: "discount", item: discount })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Surcharge columns
  const surchargeColumns: ColumnDef<PeakSurcharge>[] = [
    {
      key: "name",
      label: "Period Name",
      defaultVisible: true,
      render: (surcharge) => (
        <span className="font-medium">{surcharge.name}</span>
      ),
    },
    {
      key: "dates",
      label: "Date Range",
      icon: Calendar,
      defaultVisible: true,
      render: (surcharge) => (
        <span>
          {new Date(surcharge.startDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          -{" "}
          {new Date(surcharge.endDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "surchargePercent",
      label: "Surcharge",
      icon: TrendingUp,
      defaultVisible: true,
      render: (surcharge) => (
        <Badge variant="warning" className="font-medium">
          +{surcharge.surchargePercent}%
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (surcharge) => (
        <Switch
          checked={surcharge.isActive}
          onCheckedChange={() => handleToggleSurcharge(surcharge)}
        />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (surcharge) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEditSurcharge(surcharge)}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() =>
              setDeleteModal({ type: "surcharge", item: surcharge })
            }
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
          Configure nightly rates, discounts, surcharges, and fee rules
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
        <Card
          className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          onClick={() =>
            document
              .getElementById("section-discounts")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Discounts
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {discounts.filter((d) => d.isActive).length}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {discounts.length} total
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50">
                <Percent className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          onClick={() =>
            document
              .getElementById("section-peak")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Peak Periods
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {surcharges.filter((s) => s.isActive).length}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {surcharges.length} total
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50">
                <TrendingUp className="size-5 text-amber-600" />
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

      {/* Multi-Night Discounts */}
      <Card
        id="section-discounts"
        className="scroll-mt-20 overflow-hidden transition-shadow hover:shadow-md"
      >
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100">
              <Percent className="size-4 text-emerald-700" />
            </div>
            Multi-Night Discounts
          </CardTitle>
          <Button
            onClick={handleAddDiscount}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Add Discount
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={discounts}
            columns={discountColumns}
            searchKey="name"
            searchPlaceholder="Search discounts..."
          />
        </CardContent>
      </Card>

      {/* Peak Surcharges */}
      <Card
        id="section-peak"
        className="scroll-mt-20 overflow-hidden transition-shadow hover:shadow-md"
      >
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
              <Calendar className="size-4 text-amber-700" />
            </div>
            Peak Period Surcharges
          </CardTitle>
          <Button
            onClick={handleAddSurcharge}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Add Peak Period
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={surcharges}
            columns={surchargeColumns}
            searchKey="name"
            searchPlaceholder="Search peak periods..."
          />
        </CardContent>
      </Card>

      {/* Pricing Rules Panel — multi-pet, late/early fees, 24h overflow, custom fees, stacking */}
      <PricingRulesPanel serviceType="boarding" />

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

      {/* Discount Modal */}
      <Dialog open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? "Edit Discount" : "Add New Discount"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discountName">Discount Name</Label>
              <Input
                id="discountName"
                value={discountForm.name}
                onChange={(e) =>
                  setDiscountForm({ ...discountForm, name: e.target.value })
                }
                placeholder="e.g., Week Stay Discount"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minNights">Min Nights</Label>
                <Input
                  id="minNights"
                  type="number"
                  min={1}
                  value={discountForm.minNights}
                  onChange={(e) =>
                    setDiscountForm({
                      ...discountForm,
                      minNights: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxNights">
                  Max Nights (empty = unlimited)
                </Label>
                <Input
                  id="maxNights"
                  type="number"
                  min={1}
                  value={discountForm.maxNights || ""}
                  onChange={(e) =>
                    setDiscountForm({
                      ...discountForm,
                      maxNights: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountPercent">Discount Percentage</Label>
              <Input
                id="discountPercent"
                type="number"
                min={0}
                max={100}
                value={discountForm.discountPercent}
                onChange={(e) =>
                  setDiscountForm({
                    ...discountForm,
                    discountPercent: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="discountActive">Active</Label>
              <Switch
                id="discountActive"
                checked={discountForm.isActive}
                onCheckedChange={(checked) =>
                  setDiscountForm({ ...discountForm, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDiscountModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveDiscount}>Save Discount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Surcharge Modal */}
      <Dialog
        open={isSurchargeModalOpen}
        onOpenChange={setIsSurchargeModalOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSurcharge ? "Edit Peak Period" : "Add New Peak Period"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Period Name</Label>
              <Input
                value={surchargeForm.name}
                onChange={(e) =>
                  setSurchargeForm({ ...surchargeForm, name: e.target.value })
                }
                placeholder="e.g., Christmas Holiday"
              />
            </div>

            {/* Date mode */}
            <div className="space-y-2">
              <Label>Date Selection</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["specific", "repeat"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setSurchargeForm({ ...surchargeForm, dateMode: mode })
                    }
                    className={`rounded-lg border p-2.5 text-left text-xs transition-all ${
                      surchargeForm.dateMode === mode
                        ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                        : "hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium">
                      {mode === "specific"
                        ? "Specific dates"
                        : "Repeat pattern"}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {mode === "specific"
                        ? "One or more date ranges"
                        : "Recurring days of the week"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={surchargeForm.startDate}
                  onChange={(e) =>
                    setSurchargeForm({
                      ...surchargeForm,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={surchargeForm.endDate}
                  onChange={(e) =>
                    setSurchargeForm({
                      ...surchargeForm,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Surcharge type + amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Surcharge Type</Label>
                <Select
                  value={surchargeForm.surchargeType}
                  onValueChange={(v) =>
                    setSurchargeForm({
                      ...surchargeForm,
                      surchargeType: v as "percentage" | "flat",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat amount ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {surchargeForm.surchargeType === "flat"
                    ? "Amount ($)"
                    : "Percentage (%)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={
                    surchargeForm.surchargeType === "flat"
                      ? surchargeForm.surchargeAmount
                      : surchargeForm.surchargePercent
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (surchargeForm.surchargeType === "flat") {
                      setSurchargeForm({
                        ...surchargeForm,
                        surchargeAmount: val,
                      });
                    } else {
                      setSurchargeForm({
                        ...surchargeForm,
                        surchargePercent: val,
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label>Applies to</Label>
              <Select
                value={surchargeForm.scope}
                onValueChange={(v) =>
                  setSurchargeForm({
                    ...surchargeForm,
                    scope: v as "per_each_pet" | "first_pet_only",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_each_pet">Per each pet</SelectItem>
                  <SelectItem value="first_pet_only">First pet only</SelectItem>
                </SelectContent>
              </Select>
              {surchargeForm.scope === "first_pet_only" && (
                <label className="mt-2 flex items-center gap-2">
                  <Switch
                    checked={surchargeForm.chargePerLodging}
                    onCheckedChange={(c) =>
                      setSurchargeForm({
                        ...surchargeForm,
                        chargePerLodging: c,
                      })
                    }
                  />
                  <span className="text-xs">Charge per lodging</span>
                </label>
              )}
            </div>

            {/* Applicable services */}
            <div className="space-y-2">
              <Label>Applicable Services</Label>
              <div className="flex gap-3">
                {["boarding", "daycare"].map((svc) => (
                  <label key={svc} className="flex items-center gap-1.5">
                    <Checkbox
                      checked={surchargeForm.applicableServices.includes(svc)}
                      onCheckedChange={(c) =>
                        setSurchargeForm({
                          ...surchargeForm,
                          applicableServices: c
                            ? [...surchargeForm.applicableServices, svc]
                            : surchargeForm.applicableServices.filter(
                                (s) => s !== svc,
                              ),
                        })
                      }
                    />
                    <span className="text-sm capitalize">{svc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={surchargeForm.isActive}
                onCheckedChange={(checked) =>
                  setSurchargeForm({ ...surchargeForm, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSurchargeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSurcharge}>Save Peak Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete this{" "}
            {deleteModal?.type === "rate"
              ? "rate"
              : deleteModal?.type === "discount"
                ? "discount"
                : "peak period"}
            ? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>
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
