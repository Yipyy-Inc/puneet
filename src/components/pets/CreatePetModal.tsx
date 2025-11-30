"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";

interface Client {
  id: number;
  name: string;
  email: string;
}

interface CreatePetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newPet: {
    name: string;
    type: string;
    breed: string;
    age: number;
    weight: number;
    color: string;
    microchip: string;
    allergies: string;
    specialNeeds: string;
    ownerId: number;
  }) => void;
  clients: Client[];
}

export function CreatePetModal({
  open,
  onOpenChange,
  onSave,
  clients,
}: CreatePetModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "Dog",
    breed: "",
    age: 0,
    weight: 0,
    color: "",
    microchip: "",
    allergies: "None",
    specialNeeds: "None",
    ownerId: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    breed: "",
    ownerId: "",
  });

  const validateForm = () => {
    const newErrors = {
      name: "",
      breed: "",
      ownerId: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Pet name is required";
    }

    if (!formData.breed.trim()) {
      newErrors.breed = "Breed is required";
    }

    if (!formData.ownerId) {
      newErrors.ownerId = "Please select an owner";
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.breed && !newErrors.ownerId;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const newPet = {
      name: formData.name.trim(),
      type: formData.type,
      breed: formData.breed.trim(),
      age: formData.age,
      weight: formData.weight,
      color: formData.color.trim(),
      microchip: formData.microchip.trim(),
      allergies: formData.allergies.trim() || "None",
      specialNeeds: formData.specialNeeds.trim() || "None",
      ownerId: parseInt(formData.ownerId),
    };

    onSave(newPet);
    onOpenChange(false);

    // Reset form
    setFormData({
      name: "",
      type: "Dog",
      breed: "",
      age: 0,
      weight: 0,
      color: "",
      microchip: "",
      allergies: "None",
      specialNeeds: "None",
      ownerId: "",
    });
    setErrors({
      name: "",
      breed: "",
      ownerId: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Pet
          </DialogTitle>
          <DialogDescription>Add a new pet to your facility</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Owner Selection */}
            <div className="grid gap-2">
              <Label htmlFor="owner">
                Owner <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.ownerId}
                onValueChange={(value) => {
                  setFormData({ ...formData, ownerId: value });
                  if (errors.ownerId) setErrors({ ...errors, ownerId: "" });
                }}
              >
                <SelectTrigger aria-invalid={!!errors.ownerId}>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ownerId && (
                <p className="text-sm text-destructive">{errors.ownerId}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Pet Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  placeholder="Buddy"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">Dog</SelectItem>
                    <SelectItem value="Cat">Cat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="breed">
                  Breed <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => {
                    setFormData({ ...formData, breed: e.target.value });
                    if (errors.breed) setErrors({ ...errors, breed: "" });
                  }}
                  placeholder="Golden Retriever"
                  aria-invalid={!!errors.breed}
                />
                {errors.breed && (
                  <p className="text-sm text-destructive">{errors.breed}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      age: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="3"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weight: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="25"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="Golden"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="microchip">Microchip Number</Label>
              <Input
                id="microchip"
                value={formData.microchip}
                onChange={(e) =>
                  setFormData({ ...formData, microchip: e.target.value })
                }
                placeholder="123456789"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                value={formData.allergies}
                onChange={(e) =>
                  setFormData({ ...formData, allergies: e.target.value })
                }
                placeholder="None"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="specialNeeds">Special Needs</Label>
              <Textarea
                id="specialNeeds"
                value={formData.specialNeeds}
                onChange={(e) =>
                  setFormData({ ...formData, specialNeeds: e.target.value })
                }
                placeholder="None"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Add Pet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
