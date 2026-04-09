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
  AlertTriangle,
  Building,
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
import { Separator } from "@/components/ui/separator";
import { CustomServiceModuleCard } from "@/components/custom-services/CustomServiceModuleCard";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  CUSTOM_SERVICE_CATEGORIES_META,
  getCategoryMeta,
  PRICING_MODEL_LABELS,
} from "@/data/custom-services";
import { facilities } from "@/data/facilities";
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

function getFacilityName(facilityId: number): string {
  const facility = facilities.find((f) => f.id === facilityId);
  return facility?.name ?? `Facility #${facilityId}`;
}

function ModuleListRow({
  module: mod,
  onEdit,
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
  const catMeta = getCategoryMeta(mod.category);

  return (
    <div className="border-border bg-card flex items-center gap-4 rounded-xl border px-4 py-3 transition-shadow hover:shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="truncate text-sm font-medium">{mod.name}</div>
        <span className="text-muted-foreground hidden truncate text-xs sm:inline">
          /{mod.slug}
        </span>
      </div>
      <div className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
        <Building className="size-3" />
        {getFacilityName(mod.facilityId)}
      </div>
      <div className="shrink-0">
        <Badge
          variant="outline"
          className={`text-xs ${STATUS_COLORS[mod.status]} `}
        >
          {mod.status}
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
        {PRICING_MODEL_LABELS[mod.pricing.model]} · $
        {mod.pricing.basePrice.toFixed(2)}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(mod)}
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

export default function SuperAdminCustomModulesPage() {
  const router = useRouter();
  const { modules, deleteModule, duplicateModule, setModuleStatus } =
    useCustomServices();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomServiceStatus | "all">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<
    CustomServiceCategory | "all"
  >("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<CustomServiceModule | null>(
    null,
  );

  // Filtered modules
  const filtered = useMemo(() => {
    return modules.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter)
        return false;
      if (facilityFilter !== "all" && m.facilityId !== parseInt(facilityFilter))
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
  }, [modules, statusFilter, categoryFilter, facilityFilter, search]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: modules.length,
      active: modules.filter((m) => m.status === "active").length,
      draft: modules.filter((m) => m.status === "draft").length,
      disabled: modules.filter((m) => m.status === "disabled").length,
    };
  }, [modules]);

  // Unique facility IDs from modules
  const facilityIds = useMemo(() => {
    const ids = [...new Set(modules.map((m) => m.facilityId))];
    return ids.sort((a, b) => a - b);
  }, [modules]);

  const handleEdit = useCallback(
    (module: CustomServiceModule) => {
      router.push(`/dashboard/services/custom-modules/${module.slug}/edit`);
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

  const activeFiltersCount = useMemo(
    () =>
      (statusFilter !== "all" ? 1 : 0) +
      (categoryFilter !== "all" ? 1 : 0) +
      (facilityFilter !== "all" ? 1 : 0),
    [statusFilter, categoryFilter, facilityFilter],
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
                Create and manage custom modules for facilities across the
                platform.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/services/custom-modules/create">
                <Plus className="size-4" />
                New Module
              </Link>
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold">{stats.total}</span>
              <span className="text-muted-foreground text-xs">total</span>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-500" />
              <span className="text-sm">
                <span className="font-medium text-emerald-600">
                  {stats.active}
                </span>{" "}
                active
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-yellow-500" />
              <span className="text-sm">
                <span className="font-medium text-amber-600">
                  {stats.draft}
                </span>{" "}
                draft
              </span>
            </div>
            {stats.disabled > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" />
                <span className="text-sm">
                  <span className="font-medium text-red-500">
                    {stats.disabled}
                  </span>{" "}
                  disabled
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="border-border bg-card/50 sticky top-0 z-10 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[180px] flex-1 sm:min-w-48">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Facility filter */}
            <Select
              value={facilityFilter}
              onValueChange={(v) => setFacilityFilter(v)}
            >
              <SelectTrigger className="w-[180px]">
                <Building className="mr-2 size-3.5" />
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {facilityIds.map((id) => (
                  <SelectItem key={id} value={String(id)}>
                    {getFacilityName(id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as CustomServiceStatus | "all")
              }
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
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

            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <SlidersHorizontal className="size-3" />
                {activeFiltersCount}
              </Badge>
            )}

            {/* View mode toggle */}
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("list")}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Search className="text-muted-foreground size-8" />
            </div>
            <h3 className="text-lg font-semibold">No modules found</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {modules.length === 0
                ? "Create your first custom service module to get started."
                : "Try adjusting your search or filters."}
            </p>
            {modules.length === 0 && (
              <Button asChild className="mt-4">
                <Link href="/dashboard/services/custom-modules/create">
                  <Plus className="size-4" />
                  Create Module
                </Link>
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((mod) => (
              <CustomServiceModuleCard
                key={mod.id}
                module={mod}
                onEdit={() => handleEdit(mod)}
                onDuplicate={() => handleDuplicate(mod.id)}
                onDelete={() => handleSetDeleteTarget(mod.id)}
                onToggleStatus={() => handleToggleStatus(mod)}
                onArchive={() => handleArchive(mod.id)}
                facilityName={getFacilityName(mod.facilityId)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((mod) => (
              <ModuleListRow
                key={mod.id}
                module={mod}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleSetDeleteTarget}
                onToggleStatus={handleToggleStatus}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Delete Module
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
