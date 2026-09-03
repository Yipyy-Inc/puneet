"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  BedDouble,
} from "lucide-react";
import Link from "next/link";
import { useRooms } from "@/hooks/use-rooms";
import type { RoomCategory, RoomCategoryColor } from "@/types/rooms";
import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";
import type { ServiceAddOn } from "@/types/facility";
import { defaultServiceAddOns } from "@/data/service-addons";

// ============================================================================
// Boarding rates.
//
// ── WHAT A RATE IS HERE ───────────────────────────────────────────────────
//
// The nightly price of a KENNEL CLASS — `room_categories.default_base_price`.
// That is the number the kennel board displays, and since the boarding pricing
// fix it is the number a stay in that kennel is charged.
//
// This page used to hold a separate rate card in `useState` over
// `src/data/boarding.ts`: four tiers with their own prices, per-size grids and
// "free add-ons". None of it persisted — not even to localStorage — and none
// of it priced anything. A facility set "Premium Suite $65", refreshed, and
// got the fixture back; meanwhile every stay was charged the flat
// `boarding_config.basePrice` of $45 regardless of the kennel.
//
// So this is the same page, against the numbers that are real.
//
// ── WHAT WAS REMOVED, AND WHY IT IS NOT A LOSS ────────────────────────────
//
// PER-SIZE PRICING (small/medium/large/giant). Nothing has ever read it for
// boarding — no booking, no invoice, no report. An input that accepts a number
// and discards it is worse than no input. If a facility should charge more to
// board a mastiff than a chihuahua, that is a feature with schema and a
// resolver behind it, the way grooming already has one — not four boxes.
//
// FREE ADD-ONS. `includedAddOnIds` appeared ZERO times in the fixture, so the
// block in `BoardingDetails` that reads it never ran. Even populated it
// injected add-ons at `quantity: 0` — a pre-fill, never a discount.
//
// Add-ons themselves are untouched and still live on the second tab.
// ============================================================================

function loadBoardingAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const raw = localStorage.getItem("settings-service-addons");
    const all = raw
      ? (JSON.parse(raw) as ServiceAddOn[])
      : defaultServiceAddOns;
    return all.filter((a) => a.applicableServices.includes("boarding"));
  } catch {
    return defaultServiceAddOns.filter((a) =>
      a.applicableServices.includes("boarding"),
    );
  }
}

/** Swatches, matching the ones the Rooms page offers for the same field. */
const COLOR_DOT: Record<RoomCategoryColor, string> = {
  amber: "bg-amber-400",
  violet: "bg-violet-400",
  blue: "bg-blue-400",
  emerald: "bg-emerald-400",
  rose: "bg-rose-400",
  orange: "bg-orange-400",
  indigo: "bg-indigo-400",
  slate: "bg-slate-400",
};

const EMPTY_RATE = {
  name: "",
  description: "",
  basePrice: 0,
  isActive: true,
};

export default function BoardingRatesPage() {
  const { categories, rooms, addCategory, updateCategory, deleteCategory } =
    useRooms();

  // The kennel classes, which ARE the rates. Filtered by service the way every
  // other boarding consumer does — the catalogue is shared with daycare.
  const rates = useMemo(
    () => categories.filter((c) => c.service === "boarding"),
    [categories],
  );

  // How many kennels each class holds. A class with none is a price nobody can
  // book, and the table says so rather than leaving it to be discovered.
  const roomCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const room of rooms) {
      if (!room.active) continue;
      counts.set(room.categoryId, (counts.get(room.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [rooms]);

  const [boardingAddOns, setBoardingAddOns] = useState<ServiceAddOn[]>([]);
  useEffect(() => {
    const sync = () => setBoardingAddOns(loadBoardingAddOns());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<RoomCategory | null>(null);
  const [rateForm, setRateForm] = useState(EMPTY_RATE);
  const [deletingRate, setDeletingRate] = useState<RoomCategory | null>(null);

  // ── Rate handlers ──────────────────────────────────────────────────────────
  const handleAddRate = () => {
    setEditingRate(null);
    setRateForm(EMPTY_RATE);
    setIsRateModalOpen(true);
  };

  const handleEditRate = (rate: RoomCategory) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      description: rate.description ?? "",
      basePrice: rate.defaultBasePrice ?? 0,
      isActive: rate.active,
    });
    setIsRateModalOpen(true);
  };

  const handleSaveRate = () => {
    if (editingRate) {
      updateCategory({
        ...editingRate,
        name: rateForm.name,
        description: rateForm.description,
        defaultBasePrice: rateForm.basePrice,
        active: rateForm.isActive,
      });
    } else {
      // A new rate is a new kennel class, created with no units — the Rooms
      // page is where kennels are added to it, and the table below flags a
      // class that has none.
      addCategory(
        {
          id: `cat-${Date.now()}`,
          facilityId: rates[0]?.facilityId ?? 0,
          service: "boarding",
          name: rateForm.name,
          description: rateForm.description,
          color: "slate",
          sortOrder: rates.length + 1,
          rules: [],
          defaultCapacity: 1,
          defaultBasePrice: rateForm.basePrice,
          visibleToClients: true,
          active: rateForm.isActive,
          locationPricing: [],
        },
        0,
      );
    }
    setIsRateModalOpen(false);
  };

  // The server refuses a class that still holds kennels, which is the correct
  // answer — the price is what would vanish, and the rooms would be orphaned.
  const handleDeleteRate = () => {
    if (deletingRate) deleteCategory(deletingRate.id);
    setDeletingRate(null);
  };

  const handleToggleRate = (rate: RoomCategory) => {
    updateCategory({ ...rate, active: !rate.active });
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const rateColumns: ColumnDef<RoomCategory>[] = [
    {
      key: "name",
      label: "Rate Name",
      defaultVisible: true,
      render: (rate) => (
        <div className="flex items-center gap-2">
          <span
            className={`size-3 shrink-0 rounded-full ring-1 ring-black/10 ${
              COLOR_DOT[rate.color] ?? "bg-slate-400"
            }`}
          />
          <div>
            <p className="font-medium">{rate.name}</p>
            <p className="text-muted-foreground max-w-[200px] truncate text-xs">
              {rate.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "defaultBasePrice",
      label: "Base Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (rate) =>
        rate.defaultBasePrice == null ? (
          // Not "$0". A class with no rate falls back to the flat service
          // price at checkout, and saying so is the only way anyone finds out.
          <span className="text-destructive text-xs font-medium">
            No rate set
          </span>
        ) : (
          <span className="font-medium">${rate.defaultBasePrice}/night</span>
        ),
    },
    {
      key: "kennels",
      label: "Kennels",
      icon: BedDouble,
      defaultVisible: true,
      render: (rate) => {
        const count = roomCountByCategory.get(rate.id) ?? 0;
        return count === 0 ? (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            none yet
          </Badge>
        ) : (
          <span className="text-sm tabular-nums">{count}</span>
        );
      },
    },
    {
      key: "active",
      label: "Status",
      defaultVisible: true,
      render: (rate) => (
        <Switch
          checked={rate.active}
          onCheckedChange={() => handleToggleRate(rate)}
        />
      ),
    },
  ];

  const activeAddons = boardingAddOns.filter((a) => a.isActive).length;
  const priced = rates.filter((r) => r.defaultBasePrice != null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Boarding Rates &amp; Pricing
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          The nightly price of each kennel class — what the board shows and what
          a stay is charged. Kennels themselves are managed in{" "}
          <Link
            href="/facility/dashboard/services/boarding/rooms"
            className="underline underline-offset-2"
          >
            Rooms &amp; Suites
          </Link>
          . Discounts, surcharges and fee rules are in Settings.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Rates
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {rates.filter((r) => r.active).length}
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
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Avg. Nightly Rate
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  $
                  {priced.length > 0
                    ? Math.round(
                        priced.reduce(
                          (t, r) => t + (r.defaultBasePrice ?? 0),
                          0,
                        ) / priced.length,
                      )
                    : 0}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {/* Averaged over the classes that HAVE a rate. Counting the
                      unpriced ones as zero would quietly drag it down. */}
                  based on {priced.length} priced{" "}
                  {priced.length === 1 ? "class" : "classes"}
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50">
                <DollarSign className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Add-ons
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {activeAddons}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {boardingAddOns.length} total
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50">
                <Sparkles className="size-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="border bg-slate-100">
          <TabsTrigger value="services">
            Nightly Rates ({rates.length})
          </TabsTrigger>
          <TabsTrigger value="addons">
            Add-ons ({boardingAddOns.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Rates Tab ── */}
        <TabsContent value="services" className="mt-0 space-y-4">
          <Card className="scroll-mt-20 overflow-hidden transition-shadow hover:shadow-md">
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
                emptyState={{
                  pose: "waiting",
                  icon: DollarSign,
                  title: "No kennel classes yet",
                  description:
                    "A rate is the nightly price of a kennel class. Add one here, then add kennels to it in Rooms & Suites.",
                }}
                actions={(rate) => (
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
                      onClick={() => setDeletingRate(rate)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Add-ons Tab ── */}
        <TabsContent value="addons" className="mt-0 space-y-4">
          <AddOnsManager serviceFilter="boarding" />
        </TabsContent>
      </Tabs>

      {/* ── Rate Modal ── */}
      <Dialog open={isRateModalOpen} onOpenChange={setIsRateModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Rate" : "Add Rate"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rate Name</Label>
                <Input
                  value={rateForm.name}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, name: e.target.value })
                  }
                  placeholder="e.g., Premium Suite"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={rateForm.description}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, description: e.target.value })
                  }
                  placeholder="Describe what's included..."
                />
              </div>
              <div className="space-y-2">
                <Label>Base Price (per night)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={rateForm.basePrice}
                  onChange={(e) =>
                    setRateForm({
                      ...rateForm,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Charged per night for every kennel in this class.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={rateForm.isActive}
                  onCheckedChange={(checked) =>
                    setRateForm({ ...rateForm, isActive: checked })
                  }
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRate} disabled={!rateForm.name}>
              Save Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rate Delete Modal ── */}
      <Dialog open={!!deletingRate} onOpenChange={() => setDeletingRate(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Delete <span className="font-medium">{deletingRate?.name}</span> and
            the nightly rate it carries? A class that still holds kennels cannot
            be deleted — move or remove them in Rooms &amp; Suites first.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRate(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRate}>
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
