"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Package,
  DollarSign,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Switch } from "@/components/ui/switch";
import { trainingPackages, type TrainingPackage } from "@/data/training";

type TrainingPackageWithRecord = TrainingPackage & Record<string, unknown>;

export default function PackagesPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TrainingPackage | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    classType: "group" as "group" | "private",
    skillLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    sessions: 6,
    price: 160,
    validityDays: 90,
    isActive: true,
    popular: false,
    includes: [] as string[],
  });

  const [newInclude, setNewInclude] = useState("");

  const handleAddNew = () => {
    setEditingPackage(null);
    setFormData({
      name: "",
      description: "",
      classType: "group",
      skillLevel: "beginner",
      sessions: 6,
      price: 160,
      validityDays: 90,
      isActive: true,
      popular: false,
      includes: [],
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (pkg: TrainingPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      classType: pkg.classType,
      skillLevel: pkg.skillLevel,
      sessions: pkg.sessions,
      price: pkg.price,
      validityDays: pkg.validityDays,
      isActive: pkg.isActive,
      popular: pkg.popular || false,
      includes: [...pkg.includes],
    });
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsAddEditModalOpen(false);
  };

  const handleAddInclude = () => {
    if (newInclude.trim()) {
      setFormData({
        ...formData,
        includes: [...formData.includes, newInclude.trim()],
      });
      setNewInclude("");
    }
  };

  const handleRemoveInclude = (index: number) => {
    setFormData({
      ...formData,
      includes: formData.includes.filter((_, i) => i !== index),
    });
  };

  const getSkillLevelVariant = (level: string) => {
    switch (level) {
      case "beginner":
        return "default";
      case "intermediate":
        return "secondary";
      case "advanced":
        return "destructive";
      default:
        return "outline";
    }
  };

  const columns: ColumnDef<TrainingPackageWithRecord>[] = [
    {
      key: "name",
      label: "Package Name",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {item.popular && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 fill-current" />
              Popular
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "sessions",
      label: "Sessions",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => `${item.sessions} sessions`,
    },
    {
      key: "price",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => `$${item.price}`,
    },
    {
      key: "skillLevel",
      label: "Level",
      defaultVisible: true,
      render: (item) => (
        <Badge variant={getSkillLevelVariant(item.skillLevel as string)}>
          {(item.skillLevel as string).charAt(0).toUpperCase() +
            (item.skillLevel as string).slice(1)}
        </Badge>
      ),
    },
    {
      key: "classType",
      label: "Type",
      defaultVisible: true,
      render: (item) => (
        <Badge variant="outline">
          {item.classType === "group" ? "Group" : "Private"}
        </Badge>
      ),
    },
    {
      key: "validityDays",
      label: "Validity",
      icon: Clock,
      defaultVisible: true,
      render: (item) => `${item.validityDays} days`,
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Badge variant={item.isActive ? "default" : "secondary"}>
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "skillLevel",
      label: "Level",
      options: [
        { value: "all", label: "All Levels" },
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
      ],
    },
    {
      key: "classType",
      label: "Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "group", label: "Group" },
        { value: "private", label: "Private" },
      ],
    },
  ];

  const activePackages = trainingPackages.filter((p) => p.isActive);
  const totalValue = activePackages.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Packages
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainingPackages.length}</div>
            <p className="text-xs text-muted-foreground">
              {activePackages.length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Range</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.min(...activePackages.map((p) => p.price))} - $
              {Math.max(...activePackages.map((p) => p.price))}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: ${Math.round(totalValue / activePackages.length)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Popular Packages
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trainingPackages.filter((p) => p.popular).length}
            </div>
            <p className="text-xs text-muted-foreground">Marked as popular</p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            <Package className="h-4 w-4 mr-2" />
            Card View
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <Users className="h-4 w-4 mr-2" />
            List View
          </Button>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Package
        </Button>
      </div>

      {/* Card View */}
      {viewMode === "cards" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trainingPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative ${!pkg.isActive ? "opacity-60" : ""}`}
            >
              {pkg.popular && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                    <Star className="h-3 w-3 fill-current" />
                    Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pkg.description}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(pkg)}>
                        Edit Package
                      </DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        {pkg.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={getSkillLevelVariant(pkg.skillLevel)}>
                    {pkg.skillLevel.charAt(0).toUpperCase() +
                      pkg.skillLevel.slice(1)}
                  </Badge>
                  <Badge variant="outline">
                    {pkg.classType === "group" ? "Group" : "Private"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {pkg.sessions} sessions
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {pkg.validityDays} days
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Includes:</span>
                  <ul className="text-sm space-y-1">
                    {pkg.includes.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                    {pkg.includes.length > 3 && (
                      <li className="text-muted-foreground text-xs">
                        +{pkg.includes.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-2xl font-bold">${pkg.price}</span>
                  <Badge variant={pkg.isActive ? "default" : "secondary"}>
                    {pkg.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <DataTable
          data={trainingPackages as TrainingPackageWithRecord[]}
          columns={columns}
          filters={filters}
          searchKey="name"
          searchPlaceholder="Search packages..."
          actions={(item) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleEdit(item as TrainingPackage)}
                >
                  Edit Package
                </DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  {item.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {/* Add/Edit Package Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Add New Package"}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Update the package details below."
                : "Fill in the details to create a new training package."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Package Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Puppy Starter Pack"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the package..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="classType">Class Type</Label>
                <Select
                  value={formData.classType}
                  onValueChange={(value: "group" | "private") =>
                    setFormData({ ...formData, classType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select
                  value={formData.skillLevel}
                  onValueChange={(
                    value: "beginner" | "intermediate" | "advanced",
                  ) => setFormData({ ...formData, skillLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sessions">Sessions</Label>
                <Input
                  id="sessions"
                  type="number"
                  min={1}
                  value={formData.sessions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sessions: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="validityDays">Validity (days)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min={1}
                  value={formData.validityDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      validityDays: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>What&apos;s Included</Label>
              <div className="flex gap-2">
                <Input
                  value={newInclude}
                  onChange={(e) => setNewInclude(e.target.value)}
                  placeholder="e.g., Training manual"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInclude();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddInclude}>
                  Add
                </Button>
              </div>
              {formData.includes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {formData.includes.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {item}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveInclude(idx)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="popular"
                  checked={formData.popular}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, popular: checked })
                  }
                />
                <Label htmlFor="popular">Mark as Popular</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPackage ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
