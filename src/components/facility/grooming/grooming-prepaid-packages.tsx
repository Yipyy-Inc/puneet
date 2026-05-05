"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  Percent,
  Star,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { groomingQueries } from "@/lib/api/grooming";
import {
  groomingPrepaidPackages,
  defaultGroomingPrepaidPackagePolicy,
  type GroomingPrepaidPackage,
  type GroomingPrepaidPackagePolicy,
  type GroomingPrepaidPackageService,
  type GroomingPrepaidPackageStatus,
} from "@/data/grooming-prepaid-packages";

type PackageRecord = GroomingPrepaidPackage & Record<string, unknown>;

const VALIDITY_PRESETS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 },
];

interface FormState {
  name: string;
  description: string;
  services: GroomingPrepaidPackageService[];
  packagePrice: number;
  validityDays: number;
  status: GroomingPrepaidPackageStatus;
  isPopular: boolean;
  policy: GroomingPrepaidPackagePolicy;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  services: [],
  packagePrice: 0,
  validityDays: 180,
  status: "active",
  isPopular: false,
  policy: { ...defaultGroomingPrepaidPackagePolicy },
};

function PolicyToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="hover:bg-muted/30 flex cursor-pointer items-center justify-between rounded-md border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function GroomingPrepaidPackages() {
  const { data: services = [] } = useQuery(groomingQueries.packages());
  const [packages, setPackages] = useState<GroomingPrepaidPackage[]>(
    groomingPrepaidPackages,
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GroomingPrepaidPackage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingService, setPendingService] = useState({
    serviceId: "",
    quantity: 1,
  });
  const [deleting, setDeleting] = useState<GroomingPrepaidPackage | null>(null);

  // ── Stats ────────────────────────────────────────────────────────────────
  const activePackages = packages.filter((p) => p.status === "active").length;
  const totalSold = packages.reduce((sum, p) => sum + p.purchaseCount, 0);
  const totalRevenue = packages.reduce(
    (sum, p) => sum + p.packagePrice * p.purchaseCount,
    0,
  );
  const avgSavings =
    packages.length > 0
      ? packages.reduce((sum, p) => sum + p.savingsPercentage, 0) /
        packages.length
      : 0;

  // ── Form helpers ─────────────────────────────────────────────────────────
  const regularPrice = useMemo(
    () =>
      form.services.reduce(
        (sum, s) => sum + s.pricePerSession * s.quantity,
        0,
      ),
    [form.services],
  );
  const savings = Math.max(0, regularPrice - form.packagePrice);
  const savingsPercentage =
    regularPrice > 0 ? (savings / regularPrice) * 100 : 0;
  const totalSessions = form.services.reduce((sum, s) => sum + s.quantity, 0);

  const handleNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, policy: { ...defaultGroomingPrepaidPackagePolicy } });
    setPendingService({ serviceId: "", quantity: 1 });
    setEditorOpen(true);
  };

  const handleEdit = (pkg: GroomingPrepaidPackage) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description,
      services: pkg.services.map((s) => ({ ...s })),
      packagePrice: pkg.packagePrice,
      validityDays: pkg.validityDays,
      status: pkg.status,
      isPopular: pkg.isPopular ?? false,
      policy: { ...pkg.policy },
    });
    setPendingService({ serviceId: "", quantity: 1 });
    setEditorOpen(true);
  };

  const addServiceRow = () => {
    if (!pendingService.serviceId) return;
    const svc = services.find((s) => s.id === pendingService.serviceId);
    if (!svc) return;

    const existingIndex = form.services.findIndex(
      (s) => s.serviceId === pendingService.serviceId,
    );
    if (existingIndex >= 0) {
      const next = [...form.services];
      next[existingIndex] = {
        ...next[existingIndex],
        quantity: next[existingIndex].quantity + pendingService.quantity,
      };
      setForm({ ...form, services: next });
    } else {
      setForm({
        ...form,
        services: [
          ...form.services,
          {
            serviceId: svc.id,
            serviceName: svc.name,
            quantity: pendingService.quantity,
            pricePerSession: svc.basePrice,
          },
        ],
      });
    }
    setPendingService({ serviceId: "", quantity: 1 });
  };

  const removeServiceRow = (serviceId: string) => {
    setForm({
      ...form,
      services: form.services.filter((s) => s.serviceId !== serviceId),
    });
  };

  const handleSave = () => {
    if (!form.name.trim() || form.services.length === 0) {
      toast.error("Add a name and at least one service");
      return;
    }

    const payload: GroomingPrepaidPackage = {
      id: editing?.id ?? `gpp-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      services: form.services,
      regularPrice,
      packagePrice: form.packagePrice,
      savings,
      savingsPercentage: Number(savingsPercentage.toFixed(1)),
      validityDays: form.validityDays,
      status: form.status,
      isPopular: form.isPopular,
      purchaseCount: editing?.purchaseCount ?? 0,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      policy: form.policy,
    };

    setPackages((prev) =>
      editing
        ? prev.map((p) => (p.id === editing.id ? payload : p))
        : [...prev, payload],
    );
    toast.success(editing ? "Package updated" : "Package created");
    setEditorOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setPackages((prev) => prev.filter((p) => p.id !== deleting.id));
    toast.success(`"${deleting.name}" deleted`);
    setDeleting(null);
  };

  // ── Table config ─────────────────────────────────────────────────────────
  const columns: ColumnDef<PackageRecord>[] = [
    {
      key: "name",
      label: "Package",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            {item.isPopular && (
              <Badge className="border-0 bg-amber-100 text-[10px] text-amber-700">
                <Star className="mr-1 size-2.5" />
                Popular
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
            {item.description}
          </p>
        </div>
      ),
    },
    {
      key: "services",
      label: "Includes",
      defaultVisible: true,
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.services.map((s) => (
            <Badge key={s.serviceId} variant="secondary" className="text-xs">
              {s.quantity}× {s.serviceName}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "regularPrice",
      label: "Value",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => (
        <span className="text-muted-foreground line-through">
          ${item.regularPrice.toFixed(0)}
        </span>
      ),
    },
    {
      key: "packagePrice",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => (
        <span className="font-semibold">${item.packagePrice.toFixed(0)}</span>
      ),
    },
    {
      key: "savingsPercentage",
      label: "Savings",
      icon: Percent,
      defaultVisible: true,
      render: (item) => (
        <Badge variant="outline" className="border-emerald-200 text-emerald-700">
          {item.savingsPercentage.toFixed(1)}% off
        </Badge>
      ),
    },
    {
      key: "validityDays",
      label: "Valid",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => {
        const days = item.validityDays;
        const display =
          days >= 365
            ? `${Math.round(days / 365)} year${days >= 730 ? "s" : ""}`
            : days >= 30
              ? `${Math.round(days / 30)} month${days >= 60 ? "s" : ""}`
              : `${days} days`;
        return <span>{display}</span>;
      },
    },
    {
      key: "purchaseCount",
      label: "Sold",
      icon: ShoppingBag,
      defaultVisible: true,
      render: (item) => <span className="font-medium">{item.purchaseCount}</span>,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => {
        const variant =
          item.status === "active"
            ? "default"
            : item.status === "seasonal"
              ? "secondary"
              : "outline";
        return (
          <Badge variant={variant} className="capitalize">
            {item.status}
          </Badge>
        );
      },
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "seasonal", label: "Seasonal" },
      ],
    },
  ];

  const tableData = packages.map((p) => ({ ...p }) as PackageRecord);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            Prepaid Grooming Packages
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Bundle multiple grooming sessions at a discount with a fixed validity
            window — like a daycare pass for grooming.
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          New Package
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
            <Package className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePackages}</div>
            <p className="text-muted-foreground text-xs">
              of {packages.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packages Sold</CardTitle>
            <ShoppingBag className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSold}</div>
            <p className="text-muted-foreground text-xs">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Package Revenue</CardTitle>
            <DollarSign className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">From package sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Savings</CardTitle>
            <TrendingUp className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSavings.toFixed(1)}%</div>
            <p className="text-muted-foreground text-xs">Customer discount</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <DataTable
        data={tableData}
        columns={columns}
        filters={filters}
        searchKey={"name" as keyof PackageRecord}
        searchPlaceholder="Search packages..."
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleEdit(item as unknown as GroomingPrepaidPackage)}
              >
                <Edit className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleting(item as unknown as GroomingPrepaidPackage)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] min-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Package" : "Create Prepaid Package"}
            </DialogTitle>
            <DialogDescription>
              Bundle one or more grooming services at a discount. Customers
              prepay and redeem sessions over the validity window.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Basic info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pkg-name">Package Name</Label>
                <Input
                  id="pkg-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., 5x Full Groom Pack"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: GroomingPrepaidPackageStatus) =>
                    setForm({ ...form, status: value })
                  }
                >
                  <SelectTrigger id="pkg-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-desc">Description</Label>
              <Textarea
                id="pkg-desc"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What's included and who is this for?"
              />
            </div>

            {/* Services */}
            <div className="space-y-3">
              <Label>Included Services</Label>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={pendingService.serviceId}
                  onValueChange={(value) =>
                    setPendingService({ ...pendingService, serviceId: value })
                  }
                >
                  <SelectTrigger className="min-w-[260px] flex-1">
                    <SelectValue placeholder="Select a grooming service…" />
                  </SelectTrigger>
                  <SelectContent>
                    {services
                      .filter((s) => s.isActive)
                      .map((svc) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          {svc.name} — ${svc.basePrice}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  placeholder="Qty"
                  value={pendingService.quantity}
                  onChange={(e) =>
                    setPendingService({
                      ...pendingService,
                      quantity: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                />
                <Button type="button" variant="secondary" onClick={addServiceRow}>
                  <Plus className="mr-1.5 size-4" />
                  Add
                </Button>
              </div>
              {form.services.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3">
                  {form.services.map((s) => (
                    <div
                      key={s.serviceId}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-muted-foreground size-3.5" />
                        <span>
                          {s.quantity}× {s.serviceName} @ $
                          {s.pricePerSession}/session
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground tabular-nums">
                          ${(s.pricePerSession * s.quantity).toFixed(2)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => removeServiceRow(s.serviceId)}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 text-sm font-medium">
                    {totalSessions} session{totalSessions === 1 ? "" : "s"} ·
                    Regular price ${regularPrice.toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                  Add at least one grooming service to this package.
                </div>
              )}
            </div>

            {/* Pricing & validity */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pkg-price">Package Price ($)</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.packagePrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      packagePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                {form.packagePrice > 0 && regularPrice > 0 && (
                  <p
                    className={
                      savings > 0
                        ? "text-emerald-600 text-xs"
                        : "text-amber-600 text-xs"
                    }
                  >
                    {savings > 0
                      ? `Customer saves $${savings.toFixed(2)} (${savingsPercentage.toFixed(1)}% off)`
                      : "Package price ≥ regular price — no savings"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-validity">Validity</Label>
                <div className="flex gap-2">
                  <Input
                    id="pkg-validity"
                    type="number"
                    min={1}
                    value={form.validityDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        validityDays: parseInt(e.target.value) || 1,
                      })
                    }
                    className="flex-1"
                  />
                  <Select
                    value={String(form.validityDays)}
                    onValueChange={(v) =>
                      setForm({ ...form, validityDays: parseInt(v) || 180 })
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {VALIDITY_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={String(p.value)}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-muted-foreground text-xs">
                  Days after purchase until unused passes expire.
                </p>
              </div>
            </div>

            {/* Popular flag */}
            <label className="hover:bg-muted/30 flex cursor-pointer items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Mark as popular</p>
                <p className="text-muted-foreground text-xs">
                  Highlights the package in the customer storefront.
                </p>
              </div>
              <Switch
                checked={form.isPopular}
                onCheckedChange={(v) => setForm({ ...form, isPopular: v })}
              />
            </label>

            {/* Customer policy */}
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label className="text-sm font-semibold">
                  Customer self-service policy
                </Label>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Controls what pass-holders can do from their account.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <PolicyToggle
                  label="Refund unused passes"
                  checked={form.policy.allowRefundUnused}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      policy: { ...form.policy, allowRefundUnused: v },
                    })
                  }
                />
                <PolicyToggle
                  label="Store credit on cancel"
                  checked={form.policy.allowStoreCreditOnCancel}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      policy: { ...form.policy, allowStoreCreditOnCancel: v },
                    })
                  }
                />
                <PolicyToggle
                  label="Allow transfer to household"
                  checked={form.policy.allowTransfer}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      policy: { ...form.policy, allowTransfer: v },
                    })
                  }
                />
                <PolicyToggle
                  label="Allow validity extension"
                  checked={form.policy.allowExtension}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      policy: { ...form.policy, allowExtension: v },
                    })
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Refund per unused pass ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!form.policy.allowRefundUnused}
                    value={form.policy.refundPerUnusedPass ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        policy: {
                          ...form.policy,
                          refundPerUnusedPass:
                            parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max extension (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    disabled={!form.policy.allowExtension}
                    value={form.policy.maxExtensionDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        policy: {
                          ...form.policy,
                          maxExtensionDays: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Extension fee ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!form.policy.allowExtension}
                    value={form.policy.extensionFee}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        policy: {
                          ...form.policy,
                          extensionFee: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Policy explanation shown to customers
                </Label>
                <Textarea
                  rows={2}
                  value={form.policy.policyNotes ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      policy: { ...form.policy, policyNotes: e.target.value },
                    })
                  }
                  placeholder="e.g. Refunds on unused passes are issued at $50/pass."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Package</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleting?.name}</span>? This won't
              affect customers who have already purchased it, but it will be
              hidden from the storefront.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
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
