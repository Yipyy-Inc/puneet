"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  Plus,
  Pencil,
  Trash2,
  Droplets,
  Car,
  DoorOpen,
  Wrench,
  TreePine,
  Box,
} from "lucide-react";
import { useCustomServices } from "@/hooks/use-custom-services";
import type { FacilityResource } from "@/lib/types";

const RESOURCE_TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  room: DoorOpen,
  pool: Droplets,
  van: Car,
  equipment: Wrench,
  yard: TreePine,
  other: Box,
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  room: "Room",
  pool: "Pool",
  van: "Van",
  equipment: "Equipment",
  yard: "Yard",
  other: "Other",
};

export default function ResourcesPage() {
  const { resources, addResource, updateResource, deleteResource } =
    useCustomServices();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] =
    useState<FacilityResource | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<FacilityResource["type"]>("room");
  const [formCapacity, setFormCapacity] = useState(1);
  const [formAvailable, setFormAvailable] = useState(true);
  const [formDescription, setFormDescription] = useState("");

  const openCreateModal = () => {
    setEditingResource(null);
    setFormName("");
    setFormType("room");
    setFormCapacity(1);
    setFormAvailable(true);
    setFormDescription("");
    setModalOpen(true);
  };

  const openEditModal = (resource: FacilityResource) => {
    setEditingResource(resource);
    setFormName(resource.name);
    setFormType(resource.type);
    setFormCapacity(resource.capacity);
    setFormAvailable(resource.isAvailable);
    setFormDescription(resource.description ?? "");
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    if (editingResource) {
      updateResource(editingResource.id, {
        name: formName,
        type: formType,
        capacity: formCapacity,
        isAvailable: formAvailable,
        description: formDescription,
      });
    } else {
      addResource({
        id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        facilityId: 11,
        name: formName,
        type: formType,
        capacity: formCapacity,
        isAvailable: formAvailable,
        description: formDescription,
      });
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteResource(deletingId);
      setDeleteModalOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Facility Resources
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage rooms, pools, vans, equipment, and other resources used by
            services
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 size-4" />
          Add Resource
        </Button>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              <Box className="text-primary h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">No resources yet</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm/relaxed">
              Resources are rooms, pools, vans, or equipment that get assigned
              to custom services. When a service is booked, its resource is
              automatically blocked.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                <Droplets className="h-3 w-3" /> Pool
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                <Car className="h-3 w-3" /> Van
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                <DoorOpen className="h-3 w-3" /> Room
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                <Wrench className="h-3 w-3" /> Equipment
              </span>
            </div>
            <Button onClick={openCreateModal} className="mt-5">
              <Plus className="mr-2 size-4" />
              Add First Resource
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const Icon = RESOURCE_TYPE_ICONS[resource.type] ?? Box;
            return (
              <Card key={resource.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <Icon className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {resource.name}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(resource)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(resource.id);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="font-medium">{resource.capacity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant={
                          resource.isAvailable ? "default" : "destructive"
                        }
                      >
                        {resource.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                    {resource.description && (
                      <p className="text-muted-foreground border-t pt-2">
                        {resource.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type="confirmation"
        title={editingResource ? "Edit Resource" : "Add Resource"}
        description={
          editingResource
            ? "Update this resource's details."
            : "Add a new resource that can be assigned to custom services."
        }
        actions={{
          primary: {
            label: editingResource ? "Save Changes" : "Add Resource",
            onClick: handleSave,
            disabled: !formName.trim(),
          },
          secondary: {
            label: "Cancel",
            onClick: () => setModalOpen(false),
            variant: "outline",
          },
        }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Main Pool, Van #1, Party Room"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formType}
              onValueChange={(v) => setFormType(v as FacilityResource["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={formCapacity}
              onChange={(e) => setFormCapacity(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Available</Label>
            <Switch
              checked={formAvailable}
              onCheckedChange={setFormAvailable}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of this resource..."
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        type="warning"
        title="Delete Resource"
        description="Are you sure you want to delete this resource? This action cannot be undone."
        actions={{
          primary: {
            label: "Delete",
            onClick: handleDelete,
            variant: "destructive",
          },
          secondary: {
            label: "Cancel",
            onClick: () => setDeleteModalOpen(false),
            variant: "outline",
          },
        }}
      >
        <p className="text-muted-foreground text-sm">
          Any services assigned to this resource will need to be updated.
        </p>
      </Modal>
    </div>
  );
}
