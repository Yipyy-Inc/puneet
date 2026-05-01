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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, GraduationCap, Plus, Edit, Trash2, Save, X, Clock, Sparkles } from "lucide-react";
import { trainingPackages, trainingAddOns, TrainingAddOn } from "@/data/training";
import Link from "next/link";

const EMPTY_ADDON = {
  name: "",
  description: "",
  price: 0,
  duration: 0,
  isActive: true,
};

export default function TrainingRatesPage() {
  const [addons, setAddons] = useState<TrainingAddOn[]>(trainingAddOns);

  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<TrainingAddOn | null>(null);
  const [addonForm, setAddonForm] = useState(EMPTY_ADDON);
  const [deletingAddon, setDeletingAddon] = useState<TrainingAddOn | null>(null);

  const activeCount = trainingPackages.filter((p) => p.isActive).length;
  const avgPrice = Math.round(
    trainingPackages.reduce((s, p) => s + p.price, 0) / trainingPackages.length,
  );
  const activeAddons = addons.filter((a) => a.isActive).length;

  // ── Add-on handlers ────────────────────────────────────────────────────────
  const handleAddAddon = () => {
    setEditingAddon(null);
    setAddonForm(EMPTY_ADDON);
    setIsAddonModalOpen(true);
  };

  const handleEditAddon = (addon: TrainingAddOn) => {
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
      setAddons([...addons, { id: `tr-ao-${Date.now()}`, ...addonForm }]);
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

  const addonColumns: ColumnDef<TrainingAddOn>[] = [
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
          Training Pricing & Rules
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          View program pricing and manage add-ons for training bookings.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Active Programs</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">{activeCount}</p>
                <p className="text-muted-foreground mt-1 text-xs">of {trainingPackages.length} total</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50">
                <GraduationCap className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Avg. Program Price</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">${avgPrice}</p>
                <p className="text-muted-foreground mt-1 text-xs">across all programs</p>
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
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Active Add-ons</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">{activeAddons}</p>
                <p className="text-muted-foreground mt-1 text-xs">of {addons.length} total</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50">
                <Sparkles className="size-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="bg-slate-100 border">
          <TabsTrigger value="services">Programs ({trainingPackages.length})</TabsTrigger>
          <TabsTrigger value="addons">Add-ons ({addons.length})</TabsTrigger>
        </TabsList>

        {/* ── Services / Programs Tab ── */}
        <TabsContent value="services" className="mt-0 space-y-4">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between border-b bg-slate-50/50 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100">
                  <GraduationCap className="size-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Program Prices</p>
                  <p className="text-muted-foreground text-[11px]">
                    Edit prices in the{" "}
                    <Link href="/facility/dashboard/services/training/courses" className="text-primary underline">
                      Course Catalog
                    </Link>{" "}
                    tab
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y">
              {trainingPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50/50"
                >
                  <div>
                    <p className="text-sm font-medium">{pkg.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {pkg.sessions} {pkg.sessions === 1 ? "session" : "sessions"} · {pkg.classType} · {pkg.skillLevel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs tabular-nums">${pkg.price}</Badge>
                    <Badge variant={pkg.isActive ? "default" : "secondary"} className="text-[10px]">
                      {pkg.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ── Add-ons Tab ── */}
        <TabsContent value="addons" className="mt-0 space-y-4">
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
              <div>
                <CardTitle className="text-base text-slate-800">Training Add-ons</CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Optional extras customers can add to any training package.
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

      {/* Pricing rules link */}
      <div className="flex items-center justify-between rounded-xl border px-5 py-3">
        <p className="text-muted-foreground text-sm">
          Pricing rules are now in Settings → Pricing Rules
        </p>
        <a href="/facility/dashboard/settings?section=pricing-rules" className="text-primary text-sm font-medium hover:underline">
          Go to Pricing Rules →
        </a>
      </div>

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
                placeholder="e.g., Private Session Top-Up"
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
