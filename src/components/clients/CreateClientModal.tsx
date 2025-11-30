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
import { Plus, ChevronRight, ChevronLeft, User, Heart } from "lucide-react";

interface Pet {
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
}

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newClient: {
    name: string;
    email: string;
    phone?: string;
    status: string;
    facility: string;
    pets: Pet[];
  }) => void;
  facilityName: string;
}

export function CreateClientModal({
  open,
  onOpenChange,
  onSave,
  facilityName,
}: CreateClientModalProps) {
  const [step, setStep] = useState(1);
  const [clientData, setClientData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "active",
  });

  const [petData, setPetData] = useState<Pet>({
    name: "",
    type: "Dog",
    breed: "",
    age: 0,
    weight: 0,
    color: "",
    microchip: "",
    allergies: "None",
    specialNeeds: "None",
  });

  const [pets, setPets] = useState<Pet[]>([]);

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    petName: "",
    breed: "",
  });

  const validateClientData = () => {
    const newErrors = {
      name: "",
      email: "",
      petName: "",
      breed: "",
    };

    if (!clientData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!clientData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.email;
  };

  const validatePetData = () => {
    const newErrors = {
      name: "",
      email: "",
      petName: "",
      breed: "",
    };

    if (!petData.name.trim()) {
      newErrors.petName = "Pet name is required";
    }

    if (!petData.breed.trim()) {
      newErrors.breed = "Breed is required";
    }

    setErrors(newErrors);
    return !newErrors.petName && !newErrors.breed;
  };

  const handleNext = () => {
    if (step === 1 && validateClientData()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleAddPet = () => {
    if (validatePetData()) {
      setPets([...pets, petData]);
      // Reset pet form
      setPetData({
        name: "",
        type: "Dog",
        breed: "",
        age: 0,
        weight: 0,
        color: "",
        microchip: "",
        allergies: "None",
        specialNeeds: "None",
      });
      setErrors({ ...errors, petName: "", breed: "" });
    }
  };

  const handleRemovePet = (index: number) => {
    setPets(pets.filter((_, i) => i !== index));
  };

  const handleSkip = () => {
    handleSubmit();
  };

  const handleSubmit = () => {
    const newClient = {
      name: clientData.name.trim(),
      email: clientData.email.trim(),
      phone: clientData.phone.trim() || undefined,
      status: clientData.status,
      facility: facilityName,
      pets: pets,
    };

    onSave(newClient);
    onOpenChange(false);

    // Reset all forms
    setStep(1);
    setClientData({
      name: "",
      email: "",
      phone: "",
      status: "active",
    });
    setPetData({
      name: "",
      type: "Dog",
      breed: "",
      age: 0,
      weight: 0,
      color: "",
      microchip: "",
      allergies: "None",
      specialNeeds: "None",
    });
    setPets([]);
    setErrors({
      name: "",
      email: "",
      petName: "",
      breed: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Client - Step {step} of 2
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? `Add a new client to ${facilityName}`
              : "Add pets for this client (optional)"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Client Info</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            <Heart className="h-4 w-4" />
            <span className="text-sm font-medium">Pet Info</span>
          </div>
        </div>

        {/* Step 1: Client Information */}
        {step === 1 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={clientData.name}
                onChange={(e) => {
                  setClientData({ ...clientData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                placeholder="John Doe"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={clientData.email}
                onChange={(e) => {
                  setClientData({ ...clientData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                placeholder="john@example.com"
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={clientData.phone}
                onChange={(e) =>
                  setClientData({ ...clientData, phone: e.target.value })
                }
                placeholder="123-456-7890"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={clientData.status}
                onValueChange={(value) =>
                  setClientData({ ...clientData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Pet Information */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            {/* Added Pets List */}
            {pets.length > 0 && (
              <div className="space-y-2">
                <Label>Added Pets ({pets.length})</Label>
                <div className="space-y-2">
                  {pets.map((pet, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pet.type} • {pet.breed}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePet(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pet Form */}
            <div className="space-y-4 p-4 border rounded-lg">
              <Label className="text-base font-semibold">Add a Pet</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="petName">
                    Pet Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="petName"
                    value={petData.name}
                    onChange={(e) => {
                      setPetData({ ...petData, name: e.target.value });
                      if (errors.petName) setErrors({ ...errors, petName: "" });
                    }}
                    placeholder="Buddy"
                    aria-invalid={!!errors.petName}
                  />
                  {errors.petName && (
                    <p className="text-sm text-destructive">{errors.petName}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={petData.type}
                    onValueChange={(value) =>
                      setPetData({ ...petData, type: value })
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
                    value={petData.breed}
                    onChange={(e) => {
                      setPetData({ ...petData, breed: e.target.value });
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
                    value={petData.age}
                    onChange={(e) =>
                      setPetData({
                        ...petData,
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
                    value={petData.weight}
                    onChange={(e) =>
                      setPetData({
                        ...petData,
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
                    value={petData.color}
                    onChange={(e) =>
                      setPetData({ ...petData, color: e.target.value })
                    }
                    placeholder="Golden"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="microchip">Microchip Number</Label>
                <Input
                  id="microchip"
                  value={petData.microchip}
                  onChange={(e) =>
                    setPetData({ ...petData, microchip: e.target.value })
                  }
                  placeholder="123456789"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  value={petData.allergies}
                  onChange={(e) =>
                    setPetData({ ...petData, allergies: e.target.value })
                  }
                  placeholder="None"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="specialNeeds">Special Needs</Label>
                <Textarea
                  id="specialNeeds"
                  value={petData.specialNeeds}
                  onChange={(e) =>
                    setPetData({ ...petData, specialNeeds: e.target.value })
                  }
                  placeholder="None"
                  rows={2}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleAddPet}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Pet
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="button" variant="outline" onClick={handleSkip}>
                Skip & Create
              </Button>
              <Button type="button" onClick={handleSubmit}>
                <Plus className="mr-2 h-4 w-4" />
                Create Client
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
