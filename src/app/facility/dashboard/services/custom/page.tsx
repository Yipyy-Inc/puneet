"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CustomServiceModuleCard } from "@/components/custom-services/CustomServiceModuleCard";
import { useCustomServices } from "@/hooks/use-custom-services";
import { CUSTOM_SERVICE_CATEGORIES_META, getCategoryMeta, PRICING_MODEL_LABELS } from "@/data/custom-services";
import type {
  CustomServiceModule,
  CustomServiceStatus,
  CustomServiceCategory,
} from "@/lib/types";

type ViewMode = "grid" | "list";

// ========================================
// LIST ROW COMPONENT
// ========================================

const STATUS_COLORS: Record<CustomServiceStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  active: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  disabled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  archived: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
};


function ModuleListRow({
  module,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onArchive,
}: {
  module: CustomServiceModule;
  onEdit: (m: CustomServiceModule) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (m: CustomServiceModule) => void;
  onArchive: (id: string) => void;
}) {

  const catMeta = getCategoryMeta(module.category);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{module.name}</div>
        <span className="text-xs text-muted-foreground hidden sm:inline truncate">
          /{module.slug}
        </span>
      </div>
      <div className="shrink-0">
        <Badge
          variant="outline"
          className={`text-xs ${STATUS_COLORS[module.status]}`}
        >
          {module.status}
        </Badge>
      </div>
      {catMeta && (
        <Badge className={`text-xs border shrink-0 hidden md:inline-flex ${catMeta.badgeClass}`}>
          {catMeta.name}
        </Badge>
      )}
      <div className="text-xs text-muted-foreground shrink-0 hidden lg:block">
        {PRICING_MODEL_LABELS[module.pricing.model]} · ${module.pricing.basePrice.toFixed(2)}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(module)}
        className="shrink-0"
      >
        Edit
      </Button>
    </div>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function CustomServicesListPage() {
  const router = useRouter();
  const {
    modules,
    deleteModule,
    duplicateModule,
    setModuleStatus,
    resetCustomServices,
  } = useCustomServices();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomServiceStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<CustomServiceCategory | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<CustomServiceModule | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Filtered modules
  const filtered = useMemo(() => {
    return modules.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !m.name.toLowerCase().includes(q) &&
          !m.slug.toLowerCase().includes(q) &&
          !m.description.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [modules, statusFilter, categoryFilter, search]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: modules.length,
      active: modules.filter((m) => m.status === "active").length,
      draft: modules.filter((m) => m.status === "draft").length,
      disabled: modules.filter((m) => m.status === "disabled").length,
    };
  }, [modules]);

  const handleEdit = useCallback((module: CustomServiceModule) => {
    router.push(`/facility/dashboard/services/custom/${module.slug}/edit`);
  }, [router]);

  const handleDuplicate = useCallback((id: string) => {
    duplicateModule(id);
  }, [duplicateModule]);

  const handleSetDeleteTarget = useCallback((id: string) => {
    setDeleteTarget(modules.find((m) => m.id === id) ?? null);
  }, [modules]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      deleteModule(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteModule]);

  const handleToggleStatus = useCallback((module: CustomServiceModule) => {
    const next: CustomServiceStatus =
      module.status === "active" ? "disabled" : "active";
    setModuleStatus(module.id, next);
  }, [setModuleStatus]);

  const handleArchive = useCallback((id: string) => {
    setModuleStatus(id, "archived");
  }, [setModuleStatus]);

  const handleReset = useCallback(() => {
    setIsResetting(false);
    resetCustomServices();
  }, [resetCustomServices]);

  const activeFiltersCount = useMemo(
    () => (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0),
    [statusFilter, categoryFilter],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Custom Service Modules</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Build and manage custom services tailored to your facility&apos;s unique offerings.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsResetting(true)}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset Demo</span>
              </Button>
              <Button asChild>
                <Link href="/facility/dashboard/services/custom/create">
                  <Plus className="h-4 w-4" />
                  New Module
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold">{stats.total}</span>
              <span className="text-xs text-muted-foreground">total</span>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm"><span className="text-emerald-600 font-medium">{stats.active}</span> active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm"><span className="text-amber-600 font-medium">{stats.draft}</span> draft</span>
            </div>
            {stats.disabled > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm"><span className="text-red-500 font-medium">{stats.disabled}</span> disabled</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="border-b border-border bg-card/50 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] sm:min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as CustomServiceStatus | "all")
              }
            >
              <SelectTrigger className="h-8 w-full sm:w-36 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select
              value={categoryFilter}
              onValueChange={(v) =>
                setCategoryFilter(v as CustomServiceCategory | "all")
              }
            >
              <SelectTrigger className="h-8 w-full sm:w-44 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CUSTOM_SERVICE_CATEGORIES_META.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active filter count */}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-8 px-3">
                <SlidersHorizontal className="h-3 w-3 mr-1" />
                {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}
              </Badge>
            )}

            {/* View toggle */}
            <div className="ml-auto flex items-center rounded-lg border border-border p-0.5 gap-0.5">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("grid")}
                className="h-10 w-10"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("list")}
                className="h-10 w-10"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {modules.length === 0 ? (
              <div className="max-w-lg animate-in fade-in duration-500">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mx-auto">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Create your first custom service</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Custom services let you offer anything beyond the standard daycare, boarding, grooming, and training — and have it work natively with booking, check-in, billing, and reporting.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-left">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">Pool Sessions</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Timed bookings with duration options and resource assignment</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">Chauffeur Pickup</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Route-based transport with capacity and driver assignment</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">Birthday Parties</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Event packages with room booking, deposits, and task lists</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                  <Button asChild size="lg">
                    <Link href="/facility/dashboard/services/custom/create">
                      <Plus className="h-4 w-4" />
                      Create Your First Module
                    </Link>
                  </Button>
                  <span className="text-xs text-muted-foreground">Takes about 2 minutes</span>
                </div>
              </div>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filter criteria.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {filtered.length} module{filtered.length !== 1 ? "s" : ""}
              {(search || statusFilter !== "all" || categoryFilter !== "all") && " matching filters"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((module) => (
                <CustomServiceModuleCard
                  key={module.id}
                  module={module}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleSetDeleteTarget}
                  onToggleStatus={handleToggleStatus}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} module{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {filtered.map((module) => (
                <ModuleListRow
                  key={module.id}
                  module={module}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleSetDeleteTarget}
                  onToggleStatus={handleToggleStatus}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Module
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be
              undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset demo dialog */}
      <Dialog open={isResetting} onOpenChange={setIsResetting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Demo Data</DialogTitle>
            <DialogDescription>
              This will restore the 3 seed modules (Yoda&apos;s Splash, Paws Express,
              Birthday Pawty) and discard all your changes. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetting(false)}>
              Cancel
            </Button>
            <Button onClick={handleReset}>Reset to Defaults</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
