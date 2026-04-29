"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type ColumnDef, type FilterDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  PackagePlus,
  Download,
  Package,
  Truck,
  Phone,
  Mail,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OpsInventoryItem, OpsSupplier, StockAdjustType } from "@/types/ops-inventory";
import { OPS_CATEGORIES } from "@/types/ops-inventory";
import { ItemModal } from "./ItemModal";
import { StockAdjustModal } from "./StockAdjustModal";
import { SupplierModal } from "./SupplierModal";

type EnrichedItem = OpsInventoryItem & {
  daysRemaining: number | null;
  status: "in_stock" | "low_stock" | "out_of_stock";
  supplierName: string;
};

type Props = {
  initialItems: OpsInventoryItem[];
  initialSuppliers: OpsSupplier[];
  facilityId: number;
  facilityName: string;
};

function deriveStatus(item: OpsInventoryItem): "in_stock" | "low_stock" | "out_of_stock" {
  if (item.quantity === 0) return "out_of_stock";
  if (item.quantity <= item.reorderPoint) return "low_stock";
  return "in_stock";
}

export function InventoryClient({
  initialItems,
  initialSuppliers,
  facilityId,
  facilityName,
}: Props) {
  const [items, setItems] = useState<OpsInventoryItem[]>(initialItems);
  const [suppliers, setSuppliers] = useState<OpsSupplier[]>(initialSuppliers);

  const [itemModal, setItemModal] = useState<{ open: boolean; item: OpsInventoryItem | null }>({
    open: false,
    item: null,
  });
  const [adjustModal, setAdjustModal] = useState<{
    open: boolean;
    item: OpsInventoryItem | null;
  }>({ open: false, item: null });
  const [supplierModal, setSupplierModal] = useState<{
    open: boolean;
    supplier: OpsSupplier | null;
  }>({ open: false, supplier: null });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    item: OpsInventoryItem | null;
  }>({ open: false, item: null });

  const getSupplier = (id: string) => suppliers.find((s) => s.id === id);

  const enrichedItems = useMemo<EnrichedItem[]>(
    () =>
      items.map((item) => ({
        ...item,
        daysRemaining: item.dailyUsage > 0 ? Math.floor(item.quantity / item.dailyUsage) : null,
        status: deriveStatus(item),
        supplierName: getSupplier(item.supplierId)?.name ?? "—",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, suppliers],
  );

  // Handlers — Items
  const handleSaveItem = (data: Omit<OpsInventoryItem, "id">) => {
    if (itemModal.item) {
      setItems((prev) =>
        prev.map((i) => (i.id === itemModal.item!.id ? { ...i, ...data } : i)),
      );
      toast.success("Item updated");
    } else {
      const nextId = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      setItems((prev) => [...prev, { ...data, id: nextId }]);
      toast.success("Item added");
    }
    setItemModal({ open: false, item: null });
  };

  const handleAdjustStock = (
    type: StockAdjustType,
    qty: number,
    _reason: string,
    _notes: string,
  ) => {
    const id = adjustModal.item!.id;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const newQty = type === "add" ? i.quantity + qty : Math.max(0, i.quantity - qty);
        return {
          ...i,
          quantity: newQty,
          lastRestocked: type === "add" ? new Date().toISOString().split("T")[0] : i.lastRestocked,
        };
      }),
    );
    toast.success(type === "add" ? `Added ${qty} to stock` : `Removed ${qty} from stock`);
    setAdjustModal({ open: false, item: null });
  };

  const handleDeleteItem = () => {
    setItems((prev) => prev.filter((i) => i.id !== deleteModal.item!.id));
    toast.success("Item removed");
    setDeleteModal({ open: false, item: null });
  };

  // Handlers — Suppliers
  const handleSaveSupplier = (data: Omit<OpsSupplier, "id">) => {
    if (supplierModal.supplier) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplierModal.supplier!.id ? { ...s, ...data } : s)),
      );
      toast.success("Supplier updated");
    } else {
      const nextId = `sup-${Date.now()}`;
      setSuppliers((prev) => [...prev, { ...data, id: nextId }]);
      toast.success("Supplier added");
    }
    setSupplierModal({ open: false, supplier: null });
  };

  // Stats
  const facilityItems = enrichedItems.filter((i) => i.facilityId === facilityId);
  const lowStockItems = facilityItems.filter((i) => i.status === "low_stock");
  const outOfStockItems = facilityItems.filter((i) => i.status === "out_of_stock");
  const runningLow = facilityItems.filter(
    (i) => i.daysRemaining !== null && i.daysRemaining < 7 && i.status !== "out_of_stock",
  );

  // Item table columns
  const itemColumns: ColumnDef<EnrichedItem>[] = [
    {
      key: "name",
      label: "Item",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <div>
          <p className="font-medium">{item.name}</p>
          {item.notes && (
            <p className="text-muted-foreground max-w-52 truncate text-xs">{item.notes}</p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      icon: Package,
      defaultVisible: true,
    },
    {
      key: "quantity",
      label: "Stock",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <span
          className={cn(
            "font-semibold",
            item.status === "out_of_stock"
              ? "text-destructive"
              : item.status === "low_stock"
                ? "text-warning"
                : "",
          )}
        >
          {item.quantity} {item.unit}
        </span>
      ),
    },
    {
      key: "daysRemaining",
      label: "Days Left",
      icon: Package,
      defaultVisible: true,
      render: (item) => {
        if (item.daysRemaining === null) return <span className="text-muted-foreground">—</span>;
        return (
          <span
            className={cn(
              "font-medium",
              item.daysRemaining < 3
                ? "text-destructive"
                : item.daysRemaining < 7
                  ? "text-warning"
                  : "text-emerald-600",
            )}
          >
            ~{item.daysRemaining}d
          </span>
        );
      },
    },
    {
      key: "dailyUsage",
      label: "Daily Use",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <span className="text-muted-foreground text-sm">
          {item.dailyUsage} {item.unit}/day
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: Package,
      defaultVisible: true,
      render: (item) => <StatusBadge type="inventory" value={item.status} />,
    },
    {
      key: "supplierName",
      label: "Supplier",
      icon: Truck,
      defaultVisible: true,
    },
    {
      key: "costPerUnit",
      label: "Cost/Unit",
      icon: Package,
      defaultVisible: false,
      render: (item) => `$${item.costPerUnit.toFixed(2)}`,
    },
    {
      key: "lastRestocked",
      label: "Last Restocked",
      icon: Package,
      defaultVisible: false,
    },
  ];

  const itemFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "in_stock", label: "In Stock" },
        { value: "low_stock", label: "Low Stock" },
        { value: "out_of_stock", label: "Out of Stock" },
      ],
    },
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        ...OPS_CATEGORIES.map((c) => ({ value: c, label: c })),
      ],
    },
  ];

  // Supplier table columns
  const supplierColumns: ColumnDef<OpsSupplier>[] = [
    {
      key: "name",
      label: "Supplier",
      icon: Truck,
      defaultVisible: true,
      render: (s) => (
        <div>
          <p className="font-medium">{s.name}</p>
          {s.paymentTerms && (
            <Badge variant="outline" className="mt-0.5 text-[10px]">
              {s.paymentTerms}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "contactPerson",
      label: "Contact",
      icon: Package,
      defaultVisible: true,
      render: (s) => s.contactPerson ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "phone",
      label: "Phone",
      icon: Phone,
      defaultVisible: true,
      render: (s) =>
        s.phone ? (
          <a href={`tel:${s.phone}`} className="hover:underline">
            {s.phone}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      defaultVisible: true,
      render: (s) =>
        s.email ? (
          <a href={`mailto:${s.email}`} className="hover:underline">
            {s.email}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "orderingPortalUrl",
      label: "Portal",
      icon: Package,
      defaultVisible: true,
      render: (s) =>
        s.orderingPortalUrl ? (
          <div className="flex items-center gap-1">
            <KeyRound className="text-muted-foreground size-3.5" />
            <a
              href={s.orderingPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs hover:underline"
            >
              Portal
              <ExternalLink className="size-3" />
            </a>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      icon: Package,
      defaultVisible: true,
      render: (s) => (
        <Badge variant={s.status === "inactive" ? "secondary" : "default"}>
          {s.status === "inactive" ? "Inactive" : "Active"}
        </Badge>
      ),
    },
  ];

  const supplierFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  const adjustingItemSupplierName = adjustModal.item
    ? (getSupplier(adjustModal.item.supplierId)?.name ?? "—")
    : "";

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Operational Inventory</h2>
          <p className="text-muted-foreground">{facilityName} — supplies & consumables</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSupplierModal({ open: true, supplier: null })}>
            <Truck className="mr-2 size-4" />
            Add Supplier
          </Button>
          <Button onClick={() => setItemModal({ open: true, item: null })}>
            <Plus className="mr-2 size-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Low stock alert */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <Card className="border-warning">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="text-warning size-4" />
              {outOfStockItems.length > 0
                ? `${outOfStockItems.length} item${outOfStockItems.length > 1 ? "s" : ""} out of stock`
                : ""}
              {outOfStockItems.length > 0 && lowStockItems.length > 0 ? " · " : ""}
              {lowStockItems.length > 0
                ? `${lowStockItems.length} item${lowStockItems.length > 1 ? "s" : ""} running low`
                : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[...outOfStockItems, ...lowStockItems].map((item) => {
                const supplier = getSupplier(item.supplierId);
                return (
                  <div key={item.id} className="bg-warning/10 rounded-lg px-3 py-1.5 text-xs">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground ml-1">
                      ({item.quantity} {item.unit} left
                      {supplier?.phone ? ` · ${supplier.phone}` : ""})
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityItems.length}</div>
            <p className="text-muted-foreground text-xs">Tracked items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="text-warning size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-warning text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-muted-foreground text-xs">Need reordering</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Out Soon</CardTitle>
            <AlertTriangle className="text-destructive size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-2xl font-bold">{runningLow.length}</div>
            <p className="text-muted-foreground text-xs">Less than 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Truck className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter((s) => s.status !== "inactive").length}
            </div>
            <p className="text-muted-foreground text-xs">Active suppliers</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="items">
              Inventory Items
              {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
                <Badge variant="destructive" className="ml-1.5 size-5 rounded-full p-0 text-[10px]">
                  {lowStockItems.length + outOfStockItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const rows = facilityItems
                .map(
                  (i) =>
                    `"${i.name}","${i.category}",${i.quantity},"${i.unit}","${i.supplierName}","${i.status}",${i.dailyUsage},${i.reorderPoint},$${i.costPerUnit.toFixed(2)}`,
                )
                .join("\n");
              const csv =
                "Name,Category,Quantity,Unit,Supplier,Status,Daily Usage,Reorder Point,Cost/Unit\n" +
                rows;
              const blob = new Blob([csv], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `ops-inventory-${new Date().toISOString().split("T")[0]}.csv`;
              a.click();
            }}
          >
            <Download className="mr-1.5 size-3.5" />
            Export
          </Button>
        </div>

        <TabsContent value="items" className="mt-4">
          <DataTable
            data={facilityItems}
            columns={itemColumns}
            filters={itemFilters}
            searchKey="name"
            searchPlaceholder="Search items..."
            itemsPerPage={15}
            actions={(item) => (
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustModal({ open: true, item })}
                  title="Adjust stock"
                >
                  <PackagePlus className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItemModal({ open: true, item })}
                  title="Edit item"
                >
                  <Edit className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteModal({ open: true, item })}
                  title="Delete item"
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <DataTable
            data={suppliers}
            columns={supplierColumns}
            filters={supplierFilters}
            searchKey="name"
            searchPlaceholder="Search suppliers..."
            itemsPerPage={15}
            actions={(supplier) => (
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSupplierModal({ open: true, supplier })}
                >
                  <Edit className="size-4" />
                </Button>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ItemModal
        open={itemModal.open}
        item={itemModal.item}
        suppliers={suppliers}
        facilityId={facilityId}
        onClose={() => setItemModal({ open: false, item: null })}
        onSave={handleSaveItem}
      />

      <StockAdjustModal
        open={adjustModal.open}
        item={adjustModal.item}
        supplierName={adjustingItemSupplierName}
        onClose={() => setAdjustModal({ open: false, item: null })}
        onSave={handleAdjustStock}
      />

      <SupplierModal
        open={supplierModal.open}
        supplier={supplierModal.supplier}
        onClose={() => setSupplierModal({ open: false, supplier: null })}
        onSave={handleSaveSupplier}
      />

      {/* Delete confirmation */}
      <Dialog
        open={deleteModal.open}
        onOpenChange={(v) => !v && setDeleteModal({ open: false, item: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">{deleteModal.item?.name}</span> from inventory? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, item: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Remove Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
