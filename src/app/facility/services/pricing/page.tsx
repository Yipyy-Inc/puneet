"use client";

import { useState } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  MoreHorizontal,
  Percent,
  Zap,
  Clock,
  Sun,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  seasonalPricing,
  peakSurcharges,
  dynamicPricingRules,
  type SeasonalPricing,
  type PeakSurcharge,
  type DynamicPricingRule,
  type ServiceCategory,
} from "@/data/services-pricing";

type SeasonalWithRecord = SeasonalPricing & Record<string, unknown>;
type PeakWithRecord = PeakSurcharge & Record<string, unknown>;
type DynamicWithRecord = DynamicPricingRule & Record<string, unknown>;

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState("seasonal");

  // Seasonal pricing modal state
  const [isSeasonalModalOpen, setIsSeasonalModalOpen] = useState(false);
  const [editingSeasonal, setEditingSeasonal] =
    useState<SeasonalPricing | null>(null);
  const [seasonalForm, setSeasonalForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    priceModifier: 0,
    modifierType: "percentage" as "percentage" | "flat",
    applicableCategories: [] as ServiceCategory[],
    isActive: true,
  });

  // Peak surcharge modal state
  const [isPeakModalOpen, setIsPeakModalOpen] = useState(false);
  const [editingPeak, setEditingPeak] = useState<PeakSurcharge | null>(null);
  const [peakForm, setPeakForm] = useState({
    name: "",
    description: "",
    triggerType: "occupancy" as
      | "occupancy"
      | "day_of_week"
      | "holiday"
      | "time_of_day",
    triggerValue: "",
    surchargeAmount: 0,
    surchargeType: "percentage" as "percentage" | "flat",
    applicableCategories: [] as ServiceCategory[],
    isActive: true,
    priority: 1,
  });

  // Dynamic pricing modal state
  const [isDynamicModalOpen, setIsDynamicModalOpen] = useState(false);
  const [editingDynamic, setEditingDynamic] =
    useState<DynamicPricingRule | null>(null);
  const [dynamicForm, setDynamicForm] = useState({
    name: "",
    description: "",
    ruleType: "demand" as
      | "demand"
      | "occupancy"
      | "last_minute"
      | "advance_booking",
    minOccupancy: 0,
    maxOccupancy: 100,
    daysBeforeBooking: 0,
    priceAdjustment: 0,
    adjustmentType: "percentage" as "percentage" | "flat",
    isActive: true,
  });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    type: "seasonal" | "peak" | "dynamic";
    item: SeasonalPricing | PeakSurcharge | DynamicPricingRule;
  } | null>(null);

  const activeSeasonal = seasonalPricing.filter((s) => s.isActive).length;
  const activePeak = peakSurcharges.filter((s) => s.isActive).length;
  const activeDynamic = dynamicPricingRules.filter((s) => s.isActive).length;

  // Seasonal pricing handlers
  const handleAddSeasonal = () => {
    setEditingSeasonal(null);
    setSeasonalForm({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      priceModifier: 0,
      modifierType: "percentage",
      applicableCategories: [],
      isActive: true,
    });
    setIsSeasonalModalOpen(true);
  };

  const handleEditSeasonal = (item: SeasonalPricing) => {
    setEditingSeasonal(item);
    setSeasonalForm({
      name: item.name,
      description: item.description,
      startDate: item.startDate,
      endDate: item.endDate,
      priceModifier: item.priceModifier,
      modifierType: item.modifierType,
      applicableCategories: item.applicableCategories,
      isActive: item.isActive,
    });
    setIsSeasonalModalOpen(true);
  };

  // Peak surcharge handlers
  const handleAddPeak = () => {
    setEditingPeak(null);
    setPeakForm({
      name: "",
      description: "",
      triggerType: "occupancy",
      triggerValue: "",
      surchargeAmount: 0,
      surchargeType: "percentage",
      applicableCategories: [],
      isActive: true,
      priority: 1,
    });
    setIsPeakModalOpen(true);
  };

  const handleEditPeak = (item: PeakSurcharge) => {
    setEditingPeak(item);
    setPeakForm({
      name: item.name,
      description: item.description,
      triggerType: item.triggerType,
      triggerValue: String(item.triggerValue),
      surchargeAmount: item.surchargeAmount,
      surchargeType: item.surchargeType,
      applicableCategories: item.applicableCategories,
      isActive: item.isActive,
      priority: item.priority,
    });
    setIsPeakModalOpen(true);
  };

  // Dynamic pricing handlers
  const handleAddDynamic = () => {
    setEditingDynamic(null);
    setDynamicForm({
      name: "",
      description: "",
      ruleType: "demand",
      minOccupancy: 0,
      maxOccupancy: 100,
      daysBeforeBooking: 0,
      priceAdjustment: 0,
      adjustmentType: "percentage",
      isActive: true,
    });
    setIsDynamicModalOpen(true);
  };

  const handleEditDynamic = (item: DynamicPricingRule) => {
    setEditingDynamic(item);
    setDynamicForm({
      name: item.name,
      description: item.description,
      ruleType: item.ruleType,
      minOccupancy: item.conditions.minOccupancy || 0,
      maxOccupancy: item.conditions.maxOccupancy || 100,
      daysBeforeBooking: item.conditions.daysBeforeBooking || 0,
      priceAdjustment: item.priceAdjustment,
      adjustmentType: item.adjustmentType,
      isActive: item.isActive,
    });
    setIsDynamicModalOpen(true);
  };

  const handleDelete = (
    type: "seasonal" | "peak" | "dynamic",
    item: SeasonalPricing | PeakSurcharge | DynamicPricingRule,
  ) => {
    setDeletingItem({ type, item });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
    setDeletingItem(null);
  };

  const toggleSeasonalCategory = (category: ServiceCategory) => {
    setSeasonalForm((prev) => ({
      ...prev,
      applicableCategories: prev.applicableCategories.includes(category)
        ? prev.applicableCategories.filter((c) => c !== category)
        : [...prev.applicableCategories, category],
    }));
  };

  // Seasonal pricing columns
  const seasonalColumns: ColumnDef<SeasonalWithRecord>[] = [
    {
      key: "name",
      label: "Name",
      icon: Sun,
      defaultVisible: true,
    },
    {
      key: "startDate",
      label: "Start Date",
      icon: Calendar,
      defaultVisible: true,
    },
    {
      key: "endDate",
      label: "End Date",
      icon: Calendar,
      defaultVisible: true,
    },
    {
      key: "priceModifier",
      label: "Modifier",
      icon: Percent,
      defaultVisible: true,
      render: (item: SeasonalWithRecord) => {
        const mod = item.priceModifier as number;
        const type = item.modifierType as string;
        const isPositive = mod >= 0;
        return (
          <Badge variant={isPositive ? "destructive" : "default"}>
            {isPositive ? "+" : ""}
            {mod}
            {type === "percentage" ? "%" : "$"}
          </Badge>
        );
      },
    },
    {
      key: "applicableCategories",
      label: "Categories",
      defaultVisible: true,
      render: (item: SeasonalWithRecord) => {
        const categories = item.applicableCategories as ServiceCategory[];
        return (
          <div className="flex flex-wrap gap-1">
            {categories.length === 0 ? (
              <Badge variant="outline">All</Badge>
            ) : (
              categories.map((cat) => (
                <Badge key={cat} variant="secondary" className="capitalize">
                  {cat}
                </Badge>
              ))
            )}
          </div>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item: SeasonalWithRecord) => (
        <Badge variant={(item.isActive as boolean) ? "default" : "outline"}>
          {(item.isActive as boolean) ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  // Peak surcharge columns
  const peakColumns: ColumnDef<PeakWithRecord>[] = [
    {
      key: "name",
      label: "Name",
      icon: Zap,
      defaultVisible: true,
    },
    {
      key: "triggerType",
      label: "Trigger Type",
      defaultVisible: true,
      render: (item: PeakWithRecord) => (
        <Badge variant="outline" className="capitalize">
          {(item.triggerType as string).replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "triggerValue",
      label: "Trigger Value",
      defaultVisible: true,
      render: (item: PeakWithRecord) => {
        const type = item.triggerType as string;
        const value = item.triggerValue;
        if (type === "occupancy") return <span>{value}%</span>;
        return (
          <span className="capitalize">{String(value).replace(",", ", ")}</span>
        );
      },
    },
    {
      key: "surchargeAmount",
      label: "Surcharge",
      icon: DollarSign,
      defaultVisible: true,
      render: (item: PeakWithRecord) => (
        <Badge variant="destructive">
          +{item.surchargeAmount as number}
          {(item.surchargeType as string) === "percentage" ? "%" : "$"}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      defaultVisible: true,
      render: (item: PeakWithRecord) => <span>{item.priority as number}</span>,
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item: PeakWithRecord) => (
        <Badge variant={(item.isActive as boolean) ? "default" : "outline"}>
          {(item.isActive as boolean) ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  // Dynamic pricing columns
  const dynamicColumns: ColumnDef<DynamicWithRecord>[] = [
    {
      key: "name",
      label: "Name",
      icon: TrendingUp,
      defaultVisible: true,
    },
    {
      key: "ruleType",
      label: "Rule Type",
      defaultVisible: true,
      render: (item: DynamicWithRecord) => (
        <Badge variant="outline" className="capitalize">
          {(item.ruleType as string).replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "conditions",
      label: "Conditions",
      defaultVisible: true,
      render: (item: DynamicWithRecord) => {
        const conditions = item.conditions as DynamicPricingRule["conditions"];
        const parts: string[] = [];
        if (
          conditions.minOccupancy !== undefined ||
          conditions.maxOccupancy !== undefined
        ) {
          parts.push(
            `Occupancy: ${conditions.minOccupancy || 0}-${conditions.maxOccupancy || 100}%`,
          );
        }
        if (conditions.daysBeforeBooking !== undefined) {
          parts.push(`${conditions.daysBeforeBooking} days before`);
        }
        return <span className="text-sm">{parts.join(", ") || "N/A"}</span>;
      },
    },
    {
      key: "priceAdjustment",
      label: "Adjustment",
      icon: Percent,
      defaultVisible: true,
      render: (item: DynamicWithRecord) => {
        const adj = item.priceAdjustment as number;
        const type = item.adjustmentType as string;
        return (
          <Badge variant={adj >= 0 ? "destructive" : "default"}>
            {adj >= 0 ? "+" : ""}
            {adj}
            {type === "percentage" ? "%" : "$"}
          </Badge>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item: DynamicWithRecord) => (
        <Badge variant={(item.isActive as boolean) ? "default" : "outline"}>
          {(item.isActive as boolean) ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const categories: ServiceCategory[] = [
    "boarding",
    "daycare",
    "grooming",
    "training",
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Seasonal Rules
            </CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seasonalPricing.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeSeasonal} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Peak Surcharges
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peakSurcharges.length}</div>
            <p className="text-xs text-muted-foreground">{activePeak} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dynamic Rules</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dynamicPricingRules.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeDynamic} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {seasonalPricing.length +
                peakSurcharges.length +
                dynamicPricingRules.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeSeasonal + activePeak + activeDynamic} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="seasonal">
              <Sun className="mr-2 h-4 w-4" />
              Seasonal ({seasonalPricing.length})
            </TabsTrigger>
            <TabsTrigger value="peak">
              <Zap className="mr-2 h-4 w-4" />
              Peak Surcharges ({peakSurcharges.length})
            </TabsTrigger>
            <TabsTrigger value="dynamic">
              <TrendingUp className="mr-2 h-4 w-4" />
              Dynamic ({dynamicPricingRules.length})
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={() => {
              if (activeTab === "seasonal") handleAddSeasonal();
              else if (activeTab === "peak") handleAddPeak();
              else handleAddDynamic();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>

        <TabsContent value="seasonal" className="mt-4">
          <DataTable
            data={seasonalPricing.map((s) => ({ ...s }) as SeasonalWithRecord)}
            columns={seasonalColumns}
            searchKey={"name" as keyof SeasonalWithRecord}
            searchPlaceholder="Search seasonal rules..."
            actions={(item: SeasonalWithRecord) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      handleEditSeasonal(item as unknown as SeasonalPricing)
                    }
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleDelete(
                        "seasonal",
                        item as unknown as SeasonalPricing,
                      )
                    }
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        <TabsContent value="peak" className="mt-4">
          <DataTable
            data={peakSurcharges.map((s) => ({ ...s }) as PeakWithRecord)}
            columns={peakColumns}
            searchKey={"name" as keyof PeakWithRecord}
            searchPlaceholder="Search peak surcharges..."
            actions={(item: PeakWithRecord) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      handleEditPeak(item as unknown as PeakSurcharge)
                    }
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleDelete("peak", item as unknown as PeakSurcharge)
                    }
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        <TabsContent value="dynamic" className="mt-4">
          <DataTable
            data={dynamicPricingRules.map(
              (s) => ({ ...s }) as DynamicWithRecord,
            )}
            columns={dynamicColumns}
            searchKey={"name" as keyof DynamicWithRecord}
            searchPlaceholder="Search dynamic rules..."
            actions={(item: DynamicWithRecord) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      handleEditDynamic(item as unknown as DynamicPricingRule)
                    }
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleDelete(
                        "dynamic",
                        item as unknown as DynamicPricingRule,
                      )
                    }
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Seasonal Pricing Modal */}
      <Dialog open={isSeasonalModalOpen} onOpenChange={setIsSeasonalModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSeasonal ? "Edit" : "Add"} Seasonal Pricing
            </DialogTitle>
            <DialogDescription>
              Set date-based pricing adjustments for peak or slow seasons.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="seasonalName">Name</Label>
              <Input
                id="seasonalName"
                value={seasonalForm.name}
                onChange={(e) =>
                  setSeasonalForm({ ...seasonalForm, name: e.target.value })
                }
                placeholder="e.g., Summer Peak Season"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seasonalDesc">Description</Label>
              <Textarea
                id="seasonalDesc"
                value={seasonalForm.description}
                onChange={(e) =>
                  setSeasonalForm({
                    ...seasonalForm,
                    description: e.target.value,
                  })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={seasonalForm.startDate}
                  onChange={(e) =>
                    setSeasonalForm({
                      ...seasonalForm,
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
                  value={seasonalForm.endDate}
                  onChange={(e) =>
                    setSeasonalForm({
                      ...seasonalForm,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modifier">Price Modifier</Label>
                <Input
                  id="modifier"
                  type="number"
                  value={seasonalForm.priceModifier}
                  onChange={(e) =>
                    setSeasonalForm({
                      ...seasonalForm,
                      priceModifier: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modifierType">Type</Label>
                <Select
                  value={seasonalForm.modifierType}
                  onValueChange={(value: "percentage" | "flat") =>
                    setSeasonalForm({ ...seasonalForm, modifierType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applicable Categories</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={
                      seasonalForm.applicableCategories.includes(cat)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => toggleSeasonalCategory(cat)}
                    className="capitalize"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to all categories
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="seasonalActive"
                checked={seasonalForm.isActive}
                onCheckedChange={(checked) =>
                  setSeasonalForm({ ...seasonalForm, isActive: checked })
                }
              />
              <Label htmlFor="seasonalActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSeasonalModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsSeasonalModalOpen(false)}>
              {editingSeasonal ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Peak Surcharge Modal */}
      <Dialog open={isPeakModalOpen} onOpenChange={setIsPeakModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPeak ? "Edit" : "Add"} Peak Surcharge
            </DialogTitle>
            <DialogDescription>
              Set surcharges based on occupancy, days of week, or holidays.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="peakName">Name</Label>
              <Input
                id="peakName"
                value={peakForm.name}
                onChange={(e) =>
                  setPeakForm({ ...peakForm, name: e.target.value })
                }
                placeholder="e.g., Weekend Surcharge"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="peakDesc">Description</Label>
              <Textarea
                id="peakDesc"
                value={peakForm.description}
                onChange={(e) =>
                  setPeakForm({ ...peakForm, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="triggerType">Trigger Type</Label>
                <Select
                  value={peakForm.triggerType}
                  onValueChange={(value: typeof peakForm.triggerType) =>
                    setPeakForm({ ...peakForm, triggerType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="occupancy">Occupancy %</SelectItem>
                    <SelectItem value="day_of_week">Day of Week</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="time_of_day">Time of Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="triggerValue">Trigger Value</Label>
                <Input
                  id="triggerValue"
                  value={peakForm.triggerValue}
                  onChange={(e) =>
                    setPeakForm({ ...peakForm, triggerValue: e.target.value })
                  }
                  placeholder={
                    peakForm.triggerType === "occupancy"
                      ? "85"
                      : peakForm.triggerType === "day_of_week"
                        ? "friday,saturday"
                        : "christmas,thanksgiving"
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surcharge">Surcharge Amount</Label>
                <Input
                  id="surcharge"
                  type="number"
                  min="0"
                  value={peakForm.surchargeAmount}
                  onChange={(e) =>
                    setPeakForm({
                      ...peakForm,
                      surchargeAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surchargeType">Type</Label>
                <Select
                  value={peakForm.surchargeType}
                  onValueChange={(value: "percentage" | "flat") =>
                    setPeakForm({ ...peakForm, surchargeType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority (lower = higher priority)
              </Label>
              <Input
                id="priority"
                type="number"
                min="1"
                value={peakForm.priority}
                onChange={(e) =>
                  setPeakForm({
                    ...peakForm,
                    priority: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="peakActive"
                checked={peakForm.isActive}
                onCheckedChange={(checked) =>
                  setPeakForm({ ...peakForm, isActive: checked })
                }
              />
              <Label htmlFor="peakActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPeakModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsPeakModalOpen(false)}>
              {editingPeak ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dynamic Pricing Modal */}
      <Dialog open={isDynamicModalOpen} onOpenChange={setIsDynamicModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDynamic ? "Edit" : "Add"} Dynamic Pricing Rule
            </DialogTitle>
            <DialogDescription>
              Set demand-based or occupancy-based pricing adjustments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dynamicName">Name</Label>
              <Input
                id="dynamicName"
                value={dynamicForm.name}
                onChange={(e) =>
                  setDynamicForm({ ...dynamicForm, name: e.target.value })
                }
                placeholder="e.g., Last Minute Discount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dynamicDesc">Description</Label>
              <Textarea
                id="dynamicDesc"
                value={dynamicForm.description}
                onChange={(e) =>
                  setDynamicForm({
                    ...dynamicForm,
                    description: e.target.value,
                  })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleType">Rule Type</Label>
              <Select
                value={dynamicForm.ruleType}
                onValueChange={(value: typeof dynamicForm.ruleType) =>
                  setDynamicForm({ ...dynamicForm, ruleType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demand">Demand-Based</SelectItem>
                  <SelectItem value="occupancy">Occupancy-Based</SelectItem>
                  <SelectItem value="last_minute">Last Minute</SelectItem>
                  <SelectItem value="advance_booking">
                    Advance Booking
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(dynamicForm.ruleType === "occupancy" ||
              dynamicForm.ruleType === "demand") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minOcc">Min Occupancy %</Label>
                  <Input
                    id="minOcc"
                    type="number"
                    min="0"
                    max="100"
                    value={dynamicForm.minOccupancy}
                    onChange={(e) =>
                      setDynamicForm({
                        ...dynamicForm,
                        minOccupancy: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxOcc">Max Occupancy %</Label>
                  <Input
                    id="maxOcc"
                    type="number"
                    min="0"
                    max="100"
                    value={dynamicForm.maxOccupancy}
                    onChange={(e) =>
                      setDynamicForm({
                        ...dynamicForm,
                        maxOccupancy: parseInt(e.target.value) || 100,
                      })
                    }
                  />
                </div>
              </div>
            )}
            {(dynamicForm.ruleType === "last_minute" ||
              dynamicForm.ruleType === "advance_booking") && (
              <div className="space-y-2">
                <Label htmlFor="daysBefore">Days Before Booking</Label>
                <Input
                  id="daysBefore"
                  type="number"
                  min="0"
                  value={dynamicForm.daysBeforeBooking}
                  onChange={(e) =>
                    setDynamicForm({
                      ...dynamicForm,
                      daysBeforeBooking: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adjustment">Price Adjustment</Label>
                <Input
                  id="adjustment"
                  type="number"
                  value={dynamicForm.priceAdjustment}
                  onChange={(e) =>
                    setDynamicForm({
                      ...dynamicForm,
                      priceAdjustment: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustType">Type</Label>
                <Select
                  value={dynamicForm.adjustmentType}
                  onValueChange={(value: "percentage" | "flat") =>
                    setDynamicForm({ ...dynamicForm, adjustmentType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="dynamicActive"
                checked={dynamicForm.isActive}
                onCheckedChange={(checked) =>
                  setDynamicForm({ ...dynamicForm, isActive: checked })
                }
              />
              <Label htmlFor="dynamicActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDynamicModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsDynamicModalOpen(false)}>
              {editingDynamic ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;
              {deletingItem?.item && "name" in deletingItem.item
                ? deletingItem.item.name
                : ""}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
