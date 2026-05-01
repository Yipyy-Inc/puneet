"use client";

import { useState } from "react";
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
import { DollarSign, Scissors, Edit, Plus, Trash2, Save, X, Clock, Sparkles } from "lucide-react";
import { groomingPackages } from "@/data/grooming";
import {
  breedOverrides,
  coatMultipliers,
  groomingAddOnsList,
  CoatMultiplier,
  BreedOverride,
} from "@/data/grooming-pricing-rules";
import { GroomingAddOn } from "@/types/grooming";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EMPTY_ADDON = {
  name: "",
  description: "",
  price: 0,
  duration: 0,
  isActive: true,
};

export default function GroomingRatesPage() {
  const [addons, setAddons] = useState<GroomingAddOn[]>(groomingAddOnsList);
  const [coats, setCoats] = useState<CoatMultiplier[]>(coatMultipliers);
  const [breeds, setBreeds] = useState<BreedOverride[]>(breedOverrides);

  // Add-on modal state
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<GroomingAddOn | null>(null);
  const [addonForm, setAddonForm] = useState(EMPTY_ADDON);
  const [deletingAddon, setDeletingAddon] = useState<GroomingAddOn | null>(null);

  const activeAddons = addons.filter((a) => a.isActive).length;
  const activePackages = groomingPackages.filter((p) => p.isActive).length;

  // ── Add-on handlers ────────────────────────────────────────────────────────
  const handleAddAddon = () => {
    setEditingAddon(null);
    setAddonForm(EMPTY_ADDON);
    setIsAddonModalOpen(true);
  };

  const handleEditAddon = (addon: GroomingAddOn) => {
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
      setAddons([...addons, { id: `ao-${Date.now()}`, ...addonForm }]);
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

  const addonColumns: ColumnDef<GroomingAddOn>[] = [
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            Grooming Pricing & Add-ons
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage packages, add-ons, breed overrides, and coat multipliers.
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
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Active Packages</p>
                <p className="mt-0.5 text-2xl font-bold">{activePackages}</p>
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
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Avg. Package Price</p>
                <p className="mt-0.5 text-2xl font-bold">
                  ${Math.round(groomingPackages.reduce((s, p) => s + p.basePrice, 0) / groomingPackages.length)}
                </p>
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
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Active Add-ons</p>
                <p className="mt-0.5 text-2xl font-bold">{activeAddons}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="packages" className="space-y-4">
        <TabsList className="bg-slate-100 border">
          <TabsTrigger value="packages">Services ({groomingPackages.length})</TabsTrigger>
          <TabsTrigger value="addons">Add-ons ({addons.length})</TabsTrigger>
          <TabsTrigger value="coats">Coat Types</TabsTrigger>
          <TabsTrigger value="breeds">Breed Pricing</TabsTrigger>
        </TabsList>

        {/* ── Services / Packages Tab ── */}
        <TabsContent value="packages" className="space-y-4 mt-0">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between border-b bg-slate-50/50 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100">
                  <Scissors className="size-4 text-violet-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Package Prices</p>
                  <p className="text-muted-foreground text-[11px]">
                    Edit complete packages in the{" "}
                    <Link href="/facility/dashboard/services/grooming/packages" className="text-primary underline">
                      Packages
                    </Link>{" "}
                    tab
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y">
              {groomingPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{pkg.name}</p>
                      <p className="text-muted-foreground text-xs">{pkg.duration} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {pkg.sizePricing && (
                      <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                        <span>S ${pkg.sizePricing.small}</span>
                        <span>·</span>
                        <span>M ${pkg.sizePricing.medium}</span>
                        <span>·</span>
                        <span>L ${pkg.sizePricing.large}</span>
                        <span>·</span>
                        <span>XL ${pkg.sizePricing.giant}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs tabular-nums">
                      ${pkg.basePrice}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ── Add-ons Tab ── */}
        <TabsContent value="addons" className="space-y-4 mt-0">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
              <div>
                <CardTitle className="text-base text-slate-800">Grooming Add-ons</CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Optional extras customers can add to any grooming appointment.
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

        {/* ── Coat Types Tab ── */}
        <TabsContent value="coats" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base text-slate-800">Coat Type Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {coats.map((coat) => (
                  <div key={coat.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50">
                    <div>
                      <p className="font-semibold text-sm">{coat.coatType}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{coat.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={coat.multiplier > 1 ? "secondary" : "outline"} className="text-xs">
                        {coat.multiplier}x Base
                      </Badge>
                      <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-slate-700">
                        <Edit className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Breed Pricing Tab ── */}
        <TabsContent value="breeds" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base text-slate-800">Breed Overrides & Pricing</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {breeds.map((breed) => (
                  <div key={breed.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50">
                    <div>
                      <p className="font-semibold text-sm">{breed.breed}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-xs text-violet-700 bg-violet-100 border-violet-200">
                        {breed.type === "fixed-add" ? `+$${breed.priceModifier}` : `${breed.priceModifier}x`}
                      </Badge>
                      <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-slate-700">
                        <Edit className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
                placeholder="e.g., Teeth Brushing"
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
