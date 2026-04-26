"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { toast } from "sonner";
import type { GroomingPackage } from "@/types/grooming";
import { ServiceDialog } from "./service-dialog";

// ─── Add-ons mock ─────────────────────────────────────────────────────────────

const ADD_ONS = [
  { id: "ao-01", name: "Teeth Brushing", price: 15, duration: 10, description: "Freshens breath with pet-safe toothpaste" },
  { id: "ao-02", name: "Nail Grinding", price: 12, duration: 10, description: "Smooth finish after nail clipping" },
  { id: "ao-03", name: "Blueberry Facial", price: 20, duration: 15, description: "Antioxidant scrub for face and eye area" },
  { id: "ao-04", name: "De-shedding Treatment", price: 25, duration: 20, description: "High-velocity blow-out for double coats" },
  { id: "ao-05", name: "Paw Balm Treatment", price: 10, duration: 10, description: "Moisturizes and protects paw pads" },
  { id: "ao-06", name: "Anal Gland Expression", price: 18, duration: 10, description: "External expression only" },
  { id: "ao-07", name: "Flea Treatment", price: 22, duration: 15, description: "Flea shampoo + preventative rinse" },
  { id: "ao-08", name: "Bandana or Bow", price: 5, duration: 0, description: "Finishing touch accessory" },
];

// ─── Service charges mock ─────────────────────────────────────────────────────

const SERVICE_CHARGES = [
  { id: "sc-01", name: "Matting Fee", amount: 25, type: "per-15min", description: "Severe coat matting requiring extra dematting time" },
  { id: "sc-02", name: "Aggressive Handling Fee", amount: 20, type: "flat", description: "For pets requiring extra safety measures" },
  { id: "sc-03", name: "Late Cancellation Fee", amount: 30, type: "flat", description: "Cancellations within 24 hours" },
  { id: "sc-04", name: "No Show Fee", amount: 30, type: "flat", description: "Client did not show up for appointment" },
  { id: "sc-05", name: "Travel Fee", amount: 15, type: "per-km", description: "Mobile grooming distance surcharge" },
];

// ─── Service card ─────────────────────────────────────────────────────────────

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
        "group relative rounded-xl border bg-card p-4 transition-shadow hover:shadow-md",
        !pkg.isActive && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30 flex-shrink-0">
            <Package className="size-4 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{pkg.name}</h3>
              {pkg.isPopular && (
                <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0">
                  <Star className="size-2.5 mr-1" />
                  Popular
                </Badge>
              )}
              {!pkg.isActive && (
                <Badge variant="secondary" className="text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {pkg.description}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(pkg)}>
              <Edit className="size-4 mr-2" />
              Edit Service
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(pkg)}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {pkg.duration} min
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="size-3" />
          {minPrice === maxPrice ? `$${minPrice}` : `$${minPrice}–$${maxPrice}`}
        </span>
        {pkg.assignedStylistIds && pkg.assignedStylistIds.length > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            {pkg.assignedStylistIds.length} groomer
            {pkg.assignedStylistIds.length > 1 ? "s" : ""} only
          </span>
        )}
        {pkg.requiresEvaluation && (
          <span className="text-blue-600 dark:text-blue-400">
            Requires eval
          </span>
        )}
      </div>

      {/* Size price pills */}
      <div className="mt-2.5 flex gap-1.5 flex-wrap">
        {(["small", "medium", "large", "giant"] as const).map((size) => (
          <div
            key={size}
            className="rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium"
          >
            <span className="text-muted-foreground capitalize">{size}: </span>$
            {pkg.sizePricing[size]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Add-on card ──────────────────────────────────────────────────────────────

function AddOnCard({ ao }: { ao: (typeof ADD_ONS)[0] }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20 flex-shrink-0">
          <Sparkles className="size-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{ao.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{ao.description}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <p className="text-sm font-semibold">${ao.price}</p>
        {ao.duration > 0 && (
          <p className="text-[10px] text-muted-foreground">{ao.duration} min</p>
        )}
      </div>
    </div>
  );
}

// ─── Service charge card ──────────────────────────────────────────────────────

function ServiceChargeCard({ sc }: { sc: (typeof SERVICE_CHARGES)[0] }) {
  const typeLabel: Record<string, string> = {
    flat: "Flat fee",
    "per-15min": "Per 15 min",
    "per-km": "Per km",
    percent: "% of service",
  };
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex size-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 flex-shrink-0">
          <AlertCircle className="size-3.5 text-red-500 dark:text-red-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{sc.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sc.description}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <p className="text-sm font-semibold">${sc.amount}</p>
        <p className="text-[10px] text-muted-foreground">
          {typeLabel[sc.type] ?? sc.type}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ServicesSetup() {
  const { data: packages = [] } = useQuery(groomingQueries.packages());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<GroomingPackage | null>(
    null,
  );

  function handleEdit(pkg: GroomingPackage) {
    setEditingPackage(pkg);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditingPackage(null);
    setDialogOpen(true);
  }

  function handleDelete(pkg: GroomingPackage) {
    toast.success(`"${pkg.name}" deleted`);
  }

  const activeCount = packages.filter((p) => p.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="services">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="services">
              Services
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {activeCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="addons">Add-ons</TabsTrigger>
            <TabsTrigger value="charges">Service Charges</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={handleNew}>
            <Plus className="size-4 mr-1.5" />
            New Service
          </Button>
        </div>

        {/* ── Services tab ── */}
        <TabsContent value="services" className="mt-0">
          {packages.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
              <Package className="size-8 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium">No services yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create your first grooming service
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleNew}>
                <Plus className="size-4 mr-1.5" />
                Add Service
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {packages.map((pkg) => (
                <ServiceCard
                  key={pkg.id}
                  pkg={pkg}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Add-ons tab ── */}
        <TabsContent value="addons" className="mt-0">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              Add-ons appear automatically in the booking flow after a client
              selects a service.
            </p>
            <Button size="sm" variant="outline">
              <Plus className="size-4 mr-1.5" />
              New Add-on
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ADD_ONS.map((ao) => (
              <AddOnCard key={ao.id} ao={ao} />
            ))}
          </div>
        </TabsContent>

        {/* ── Service charges tab ── */}
        <TabsContent value="charges" className="mt-0">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              Service charges are added manually by staff to an appointment for
              special circumstances.
            </p>
            <Button size="sm" variant="outline">
              <Plus className="size-4 mr-1.5" />
              New Charge
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICE_CHARGES.map((sc) => (
              <ServiceChargeCard key={sc.id} sc={sc} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingPackage={editingPackage}
      />
    </div>
  );
}
