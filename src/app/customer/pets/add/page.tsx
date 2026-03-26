"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Save, Loader2, Dog, Cat, Upload } from "lucide-react";
import { toast } from "sonner";
import { FormWizard } from "@/components/forms/FormWizard";

interface PetFormData {
  name: string;
  type: "Dog" | "Cat";
  breed: string;
  age: number | "";
  weight: number | "";
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
  imageUrl?: string;
}

export default function AddPetPage() {
  const router = useRouter();
  const { selectedFacility } = useCustomerFacility();
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWizard, setShowWizard] = useState(false);
  const [newPetId, setNewPetId] = useState<number | null>(null);

  const [formData, setFormData] = useState<PetFormData>({
    name: "",
    type: "Dog",
    breed: "",
    age: "",
    weight: "",
    color: "",
    microchip: "",
    allergies: "None",
    specialNeeds: "None",
    imageUrl: "",
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Pet name is required";
    }

    if (!formData.breed.trim()) {
      newErrors.breed = "Breed is required";
    }

    if (formData.age === "" || formData.age < 0) {
      newErrors.age = "Please enter a valid age";
    }

    if (formData.weight === "" || formData.weight <= 0) {
      newErrors.weight = "Please enter a valid weight";
    }

    if (!formData.color.trim()) {
      newErrors.color = "Color is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Replace with actual API call
      const petData = {
        ...formData,
        age: Number(formData.age),
        weight: Number(formData.weight),
      };

      const createdPet = await createPet(petData);
      if (createdPet?.id) {
        setNewPetId(createdPet.id);
        toast.success("Pet added! Let's complete any required forms.");
        setShowWizard(true);
      } else {
        toast.success("Pet added successfully!");
        router.push("/customer/pets");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to add pet");
    } finally {
      setIsSaving(false);
    }
  };

  // Placeholder function - replace with actual API call. Return { id } to redirect to pet Forms tab.
  const createPet = async (
    _petData: Omit<PetFormData, "age" | "weight"> & {
      age: number;
      weight: number;
    },
  ): Promise<{ id: number } | void> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // When API returns new pet: return { id: newPet.id };
    return { id: Date.now() % 100000 }; // temporary: simulate new pet id for Forms redirect
  };

  const PetIcon = formData.type === "Cat" ? Cat : Dog;
  const facilityId = selectedFacility?.id ?? 11;
  const MOCK_CUSTOMER_ID = 15;

  if (showWizard && newPetId) {
    return (
      <div className="bg-background min-h-screen p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                router.push(`/customer/pets/${newPetId}?tab=forms`)
              }
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Required Forms</h1>
              <p className="text-muted-foreground text-sm">
                Complete these forms for {formData.name}
              </p>
            </div>
          </div>
          <FormWizard
            petId={newPetId}
            customerId={MOCK_CUSTOMER_ID}
            facilityId={facilityId}
            onComplete={() =>
              router.push(`/customer/pets/${newPetId}?tab=forms`)
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/customer/pets")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add a New Pet</h1>
            <p className="text-muted-foreground mt-1">
              Add your pet&apos;s information to start booking services
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pet Photo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Pet Photo</CardTitle>
              <CardDescription>
                Upload a photo of your pet (optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="bg-muted relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg">
                  {formData.imageUrl ? (
                    <Image
                      src={formData.imageUrl}
                      alt="Pet preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <PetIcon className="text-muted-foreground h-16 w-16" />
                  )}
                </div>
                <div className="flex-1">
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="mr-2 size-4" />
                    Upload Photo
                  </Button>
                  <p className="text-muted-foreground mt-2 text-xs">
                    You can add a photo later from your pet&apos;s profile
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Basic Information
              </CardTitle>
              <CardDescription>
                Essential details about your pet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
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
                    aria-invalid={errors.name ? "true" : "false"}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "Dog" | "Cat") =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dog">Dog</SelectItem>
                      <SelectItem value="Cat">Cat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
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
                    aria-invalid={errors.breed ? "true" : "false"}
                  />
                  {errors.breed && (
                    <p className="text-destructive text-sm">{errors.breed}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">
                    Color <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => {
                      setFormData({ ...formData, color: e.target.value });
                      if (errors.color) setErrors({ ...errors, color: "" });
                    }}
                    placeholder="Golden"
                    aria-invalid={errors.color ? "true" : "false"}
                  />
                  {errors.color && (
                    <p className="text-destructive text-sm">{errors.color}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="age">
                    Age (years) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min="0"
                    max="30"
                    value={formData.age}
                    onChange={(e) => {
                      const value =
                        e.target.value === "" ? "" : parseInt(e.target.value);
                      setFormData({ ...formData, age: value });
                      if (errors.age) setErrors({ ...errors, age: "" });
                    }}
                    placeholder="3"
                    aria-invalid={errors.age ? "true" : "false"}
                  />
                  {errors.age && (
                    <p className="text-destructive text-sm">{errors.age}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">
                    Weight (lbs) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => {
                      const value =
                        e.target.value === "" ? "" : parseFloat(e.target.value);
                      setFormData({ ...formData, weight: value });
                      if (errors.weight) setErrors({ ...errors, weight: "" });
                    }}
                    placeholder="25"
                    aria-invalid={errors.weight ? "true" : "false"}
                  />
                  {errors.weight && (
                    <p className="text-destructive text-sm">{errors.weight}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="microchip">Microchip Number</Label>
                <Input
                  id="microchip"
                  value={formData.microchip}
                  onChange={(e) =>
                    setFormData({ ...formData, microchip: e.target.value })
                  }
                  placeholder="123456789"
                  className="font-mono"
                />
                <p className="text-muted-foreground text-xs">
                  Optional - Enter your pet&apos;s microchip number if available
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Medical & Health Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Medical & Health Information
              </CardTitle>
              <CardDescription>
                Important health details for your pet&apos;s care
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) =>
                    setFormData({ ...formData, allergies: e.target.value })
                  }
                  placeholder="List any allergies (e.g., Chicken, Beef) or enter 'None'"
                  rows={3}
                />
                <p className="text-muted-foreground text-xs">
                  List any known allergies. Enter &quot;None&quot; if your pet
                  has no allergies.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialNeeds">Special Needs</Label>
                <Textarea
                  id="specialNeeds"
                  value={formData.specialNeeds}
                  onChange={(e) =>
                    setFormData({ ...formData, specialNeeds: e.target.value })
                  }
                  placeholder="Any special medical or care needs (e.g., medication, mobility assistance)"
                  rows={3}
                />
                <p className="text-muted-foreground text-xs">
                  Include any special care requirements, medications, or health
                  conditions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/customer/pets")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Adding Pet...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Add Pet
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
