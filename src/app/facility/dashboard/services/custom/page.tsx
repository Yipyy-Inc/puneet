"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
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
import { CustomServiceModuleCard } from "@/components/custom-services/CustomServiceModuleCard";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  CUSTOM_SERVICE_CATEGORIES_META,
  getCategoryMeta,
  PRICING_MODEL_LABELS,
} from "@/data/custom-services";
import type {
  CustomServiceModule,
  CustomServiceStatus,
  CustomServiceCategory,
} from "@/types/facility";

type ViewMode = "grid" | "list";

// ========================================
// LIST ROW COMPONENT
// ========================================

const STATUS_COLORS: Record<CustomServiceStatus, string> = {
  draft:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  active:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  disabled:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  archived:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
};

function ModuleListRow({
  module,
  onEdit,
  onDuplicate: _onDuplicate,
  onDelete: _onDelete,
  onToggleStatus: _onToggleStatus,
  onArchive: _onArchive,
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
    <div className="border-border bg-card flex items-center gap-4 rounded-xl border px-4 py-3 transition-shadow hover:shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="truncate text-sm font-medium">{module.name}</div>
        <span className="text-muted-foreground hidden truncate text-xs sm:inline">
          /{module.slug}
        </span>
      </div>
      <div className="shrink-0">
        <Badge
          variant="outline"
          className={`text-xs ${STATUS_COLORS[module.status]} `}
        >
          {module.status}
        </Badge>
      </div>
      {catMeta && (
        <Badge
          className={`hidden shrink-0 border text-xs md:inline-flex ${catMeta.badgeClass} `}
        >
          {catMeta.name}
        </Badge>
      )}
      <div className="text-muted-foreground hidden shrink-0 text-xs lg:block">
        {PRICING_MODEL_LABELS[module.pricing.model]} · $
        {module.pricing.basePrice.toFixed(2)}
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
  const [statusFilter, setStatusFilter] = useState<CustomServiceStatus | "all">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<
    CustomServiceCategory | "all"
  >("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<CustomServiceModule | null>(
    null,
  );
  const [isResetting, setIsResetting] = useState(false);

  // Filtered modules
  const filtered = useMemo(() => {
    return modules.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter)
        return false;
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

  const handleEdit = useCallback(
    (module: CustomServiceModule) => {
      router.push(`/facility/dashboard/services/custom/${module.slug}/edit`);
    },
    [router],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateModule(id);
    },
    [duplicateModule],
  );

  const handleSetDeleteTarget = useCallback(
    (id: string) => {
      setDeleteTarget(modules.find((m) => m.id === id) ?? null);
    },
    [modules],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      deleteModule(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteModule]);

  const handleToggleStatus = useCallback(
    (module: CustomServiceModule) => {
      const next: CustomServiceStatus =
        module.status === "active" ? "disabled" : "active";
      const result = setModuleStatus(module.id, next);
      if (!result.ok) {
        toast.error(result.reason ?? "Unable to change module status");
        return;
      }
      toast.success(next === "active" ? "Module activated" : "Module disabled");
    },
    [setModuleStatus],
  );

  const handleArchive = useCallback(
    (id: string) => {
      const result = setModuleStatus(id, "archived");
      if (!result.ok) {
        toast.error(result.reason ?? "Unable to archive module");
        return;
      }
      toast.success("Module archived");
    },
    [setModuleStatus],
  );

  const handleReset = useCallback(() => {
    setIsResetting(false);
    resetCustomServices();
  }, [resetCustomServices]);

  const activeFiltersCount = useMemo(
    () => (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0),
    [statusFilter, categoryFilter],
  );

  return (
    <div className="bg-background min-h-screen">
      {/* Page header */}
      <div className="border-border bg-card border-b">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Custom Service Modules
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage custom services assigned to your facility.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsResetting(true)}
                className="text-muted-foreground"
              >
                <RefreshCw className="size-3.5" />
                <span className="hidden sm:inline">Reset Demo</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="border-border bg-card/50 sticky top-0 z-10 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[180px] flex-1 sm:min-w-48">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as CustomServiceStatus | "all")
              }
            >
              <SelectTrigger className="w-full sm:w-36">
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
              <SelectTrigger className="w-full sm:w-44">
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
                <SlidersHorizontal className="mr-1 size-3" />
                {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}
              </Badge>
            )}

            {/* View toggle */}
            <div className="border-border ml-auto flex items-center gap-0.5 rounded-lg border p-0.5">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("grid")}
                className="size-10"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
              >
                <LayoutGrid className="size-3.5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("list")}
                className="size-10"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
              >
                <List className="size-3.5" />
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
              <div className="max-w-lg">
                <Search className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
                <h3 className="text-lg font-semibold">
                  No custom modules assigned
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Custom service modules are created and assigned by your
                  platform administrator. Contact your admin to set up custom
                  services for your facility.
                </p>
              </div>
            ) : (
              <>
                <Search className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-muted-foreground mt-1 text-sm">
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
            <p className="text-muted-foreground mb-4 text-xs">
              {filtered.length} module{filtered.length !== 1 ? "s" : ""}
              {(search || statusFilter !== "all" || categoryFilter !== "all") &&
                " matching filters"}
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
            <p className="text-muted-foreground mb-3 text-xs">
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
              <AlertTriangle className="text-destructive size-5" />
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
              This will restore the 3 seed modules (Yoda&apos;s Splash, Paws
              Express, Birthday Pawty) and discard all your changes. Continue?
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
