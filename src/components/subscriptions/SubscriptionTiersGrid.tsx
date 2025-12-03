"use client";

import { useState } from "react";
import { SubscriptionTier, subscriptionTiers } from "@/data/subscription-tiers";
import { modules } from "@/data/modules";
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
  Check,
  Edit,
  Plus,
  Trash2,
  Users,
  Calendar,
  HardDrive,
  MapPin,
  Blocks,
} from "lucide-react";

interface TierCardProps {
  tier: SubscriptionTier;
  onEdit: (tier: SubscriptionTier) => void;
  onDelete: (tier: SubscriptionTier) => void;
}

function TierCard({ tier, onEdit, onDelete }: TierCardProps) {
  const getTierColor = (type: string) => {
    switch (type) {
      case "beginner":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "pro":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "enterprise":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "custom":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const formatLimit = (value: number) => {
    return value === -1 ? "Unlimited" : value.toLocaleString();
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{tier.name}</CardTitle>
            <CardDescription>{tier.description}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`capitalize ${getTierColor(tier.type)}`}
          >
            {tier.type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pricing */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground">
            Pricing
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-2xl font-bold">${tier.pricing.monthly}</p>
              <p className="text-xs text-muted-foreground">/ month</p>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-2xl font-bold">${tier.pricing.quarterly}</p>
              <p className="text-xs text-muted-foreground">/ quarter</p>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-2xl font-bold">${tier.pricing.yearly}</p>
              <p className="text-xs text-muted-foreground">/ year</p>
            </div>
          </div>
        </div>

        {/* Limitations */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground">
            Limitations
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Users</p>
                <p className="text-sm font-medium">
                  {formatLimit(tier.limitations.maxUsers)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reservations</p>
                <p className="text-sm font-medium">
                  {formatLimit(tier.limitations.maxReservations)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Storage</p>
                <p className="text-sm font-medium">
                  {formatLimit(tier.limitations.storageGB)} GB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Locations</p>
                <p className="text-sm font-medium">
                  {formatLimit(tier.limitations.maxLocations)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Included Modules */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
            <Blocks className="h-4 w-4" />
            Modules ({tier.availableModules.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {tier.availableModules.map((moduleId) => {
              const moduleObj = modules.find((m) => m.id === moduleId);
              return moduleObj ? (
                <Badge key={moduleId} variant="secondary" className="text-xs">
                  {moduleObj.name}
                </Badge>
              ) : null;
            })}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground">
            Features ({tier.features.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {tier.features.slice(0, 5).map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm">{feature}</p>
              </div>
            ))}
            {tier.features.length > 5 && (
              <p className="text-xs text-muted-foreground pl-6">
                + {tier.features.length - 5} more features
              </p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge variant={tier.isActive ? "default" : "secondary"}>
            {tier.isActive ? "Active" : "Inactive"}
          </Badge>
          {tier.isCustomizable && <Badge variant="outline">Customizable</Badge>}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onEdit(tier)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(tier)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SubscriptionTiersGrid() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>(subscriptionTiers);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTier, setNewTier] = useState<SubscriptionTier | null>(null);

  const handleEdit = (tier: SubscriptionTier) => {
    setEditingTier({ ...tier });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTier) return;
    setTiers((prev) =>
      prev.map((t) =>
        t.id === editingTier.id
          ? { ...editingTier, updatedAt: new Date().toISOString() }
          : t,
      ),
    );
    setIsEditDialogOpen(false);
    setEditingTier(null);
  };

  const handleDelete = (tier: SubscriptionTier) => {
    console.log("Delete tier:", tier);
    // TODO: Open delete confirmation
  };

  const handleCreate = () => {
    const defaultTier: SubscriptionTier = {
      id: `tier-${Date.now()}`,
      name: "",
      type: "beginner",
      description: "",
      pricing: {
        monthly: 0,
        quarterly: 0,
        yearly: 0,
        currency: "USD",
      },
      features: [],
      limitations: {
        maxUsers: 5,
        maxReservations: 100,
        storageGB: 5,
        maxLocations: 1,
        maxClients: 50,
      },
      availableModules: ["module-booking", "module-customer-management"],
      isActive: true,
      isCustomizable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNewTier(defaultTier);
    setIsCreateDialogOpen(true);
  };

  const handleSaveCreate = () => {
    if (!newTier || !newTier.name.trim()) return;
    setTiers((prev) => [...prev, newTier]);
    setIsCreateDialogOpen(false);
    setNewTier(null);
  };

  const updateNewTier = (updates: Partial<SubscriptionTier>) => {
    if (!newTier) return;
    setNewTier({ ...newTier, ...updates });
  };

  const updateNewTierPricing = (
    field: keyof SubscriptionTier["pricing"],
    value: number,
  ) => {
    if (!newTier) return;
    setNewTier({
      ...newTier,
      pricing: { ...newTier.pricing, [field]: value },
    });
  };

  const updateNewTierLimitations = (
    field: keyof SubscriptionTier["limitations"],
    value: number,
  ) => {
    if (!newTier) return;
    setNewTier({
      ...newTier,
      limitations: { ...newTier.limitations, [field]: value },
    });
  };

  const updateEditingTier = (updates: Partial<SubscriptionTier>) => {
    if (!editingTier) return;
    setEditingTier({ ...editingTier, ...updates });
  };

  const updatePricing = (
    field: keyof SubscriptionTier["pricing"],
    value: number,
  ) => {
    if (!editingTier) return;
    setEditingTier({
      ...editingTier,
      pricing: { ...editingTier.pricing, [field]: value },
    });
  };

  const updateLimitations = (
    field: keyof SubscriptionTier["limitations"],
    value: number,
  ) => {
    if (!editingTier) return;
    setEditingTier({
      ...editingTier,
      limitations: { ...editingTier.limitations, [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscription Tiers</h2>
          <p className="text-muted-foreground">
            Manage and configure subscription tiers
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Edit Tier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="min-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subscription Tier</DialogTitle>
            <DialogDescription>
              Modify the tier details, pricing, and limitations.
            </DialogDescription>
          </DialogHeader>

          {editingTier && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editingTier.name}
                    onChange={(e) =>
                      updateEditingTier({ name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={editingTier.type}
                    onValueChange={(value) =>
                      updateEditingTier({
                        type: value as SubscriptionTier["type"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingTier.description}
                  onChange={(e) =>
                    updateEditingTier({ description: e.target.value })
                  }
                />
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Pricing (USD)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly">Monthly</Label>
                    <Input
                      id="monthly"
                      type="number"
                      value={editingTier.pricing.monthly}
                      onChange={(e) =>
                        updatePricing("monthly", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quarterly">Quarterly</Label>
                    <Input
                      id="quarterly"
                      type="number"
                      value={editingTier.pricing.quarterly}
                      onChange={(e) =>
                        updatePricing("quarterly", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearly">Yearly</Label>
                    <Input
                      id="yearly"
                      type="number"
                      value={editingTier.pricing.yearly}
                      onChange={(e) =>
                        updatePricing("yearly", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Limitations */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Limitations (-1 for unlimited)
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxUsers">Max Users</Label>
                    <Input
                      id="maxUsers"
                      type="number"
                      value={editingTier.limitations.maxUsers}
                      onChange={(e) =>
                        updateLimitations("maxUsers", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxReservations">Max Reservations</Label>
                    <Input
                      id="maxReservations"
                      type="number"
                      value={editingTier.limitations.maxReservations}
                      onChange={(e) =>
                        updateLimitations(
                          "maxReservations",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storageGB">Storage (GB)</Label>
                    <Input
                      id="storageGB"
                      type="number"
                      value={editingTier.limitations.storageGB}
                      onChange={(e) =>
                        updateLimitations("storageGB", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLocations">Max Locations</Label>
                    <Input
                      id="maxLocations"
                      type="number"
                      value={editingTier.limitations.maxLocations}
                      onChange={(e) =>
                        updateLimitations(
                          "maxLocations",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxClients">Max Clients</Label>
                    <Input
                      id="maxClients"
                      type="number"
                      value={editingTier.limitations.maxClients}
                      onChange={(e) =>
                        updateLimitations("maxClients", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={editingTier.isActive}
                    onCheckedChange={(checked) =>
                      updateEditingTier({ isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isCustomizable"
                    checked={editingTier.isCustomizable}
                    onCheckedChange={(checked) =>
                      updateEditingTier({ isCustomizable: checked })
                    }
                  />
                  <Label htmlFor="isCustomizable">Customizable</Label>
                </div>
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
                        id={`module-${module.id}`}
                        checked={editingTier.availableModules.includes(
                          module.id,
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateEditingTier({
                              availableModules: [
                                ...editingTier.availableModules,
                                module.id,
                              ],
                            });
                          } else {
                            updateEditingTier({
                              availableModules:
                                editingTier.availableModules.filter(
                                  (id) => id !== module.id,
                                ),
                            });
                          }
                        }}
                      />
                      <Label
                        htmlFor={`module-${module.id}`}
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
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  className="min-h-[120px]"
                  value={editingTier.features.join("\n")}
                  onChange={(e) =>
                    updateEditingTier({
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
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tier Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="min-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Subscription Tier</DialogTitle>
            <DialogDescription>
              Create a new subscription tier with pricing and limitations.
            </DialogDescription>
          </DialogHeader>

          {newTier && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Name</Label>
                  <Input
                    id="create-name"
                    value={newTier.name}
                    onChange={(e) => updateNewTier({ name: e.target.value })}
                    placeholder="Enter tier name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-type">Type</Label>
                  <Select
                    value={newTier.type}
                    onValueChange={(value) =>
                      updateNewTier({
                        type: value as SubscriptionTier["type"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={newTier.description}
                  onChange={(e) =>
                    updateNewTier({ description: e.target.value })
                  }
                  placeholder="Enter tier description"
                />
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Pricing (USD)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-monthly">Monthly</Label>
                    <Input
                      id="create-monthly"
                      type="number"
                      value={newTier.pricing.monthly}
                      onChange={(e) =>
                        updateNewTierPricing("monthly", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-quarterly">Quarterly</Label>
                    <Input
                      id="create-quarterly"
                      type="number"
                      value={newTier.pricing.quarterly}
                      onChange={(e) =>
                        updateNewTierPricing(
                          "quarterly",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-yearly">Yearly</Label>
                    <Input
                      id="create-yearly"
                      type="number"
                      value={newTier.pricing.yearly}
                      onChange={(e) =>
                        updateNewTierPricing("yearly", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Limitations */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Limitations (-1 for unlimited)
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-maxUsers">Max Users</Label>
                    <Input
                      id="create-maxUsers"
                      type="number"
                      value={newTier.limitations.maxUsers}
                      onChange={(e) =>
                        updateNewTierLimitations(
                          "maxUsers",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-maxReservations">
                      Max Reservations
                    </Label>
                    <Input
                      id="create-maxReservations"
                      type="number"
                      value={newTier.limitations.maxReservations}
                      onChange={(e) =>
                        updateNewTierLimitations(
                          "maxReservations",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-storageGB">Storage (GB)</Label>
                    <Input
                      id="create-storageGB"
                      type="number"
                      value={newTier.limitations.storageGB}
                      onChange={(e) =>
                        updateNewTierLimitations(
                          "storageGB",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-maxLocations">Max Locations</Label>
                    <Input
                      id="create-maxLocations"
                      type="number"
                      value={newTier.limitations.maxLocations}
                      onChange={(e) =>
                        updateNewTierLimitations(
                          "maxLocations",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-maxClients">Max Clients</Label>
                    <Input
                      id="create-maxClients"
                      type="number"
                      value={newTier.limitations.maxClients}
                      onChange={(e) =>
                        updateNewTierLimitations(
                          "maxClients",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="create-isActive"
                    checked={newTier.isActive}
                    onCheckedChange={(checked) =>
                      updateNewTier({ isActive: checked })
                    }
                  />
                  <Label htmlFor="create-isActive">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="create-isCustomizable"
                    checked={newTier.isCustomizable}
                    onCheckedChange={(checked) =>
                      updateNewTier({ isCustomizable: checked })
                    }
                  />
                  <Label htmlFor="create-isCustomizable">Customizable</Label>
                </div>
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
                        id={`create-module-${module.id}`}
                        checked={newTier.availableModules.includes(module.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateNewTier({
                              availableModules: [
                                ...newTier.availableModules,
                                module.id,
                              ],
                            });
                          } else {
                            updateNewTier({
                              availableModules: newTier.availableModules.filter(
                                (id) => id !== module.id,
                              ),
                            });
                          }
                        }}
                      />
                      <Label
                        htmlFor={`create-module-${module.id}`}
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
                <Label htmlFor="create-features">Features (one per line)</Label>
                <Textarea
                  id="create-features"
                  className="min-h-[120px]"
                  value={newTier.features.join("\n")}
                  onChange={(e) =>
                    updateNewTier({
                      features: e.target.value
                        .split("\n")
                        .filter((f) => f.trim()),
                    })
                  }
                  placeholder="Enter features, one per line"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCreate} disabled={!newTier?.name.trim()}>
              Create Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
