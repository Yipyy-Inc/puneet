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
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
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
        <div className="flex gap-1 flex-wrap">
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
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => setDeleteModal({ type: "rate", item: rate })}
          >
            <Trash2 className="h-4 w-4" />
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
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => setDeleteModal({ type: "discount", item: discount })}
          >
            <Trash2 className="h-4 w-4" />
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
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() =>
              setDeleteModal({ type: "surcharge", item: surcharge })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Rates
                </p>
                <p className="text-2xl font-bold">
                  {rates.filter((r) => r.isActive).length}
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Discounts
                </p>
                <p className="text-2xl font-bold">
                  {discounts.filter((d) => d.isActive).length}
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                <Percent className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Peak Periods
                </p>
                <p className="text-2xl font-bold">
                  {surcharges.filter((s) => s.isActive).length}
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-warning/10">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nightly Rates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Nightly Rates
          </CardTitle>
          <Button onClick={handleAddRate}>
            <Plus className="h-4 w-4 mr-2" />
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Multi-Night Discounts
          </CardTitle>
          <Button onClick={handleAddDiscount}>
            <Plus className="h-4 w-4 mr-2" />
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Peak Period Surcharges
          </CardTitle>
          <Button onClick={handleAddSurcharge}>
            <Plus className="h-4 w-4 mr-2" />
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
                  <Label className="text-xs text-muted-foreground">Small</Label>
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
                  <Label className="text-xs text-muted-foreground">
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
                  <Label className="text-xs text-muted-foreground">Large</Label>
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
                  <Label className="text-xs text-muted-foreground">Giant</Label>
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
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingSurcharge ? "Edit Peak Period" : "Add New Peak Period"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="surchargeName">Period Name</Label>
              <Input
                id="surchargeName"
                value={surchargeForm.name}
                onChange={(e) =>
                  setSurchargeForm({ ...surchargeForm, name: e.target.value })
                }
                placeholder="e.g., Christmas Holiday"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
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
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
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
            <div className="space-y-2">
              <Label htmlFor="surchargePercent">Surcharge Percentage</Label>
              <Input
                id="surchargePercent"
                type="number"
                min={0}
                max={100}
                value={surchargeForm.surchargePercent}
                onChange={(e) =>
                  setSurchargeForm({
                    ...surchargeForm,
                    surchargePercent: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="surchargeActive">Active</Label>
              <Switch
                id="surchargeActive"
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
          <p className="text-sm text-muted-foreground">
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
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
