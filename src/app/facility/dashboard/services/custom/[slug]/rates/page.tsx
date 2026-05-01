"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomServices } from "@/hooks/use-custom-services";
import { PRICING_MODEL_LABELS } from "@/data/custom-services";
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";

interface ServiceAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
}

const EMPTY_ADDON: Omit<ServiceAddOn, "id"> = {
  name: "",
  description: "",
  price: 0,
  duration: 0,
  isActive: true,
};

const DEFAULT_ADDONS: ServiceAddOn[] = [
  { id: "cs-ao-001", name: "Towel Service", description: "Soft microfiber towel provided for your dog.", price: 5, duration: 0, isActive: true },
  { id: "cs-ao-002", name: "Premium Shampoo Rinse", description: "Upgrade to a premium conditioning shampoo.", price: 10, duration: 5, isActive: true },
  { id: "cs-ao-003", name: "Blueberry Facial", description: "Tear stain removal and brightening treatment.", price: 10, duration: 5, isActive: true },
  { id: "cs-ao-004", name: "Nail Trim", description: "Quick nail trim added to the session.", price: 12, duration: 10, isActive: true },
  { id: "cs-ao-005", name: "Tooth Brushing", description: "Enzymatic toothpaste brush during the appointment.", price: 12, duration: 5, isActive: false },
];

function StatusIndicator({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center gap-1.5">
        {enabled ? (
          <>
            <CheckCircle2 className="text-success size-4" />
            <span className="text-success text-sm font-medium">Enabled</span>
          </>
        ) : (
          <>
            <XCircle className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">Disabled</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function CustomServiceRatesPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");

  const [addons, setAddons] = useState<ServiceAddOn[]>(DEFAULT_ADDONS);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddOn | null>(null);
  const [addonForm, setAddonForm] = useState<Omit<ServiceAddOn, "id">>(EMPTY_ADDON);
  const [deletingAddon, setDeletingAddon] = useState<ServiceAddOn | null>(null);

  if (!serviceModule) return null;

  const { pricing } = serviceModule;
  const modelLabel = PRICING_MODEL_LABELS[pricing.model] ?? pricing.model;
  const activeAddons = addons.filter((a) => a.isActive).length;

  // ── Add-on handlers ────────────────────────────────────────────────────────
  const handleAddAddon = () => {
    setEditingAddon(null);
    setAddonForm(EMPTY_ADDON);
    setIsAddonModalOpen(true);
  };

  const handleEditAddon = (addon: ServiceAddOn) => {
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
      setAddons([...addons, { id: `cs-ao-${Date.now()}`, ...addonForm }]);
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

  const addonColumns: ColumnDef<ServiceAddOn>[] = [
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Rates &amp; Pricing
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Current pricing configuration and add-ons for {serviceModule.name}.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-50">
                <DollarSign className="size-5 text-sky-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Base Price</p>
                <p className="mt-0.5 text-2xl font-bold">${pricing.basePrice.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                <TrendingUp className="size-5 text-slate-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Pricing Model</p>
                <p className="mt-0.5 text-lg font-bold">{modelLabel}</p>
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

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="bg-slate-100 border">
          <TabsTrigger value="services">Pricing Overview</TabsTrigger>
          <TabsTrigger value="addons">Add-ons ({addons.length})</TabsTrigger>
        </TabsList>

        {/* ── Pricing Overview Tab ── */}
        <TabsContent value="services" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pricing Model */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <DollarSign className="size-5" />
                  Pricing Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Model Type</span>
                  <Badge variant="secondary" className="font-medium">{modelLabel}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Base Price</span>
                  <span className="text-2xl font-bold">${pricing.basePrice.toFixed(2)}</span>
                </div>

                {pricing.model === "duration_based" && pricing.durationTiers && pricing.durationTiers.length > 0 && (
                  <div className="space-y-2 border-t pt-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <Clock className="size-4" /> Duration Tiers
                    </p>
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-muted-foreground px-3 py-2 text-left font-medium">Duration</th>
                            <th className="text-muted-foreground px-3 py-2 text-right font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pricing.durationTiers.map((tier) => (
                            <tr key={tier.durationMinutes}>
                              <td className="px-3 py-2">{tier.durationMinutes} min</td>
                              <td className="px-3 py-2 text-right font-semibold">${tier.price.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(pricing.model === "per_booking" || pricing.model === "flat_rate") && (
                  <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm">
                    Clients are charged a single{" "}
                    <strong>${pricing.basePrice.toFixed(2)}</strong> per{" "}
                    {pricing.model === "per_booking" ? "booking" : "session"}.
                  </div>
                )}

                {pricing.model === "per_route" && (
                  <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm">
                    Clients are charged <strong>${pricing.basePrice.toFixed(2)}</strong> per route.
                  </div>
                )}

                {pricing.model === "per_pet" && (
                  <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm">
                    Clients are charged <strong>${pricing.basePrice.toFixed(2)}</strong> per pet.
                  </div>
                )}

                {pricing.peakPricingRules && pricing.peakPricingRules.length > 0 && (
                  <div className="space-y-2 border-t pt-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <TrendingUp className="size-4" /> Peak Pricing Rules
                    </p>
                    <div className="space-y-1">
                      {pricing.peakPricingRules.map((rule) => (
                        <div key={rule.id} className="bg-muted/40 flex items-center justify-between rounded-sm p-2 text-sm">
                          <span>{rule.name}</span>
                          <Badge variant="warning">
                            {rule.adjustmentType === "percentage" ? `+${rule.adjustment}%` : `+$${rule.adjustment}`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Billing Options</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <StatusIndicator enabled={pricing.taxable} label="Tax Applied" />
                <StatusIndicator enabled={pricing.tipAllowed} label="Tips Allowed" />
                <StatusIndicator enabled={pricing.membershipDiscountEligible} label="Membership Discounts" />
                <StatusIndicator enabled={serviceModule.onlineBooking.depositRequired} label="Deposit Required" />
                {serviceModule.onlineBooking.depositRequired && serviceModule.onlineBooking.depositAmount != null && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground text-sm">Deposit Amount</span>
                    <span className="text-sm font-semibold">${serviceModule.onlineBooking.depositAmount}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Options */}
            {serviceModule.calendar.enabled && serviceModule.calendar.durationOptions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Clock className="size-5" /> Session Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {serviceModule.calendar.durationOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-muted-foreground text-xs">{opt.minutes} minutes</p>
                        </div>
                        {opt.price != null && <span className="font-semibold">${opt.price.toFixed(2)}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="text-muted-foreground mt-4 text-sm">
                    Duration mode:{" "}
                    <span className="font-medium capitalize">{serviceModule.calendar.durationMode}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancellation Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Cancellation Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Cancel window</span>
                  <span className="font-medium">
                    {serviceModule.onlineBooking.cancellationPolicy.hoursBeforeBooking} hours before
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Cancellation fee</span>
                  <Badge
                    variant={
                      serviceModule.onlineBooking.cancellationPolicy.feePercentage > 0
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {serviceModule.onlineBooking.cancellationPolicy.feePercentage}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Add-ons Tab ── */}
        <TabsContent value="addons" className="mt-0 space-y-4">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
              <div>
                <CardTitle className="text-base text-slate-800">{serviceModule.name} Add-ons</CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Optional extras customers can add to any booking.
                </p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={handleAddAddon}>
                <Plus className="size-3.5" />
                Add Add-on
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={addons}
                columns={addonColumns}
                searchKey="name"
                searchPlaceholder="Search add-ons..."
                actions={(item) => (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEditAddon(item)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeletingAddon(item)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                placeholder="e.g., Towel Service"
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
