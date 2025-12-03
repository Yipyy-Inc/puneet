"use client";

import { useState } from "react";
import { Module, modules as initialModules } from "@/data/modules";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Users,
  UserCircle,
  DollarSign,
  MessageSquare,
  GraduationCap,
  Scissors,
  Package,
  Check,
  Edit,
  Plus,
  Lock,
  Trash2,
  Percent,
  Home,
  Target,
  Bot,
  Gift,
  Mail,
  Phone,
  BarChart3,
  MessagesSquare,
  Award,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  Users,
  UserCircle,
  DollarSign,
  MessageSquare,
  GraduationCap,
  Scissors,
  Package,
  Home,
  Target,
  Bot,
  Gift,
  Mail,
  Phone,
  BarChart3,
  MessagesSquare,
  Award,
};

const iconOptions = [
  "Calendar",
  "Users",
  "UserCircle",
  "DollarSign",
  "MessageSquare",
  "GraduationCap",
  "Scissors",
  "Package",
  "Home",
  "Target",
  "Bot",
  "Gift",
  "Mail",
  "Phone",
  "BarChart3",
  "MessagesSquare",
  "Award",
];

export interface ModulePackage {
  id: string;
  name: string;
  description: string;
  modules: string[];
  discount: number;
  pricing: {
    monthly: number;
    quarterly: number;
    yearly: number;
    currency: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const initialPackages: ModulePackage[] = [
  {
    id: "pkg-001",
    name: "Starter Bundle",
    description: "Essential modules for small facilities",
    modules: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    discount: 10,
    pricing: {
      monthly: 39,
      quarterly: 105,
      yearly: 399,
      currency: "USD",
    },
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "pkg-002",
    name: "Professional Suite",
    description: "Complete solution for growing businesses",
    modules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
    ],
    discount: 15,
    pricing: {
      monthly: 99,
      quarterly: 269,
      yearly: 999,
      currency: "USD",
    },
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
  {
    id: "pkg-003",
    name: "Grooming Pro",
    description: "Specialized package for grooming facilities",
    modules: [
      "module-booking",
      "module-customer-management",
      "module-grooming-management",
      "module-inventory-management",
    ],
    discount: 12,
    pricing: {
      monthly: 79,
      quarterly: 215,
      yearly: 799,
      currency: "USD",
    },
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-11-27T00:00:00Z",
  },
];

interface ModuleCardProps {
  module: Module;
  onEdit: (module: Module) => void;
  onToggle: (module: Module) => void;
  allModules: Module[];
}

function ModuleCard({ module, onEdit, onToggle, allModules }: ModuleCardProps) {
  const Icon = iconMap[module.icon] || Package;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "core":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "advanced":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "premium":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "addon":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "beginner":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "pro":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "enterprise":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{module.name}</CardTitle>
              <CardDescription className="text-sm">
                {module.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`capitalize ${getCategoryColor(module.category)}`}
          >
            {module.category}
          </Badge>
          <Badge
            variant="outline"
            className={`capitalize ${getTierBadgeColor(module.requiredTier)}`}
          >
            {module.requiredTier === "all"
              ? "All Tiers"
              : `${module.requiredTier}+`}
          </Badge>
          {module.isStandalone && <Badge variant="secondary">Standalone</Badge>}
          {!module.isActive && <Badge variant="destructive">Inactive</Badge>}
        </div>

        {/* Pricing */}
        {module.pricing.monthly > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">
              Add-on Pricing
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">${module.pricing.monthly}</p>
                <p className="text-xs text-muted-foreground">/mo</p>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">${module.pricing.quarterly}</p>
                <p className="text-xs text-muted-foreground">/qtr</p>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">${module.pricing.yearly}</p>
                <p className="text-xs text-muted-foreground">/yr</p>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground">
            Features ({module.features.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {module.features.slice(0, 4).map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm">{feature}</p>
              </div>
            ))}
            {module.features.length > 4 && (
              <p className="text-xs text-muted-foreground pl-6">
                + {module.features.length - 4} more features
              </p>
            )}
          </div>
        </div>

        {/* Dependencies */}
        {module.dependencies.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Dependencies
            </h4>
            <div className="flex flex-wrap gap-1">
              {module.dependencies.map((depId) => (
                <Badge key={depId} variant="outline" className="text-xs">
                  {allModules.find((m) => m.id === depId)?.name || depId}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onEdit(module)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button
          variant={module.isActive ? "outline" : "default"}
          size="sm"
          onClick={() => onToggle(module)}
        >
          {module.isActive ? "Disable" : "Enable"}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface PackageCardProps {
  pkg: ModulePackage;
  onEdit: (pkg: ModulePackage) => void;
  onDelete: (pkg: ModulePackage) => void;
  allModules: Module[];
}

function PackageCard({ pkg, onEdit, onDelete, allModules }: PackageCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{pkg.name}</CardTitle>
            <CardDescription>{pkg.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Percent className="h-3 w-3" />
              {pkg.discount}% off
            </Badge>
            {!pkg.isActive && <Badge variant="destructive">Inactive</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pricing */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground">
            Package Pricing
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-2xl font-bold">${pkg.pricing.monthly}</p>
              <p className="text-xs text-muted-foreground">/ month</p>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-2xl font-bold">${pkg.pricing.quarterly}</p>
              <p className="text-xs text-muted-foreground">/ quarter</p>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-2xl font-bold">${pkg.pricing.yearly}</p>
              <p className="text-xs text-muted-foreground">/ year</p>
            </div>
          </div>
        </div>

        {/* Included Modules */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground">
            Included Modules ({pkg.modules.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {pkg.modules.map((moduleId) => {
              const moduleObj = allModules.find((m) => m.id === moduleId);
              return moduleObj ? (
                <Badge key={moduleId} variant="secondary" className="text-xs">
                  {moduleObj.name}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onEdit(pkg)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(pkg)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ModulesManagement() {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [packages, setPackages] = useState<ModulePackage[]>(initialPackages);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [mainTab, setMainTab] = useState<string>("modules");

  // Module edit state
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isEditModuleDialogOpen, setIsEditModuleDialogOpen] = useState(false);

  // Package state
  const [editingPackage, setEditingPackage] = useState<ModulePackage | null>(
    null,
  );
  const [isEditPackageDialogOpen, setIsEditPackageDialogOpen] = useState(false);
  const [isCreatePackageDialogOpen, setIsCreatePackageDialogOpen] =
    useState(false);
  const [newPackage, setNewPackage] = useState<ModulePackage | null>(null);

  // Module handlers
  const handleEditModule = (module: Module) => {
    setEditingModule({ ...module });
    setIsEditModuleDialogOpen(true);
  };

  const handleSaveModuleEdit = () => {
    if (!editingModule) return;
    setModules((prev) =>
      prev.map((m) =>
        m.id === editingModule.id
          ? { ...editingModule, updatedAt: new Date().toISOString() }
          : m,
      ),
    );
    setIsEditModuleDialogOpen(false);
    setEditingModule(null);
  };

  const handleToggleModule = (module: Module) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === module.id
          ? { ...m, isActive: !m.isActive, updatedAt: new Date().toISOString() }
          : m,
      ),
    );
  };

  const updateEditingModule = (updates: Partial<Module>) => {
    if (!editingModule) return;
    setEditingModule({ ...editingModule, ...updates });
  };

  const updateModulePricing = (
    field: keyof Module["pricing"],
    value: number,
  ) => {
    if (!editingModule) return;
    setEditingModule({
      ...editingModule,
      pricing: { ...editingModule.pricing, [field]: value },
    });
  };

  // Package handlers
  const handleEditPackage = (pkg: ModulePackage) => {
    setEditingPackage({ ...pkg });
    setIsEditPackageDialogOpen(true);
  };

  const handleSavePackageEdit = () => {
    if (!editingPackage) return;
    setPackages((prev) =>
      prev.map((p) =>
        p.id === editingPackage.id
          ? { ...editingPackage, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
    setIsEditPackageDialogOpen(false);
    setEditingPackage(null);
  };

  const handleDeletePackage = (pkg: ModulePackage) => {
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
  };

  const handleCreatePackage = () => {
    const defaultPackage: ModulePackage = {
      id: `pkg-${Date.now()}`,
      name: "",
      description: "",
      modules: [],
      discount: 0,
      pricing: {
        monthly: 0,
        quarterly: 0,
        yearly: 0,
        currency: "USD",
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNewPackage(defaultPackage);
    setIsCreatePackageDialogOpen(true);
  };

  const handleSaveCreatePackage = () => {
    if (!newPackage || !newPackage.name.trim()) return;
    setPackages((prev) => [...prev, newPackage]);
    setIsCreatePackageDialogOpen(false);
    setNewPackage(null);
  };

  const updateEditingPackage = (updates: Partial<ModulePackage>) => {
    if (!editingPackage) return;
    setEditingPackage({ ...editingPackage, ...updates });
  };

  const updateEditingPackagePricing = (
    field: keyof ModulePackage["pricing"],
    value: number,
  ) => {
    if (!editingPackage) return;
    setEditingPackage({
      ...editingPackage,
      pricing: { ...editingPackage.pricing, [field]: value },
    });
  };

  const updateNewPackage = (updates: Partial<ModulePackage>) => {
    if (!newPackage) return;
    setNewPackage({ ...newPackage, ...updates });
  };

  const updateNewPackagePricing = (
    field: keyof ModulePackage["pricing"],
    value: number,
  ) => {
    if (!newPackage) return;
    setNewPackage({
      ...newPackage,
      pricing: { ...newPackage.pricing, [field]: value },
    });
  };

  const coreModules = modules.filter((m) => m.category === "core");
  const advancedModules = modules.filter((m) => m.category === "advanced");
  const premiumModules = modules.filter((m) => m.category === "premium");
  const addonModules = modules.filter((m) => m.category === "addon");

  const getModulesToDisplay = () => {
    switch (selectedCategory) {
      case "core":
        return coreModules;
      case "advanced":
        return advancedModules;
      case "premium":
        return premiumModules;
      case "addon":
        return addonModules;
      default:
        return modules;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Module Management</h2>
          <p className="text-muted-foreground">
            Configure available modules and packages for facilities
          </p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-6">
          <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
            <TabsList>
              <TabsTrigger value="all">
                All Modules ({modules.length})
              </TabsTrigger>
              <TabsTrigger value="core">
                Core ({coreModules.length})
              </TabsTrigger>
              <TabsTrigger value="advanced">
                Advanced ({advancedModules.length})
              </TabsTrigger>
              <TabsTrigger value="premium">
                Premium ({premiumModules.length})
              </TabsTrigger>
              {addonModules.length > 0 && (
                <TabsTrigger value="addon">
                  Add-ons ({addonModules.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getModulesToDisplay().map((module) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    onEdit={handleEditModule}
                    onToggle={handleToggleModule}
                    allModules={modules}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreatePackage}>
                <Plus className="h-4 w-4 mr-2" />
                Create Package
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onEdit={handleEditPackage}
                  onDelete={handleDeletePackage}
                  allModules={modules}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Module Dialog */}
      <Dialog
        open={isEditModuleDialogOpen}
        onOpenChange={setIsEditModuleDialogOpen}
      >
        <DialogContent className="min-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Modify the module details, pricing, and features.
            </DialogDescription>
          </DialogHeader>

          {editingModule && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="module-name">Name</Label>
                  <Input
                    id="module-name"
                    value={editingModule.name}
                    onChange={(e) =>
                      updateEditingModule({ name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-slug">Slug</Label>
                  <Input
                    id="module-slug"
                    value={editingModule.slug}
                    onChange={(e) =>
                      updateEditingModule({ slug: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="module-description">Description</Label>
                <Textarea
                  id="module-description"
                  value={editingModule.description}
                  onChange={(e) =>
                    updateEditingModule({ description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="module-category">Category</Label>
                  <Select
                    value={editingModule.category}
                    onValueChange={(value) =>
                      updateEditingModule({
                        category: value as Module["category"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="addon">Add-on</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-tier">Required Tier</Label>
                  <Select
                    value={editingModule.requiredTier}
                    onValueChange={(value) =>
                      updateEditingModule({
                        requiredTier: value as Module["requiredTier"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="beginner">Beginner+</SelectItem>
                      <SelectItem value="pro">Pro+</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-icon">Icon</Label>
                  <Select
                    value={editingModule.icon}
                    onValueChange={(value) =>
                      updateEditingModule({ icon: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Pricing (USD)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="module-monthly">Monthly</Label>
                    <Input
                      id="module-monthly"
                      type="number"
                      value={editingModule.pricing.monthly}
                      onChange={(e) =>
                        updateModulePricing("monthly", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="module-quarterly">Quarterly</Label>
                    <Input
                      id="module-quarterly"
                      type="number"
                      value={editingModule.pricing.quarterly}
                      onChange={(e) =>
                        updateModulePricing("quarterly", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="module-yearly">Yearly</Label>
                    <Input
                      id="module-yearly"
                      type="number"
                      value={editingModule.pricing.yearly}
                      onChange={(e) =>
                        updateModulePricing("yearly", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="module-isActive"
                    checked={editingModule.isActive}
                    onCheckedChange={(checked) =>
                      updateEditingModule({ isActive: checked })
                    }
                  />
                  <Label htmlFor="module-isActive">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="module-isStandalone"
                    checked={editingModule.isStandalone}
                    onCheckedChange={(checked) =>
                      updateEditingModule({ isStandalone: checked })
                    }
                  />
                  <Label htmlFor="module-isStandalone">Standalone</Label>
                </div>
              </div>

              {/* Dependencies */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Dependencies</Label>
                <div className="grid grid-cols-2 gap-2">
                  {modules
                    .filter((m) => m.id !== editingModule.id)
                    .map((module) => (
                      <div
                        key={module.id}
                        className="flex items-center gap-2 p-2 border rounded-lg"
                      >
                        <Checkbox
                          id={`dep-${module.id}`}
                          checked={editingModule.dependencies.includes(
                            module.id,
                          )}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateEditingModule({
                                dependencies: [
                                  ...editingModule.dependencies,
                                  module.id,
                                ],
                              });
                            } else {
                              updateEditingModule({
                                dependencies: editingModule.dependencies.filter(
                                  (id) => id !== module.id,
                                ),
                              });
                            }
                          }}
                        />
                        <Label
                          htmlFor={`dep-${module.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {module.name}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <Label htmlFor="module-features">Features (one per line)</Label>
                <Textarea
                  id="module-features"
                  className="min-h-[120px]"
                  value={editingModule.features.join("\n")}
                  onChange={(e) =>
                    updateEditingModule({
                      features: e.target.value
                        .split("\n")
                        .filter((f) => f.trim()),
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModuleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveModuleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog
        open={isEditPackageDialogOpen}
        onOpenChange={setIsEditPackageDialogOpen}
      >
        <DialogContent className="min-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Modify the package details, pricing, and included modules.
            </DialogDescription>
          </DialogHeader>

          {editingPackage && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pkg-name">Name</Label>
                  <Input
                    id="pkg-name"
                    value={editingPackage.name}
                    onChange={(e) =>
                      updateEditingPackage({ name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-discount">Discount (%)</Label>
                  <Input
                    id="pkg-discount"
                    type="number"
                    value={editingPackage.discount}
                    onChange={(e) =>
                      updateEditingPackage({ discount: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pkg-description">Description</Label>
                <Textarea
                  id="pkg-description"
                  value={editingPackage.description}
                  onChange={(e) =>
                    updateEditingPackage({ description: e.target.value })
                  }
                />
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Pricing (USD)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pkg-monthly">Monthly</Label>
                    <Input
                      id="pkg-monthly"
                      type="number"
                      value={editingPackage.pricing.monthly}
                      onChange={(e) =>
                        updateEditingPackagePricing(
                          "monthly",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-quarterly">Quarterly</Label>
                    <Input
                      id="pkg-quarterly"
                      type="number"
                      value={editingPackage.pricing.quarterly}
                      onChange={(e) =>
                        updateEditingPackagePricing(
                          "quarterly",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-yearly">Yearly</Label>
                    <Input
                      id="pkg-yearly"
                      type="number"
                      value={editingPackage.pricing.yearly}
                      onChange={(e) =>
                        updateEditingPackagePricing(
                          "yearly",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <Switch
                  id="pkg-isActive"
                  checked={editingPackage.isActive}
                  onCheckedChange={(checked) =>
                    updateEditingPackage({ isActive: checked })
                  }
                />
                <Label htmlFor="pkg-isActive">Active</Label>
              </div>

              {/* Included Modules */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Included Modules
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center gap-2 p-2 border rounded-lg"
                    >
                      <Checkbox
                        id={`pkg-module-${module.id}`}
                        checked={editingPackage.modules.includes(module.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateEditingPackage({
                              modules: [...editingPackage.modules, module.id],
                            });
                          } else {
                            updateEditingPackage({
                              modules: editingPackage.modules.filter(
                                (id) => id !== module.id,
                              ),
                            });
                          }
                        }}
                      />
                      <Label
                        htmlFor={`pkg-module-${module.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {module.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditPackageDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePackageEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Package Dialog */}
      <Dialog
        open={isCreatePackageDialogOpen}
        onOpenChange={setIsCreatePackageDialogOpen}
      >
        <DialogContent className="min-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Package</DialogTitle>
            <DialogDescription>
              Create a new module package with pricing and included modules.
            </DialogDescription>
          </DialogHeader>

          {newPackage && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pkg-name">Name</Label>
                  <Input
                    id="new-pkg-name"
                    value={newPackage.name}
                    onChange={(e) => updateNewPackage({ name: e.target.value })}
                    placeholder="Enter package name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pkg-discount">Discount (%)</Label>
                  <Input
                    id="new-pkg-discount"
                    type="number"
                    value={newPackage.discount}
                    onChange={(e) =>
                      updateNewPackage({ discount: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pkg-description">Description</Label>
                <Textarea
                  id="new-pkg-description"
                  value={newPackage.description}
                  onChange={(e) =>
                    updateNewPackage({ description: e.target.value })
                  }
                  placeholder="Enter package description"
                />
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Pricing (USD)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-pkg-monthly">Monthly</Label>
                    <Input
                      id="new-pkg-monthly"
                      type="number"
                      value={newPackage.pricing.monthly}
                      onChange={(e) =>
                        updateNewPackagePricing(
                          "monthly",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-pkg-quarterly">Quarterly</Label>
                    <Input
                      id="new-pkg-quarterly"
                      type="number"
                      value={newPackage.pricing.quarterly}
                      onChange={(e) =>
                        updateNewPackagePricing(
                          "quarterly",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-pkg-yearly">Yearly</Label>
                    <Input
                      id="new-pkg-yearly"
                      type="number"
                      value={newPackage.pricing.yearly}
                      onChange={(e) =>
                        updateNewPackagePricing(
                          "yearly",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <Switch
                  id="new-pkg-isActive"
                  checked={newPackage.isActive}
                  onCheckedChange={(checked) =>
                    updateNewPackage({ isActive: checked })
                  }
                />
                <Label htmlFor="new-pkg-isActive">Active</Label>
              </div>

              {/* Included Modules */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Included Modules
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center gap-2 p-2 border rounded-lg"
                    >
                      <Checkbox
                        id={`new-pkg-module-${module.id}`}
                        checked={newPackage.modules.includes(module.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateNewPackage({
                              modules: [...newPackage.modules, module.id],
                            });
                          } else {
                            updateNewPackage({
                              modules: newPackage.modules.filter(
                                (id) => id !== module.id,
                              ),
                            });
                          }
                        }}
                      />
                      <Label
                        htmlFor={`new-pkg-module-${module.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {module.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreatePackageDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCreatePackage}
              disabled={!newPackage?.name.trim()}
            >
              Create Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
