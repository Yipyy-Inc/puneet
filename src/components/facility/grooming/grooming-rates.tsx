"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  Clock,
  DollarSign,
  Sparkles,
  AlertCircle,
  Star,
  Save,
  X,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import type { GroomingPackage } from "@/types/grooming";
import type { ServiceAddOn } from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";
import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";
import { ServiceDialog } from "./service-dialog";

function loadGroomingAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const raw = localStorage.getItem("settings-service-addons");
    const all = raw ? (JSON.parse(raw) as ServiceAddOn[]) : defaultServiceAddOns;
    return all.filter((a) => a.applicableServices.includes("grooming"));
  } catch {
    return defaultServiceAddOns.filter((a) => a.applicableServices.includes("grooming"));
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Service charges
// ─────────────────────────────────────────────────────────────────────────

type ServiceChargeType = "flat" | "per-15min" | "per-km" | "percent";

interface ServiceCharge {
  id: string;
  name: string;
  description: string;
  amount: number;
  type: ServiceChargeType;
  isActive: boolean;
}

const SERVICE_CHARGE_TYPE_LABELS: Record<ServiceChargeType, string> = {
  flat: "Flat fee",
  "per-15min": "Per 15 min",
  "per-km": "Per km",
  percent: "% of service",
};

const INITIAL_SERVICE_CHARGES: ServiceCharge[] = [
  {
    id: "sc-01",
    name: "Matting Fee",
    description: "Severe coat matting requiring extra dematting time",
    amount: 25,
    type: "per-15min",
    isActive: true,
  },
  {
    id: "sc-02",
    name: "Aggressive Handling Fee",
    description: "For pets requiring extra safety measures",
    amount: 20,
    type: "flat",
    isActive: true,
  },
  {
    id: "sc-03",
    name: "Late Cancellation Fee",
    description: "Cancellations within 24 hours",
    amount: 30,
    type: "flat",
    isActive: true,
  },
  {
    id: "sc-04",
    name: "No Show Fee",
    description: "Client did not show up for appointment",
    amount: 30,
    type: "flat",
    isActive: true,
  },
  {
    id: "sc-05",
    name: "Travel Fee",
    description: "Mobile grooming distance surcharge",
    amount: 15,
    type: "per-km",
    isActive: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Service card (services tab)
// ─────────────────────────────────────────────────────────────────────────

function ServiceCard({
  pkg,
  onEdit,
  onDelete,
}: {
  pkg: GroomingPackage;
  onEdit: (p: GroomingPackage) => void;
  onDelete: (p: GroomingPackage) => void;
}) {
  const minPrice = Math.min(...Object.values(pkg.sizePricing));
  const maxPrice = Math.max(...Object.values(pkg.sizePricing));

  return (
    <div
      className={cn(
        "group bg-card relative rounded-xl border p-4 transition-shadow hover:shadow-md",
        !pkg.isActive && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30">
            <Package className="size-4 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{pkg.name}</h3>
              {pkg.isPopular && (
                <Badge className="border-0 bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Star className="mr-1 size-2.5" />
                  Popular
                </Badge>
              )}
              {!pkg.isActive && (
                <Badge variant="secondary" className="text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
              {pkg.description}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(pkg)}>
              <Edit className="mr-2 size-4" />
              Edit Service
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(pkg)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {pkg.duration} min
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="size-3" />
          {minPrice === maxPrice ? `$${minPrice}` : `$${minPrice}–$${maxPrice}`}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {(["small", "medium", "large", "giant"] as const).map((size) => (
          <div
            key={size}
            className="bg-muted/60 rounded-md px-2 py-0.5 text-[10px] font-medium"
          >
            <span className="text-muted-foreground capitalize">{size}: </span>$
            {pkg.sizePricing[size]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Service charge editor dialog
// ─────────────────────────────────────────────────────────────────────────

const EMPTY_CHARGE: Omit<ServiceCharge, "id"> = {
  name: "",
  description: "",
  amount: 0,
  type: "flat",
  isActive: true,
};

function ChargeEditorDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ServiceCharge | null;
  onSave: (form: Omit<ServiceCharge, "id">, editing: ServiceCharge | null) => void;
}) {
  const [form, setForm] = useState<Omit<ServiceCharge, "id">>(() =>
    editing
      ? {
          name: editing.name,
          description: editing.description,
          amount: editing.amount,
          type: editing.type,
          isActive: editing.isActive,
        }
      : EMPTY_CHARGE,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Service Charge" : "New Service Charge"}
          </DialogTitle>
          <DialogDescription>
            Charges staff can manually add to an appointment for special
            circumstances.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Matting Fee"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="When does this charge apply?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Charge Type</Label>
              <Select
                value={form.type}
                onValueChange={(v: ServiceChargeType) =>
                  setForm({ ...form, type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat fee</SelectItem>
                  <SelectItem value="per-15min">Per 15 min</SelectItem>
                  <SelectItem value="per-km">Per km</SelectItem>
                  <SelectItem value="percent">% of service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 size-4" /> Cancel
          </Button>
          <Button
            disabled={!form.name.trim()}
            onClick={() => {
              onSave(form, editing);
              setForm(EMPTY_CHARGE);
            }}
          >
            <Save className="mr-2 size-4" />
            {editing ? "Save Changes" : "Add Charge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

export function GroomingRates() {
  const queryClient = useQueryClient();
  const { data: services = [] } = useQuery(groomingQueries.packages());

  // Services
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<GroomingPackage | null>(
    null,
  );

  // Add-ons (sourced from global service-addons store)
  const [groomingAddOns, setGroomingAddOns] = useState<ServiceAddOn[]>([]);

  useEffect(() => {
    const sync = () => setGroomingAddOns(loadGroomingAddOns());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Service charges
  const [charges, setCharges] = useState<ServiceCharge[]>(
    INITIAL_SERVICE_CHARGES,
  );
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ServiceCharge | null>(null);
  const [deletingCharge, setDeletingCharge] = useState<ServiceCharge | null>(
    null,
  );

  const activeServices = services.filter((s) => s.isActive).length;
  const activeAddOns = groomingAddOns.filter((a) => a.isActive).length;
  const activeCharges = charges.filter((c) => c.isActive).length;

  // ── Service handlers ─────────────────────────────────────────────────
  function handleServiceEdit(pkg: GroomingPackage) {
    setEditingService(pkg);
    setServiceDialogOpen(true);
  }
  function handleServiceNew() {
    setEditingService(null);
    setServiceDialogOpen(true);
  }
  function handleServiceDelete(pkg: GroomingPackage) {
    queryClient.setQueryData<GroomingPackage[]>(
      ["grooming", "packages"],
      (prev = []) => prev.filter((p) => p.id !== pkg.id),
    );
    toast.success(`"${pkg.name}" deleted`);
  }

  // ── Service charge handlers ──────────────────────────────────────────
  function handleChargeSave(
    form: Omit<ServiceCharge, "id">,
    editing: ServiceCharge | null,
  ) {
    if (editing) {
      setCharges((prev) =>
        prev.map((c) => (c.id === editing.id ? { ...c, ...form } : c)),
      );
      toast.success(`"${form.name}" updated`);
    } else {
      setCharges((prev) => [...prev, { id: `sc-${Date.now()}`, ...form }]);
      toast.success(`"${form.name}" added`);
    }
    setChargeDialogOpen(false);
    setEditingCharge(null);
  }
  function handleChargeDelete() {
    if (!deletingCharge) return;
    setCharges((prev) => prev.filter((c) => c.id !== deletingCharge.id));
    toast.success(`"${deletingCharge.name}" deleted`);
    setDeletingCharge(null);
  }
  function toggleCharge(id: string) {
    setCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)),
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            Grooming Rates
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage service prices, optional add-ons, and special-circumstance
            service charges.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50">
                <Scissors className="size-5 text-violet-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Services
                </p>
                <p className="mt-0.5 text-2xl font-bold">{activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50">
                <Sparkles className="size-5 text-emerald-600" />
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50">
                <AlertCircle className="size-5 text-rose-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Service Charges
                </p>
                <p className="mt-0.5 text-2xl font-bold">{activeCharges}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">
            Services
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {services.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="addons">
            Add-ons
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {groomingAddOns.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="charges">
            Service Charges
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {charges.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Services tab ── */}
        <TabsContent value="services" className="mt-0 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Each service has size-based pricing (S/M/L/XL) and an optional
              duration.
            </p>
            <Button size="sm" onClick={handleServiceNew}>
              <Plus className="mr-1.5 size-4" />
              New Service
            </Button>
          </div>
          {services.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
              <Package className="text-muted-foreground/50 size-8" />
              <div className="text-center">
                <p className="text-sm font-medium">No services yet</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Create your first grooming service
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleServiceNew}>
                <Plus className="mr-1.5 size-4" />
                Add Service
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((pkg) => (
                <ServiceCard
                  key={pkg.id}
                  pkg={pkg}
                  onEdit={handleServiceEdit}
                  onDelete={handleServiceDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Add-ons tab ── */}
        <TabsContent value="addons" className="mt-0 space-y-4">
          <AddOnsManager serviceFilter="grooming" />
        </TabsContent>

        {/* ── Service charges tab ── */}
        <TabsContent value="charges" className="mt-0 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-base">Service Charges</CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Special-circumstance fees staff can add to an appointment
                  manually.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCharge(null);
                  setChargeDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 size-4" />
                New Charge
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {charges.map((sc) => (
                  <div
                    key={sc.id}
                    className="hover:bg-muted/30 flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20">
                        <AlertCircle className="size-3.5 text-rose-500 dark:text-rose-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{sc.name}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {sc.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {sc.type === "percent" ? `${sc.amount}%` : `$${sc.amount}`}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {SERVICE_CHARGE_TYPE_LABELS[sc.type]}
                        </p>
                      </div>
                      <Switch
                        checked={sc.isActive}
                        onCheckedChange={() => toggleCharge(sc.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => {
                          setEditingCharge(sc);
                          setChargeDialogOpen(true);
                        }}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-8"
                        onClick={() => setDeletingCharge(sc)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {charges.length === 0 && (
                  <div className="text-muted-foreground px-5 py-10 text-center text-sm">
                    No service charges configured.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service editor */}
      <ServiceDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        editingPackage={editingService}
      />

      {/* Charge editor */}
      <ChargeEditorDialog
        key={editingCharge?.id ?? "new-charge"}
        open={chargeDialogOpen}
        onOpenChange={(v) => {
          setChargeDialogOpen(v);
          if (!v) setEditingCharge(null);
        }}
        editing={editingCharge}
        onSave={handleChargeSave}
      />

      {/* Charge delete confirmation */}
      <Dialog
        open={!!deletingCharge}
        onOpenChange={(open) => !open && setDeletingCharge(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service Charge</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingCharge?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCharge(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleChargeDelete}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
