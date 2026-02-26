"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";
import type { VaccinationRecord } from "@/data/pet-data";

interface AddVaccinationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: number;
  petName: string;
  onSave: (vaccination: Omit<VaccinationRecord, "id">) => Promise<void>;
}

export function AddVaccinationModal({
  open,
  onOpenChange,
  petId,
  petName,
  onSave,
}: AddVaccinationModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    vaccineName: "",
    customVaccineName: "",
    administeredDate: "",
    expiryDate: "",
    veterinarianName: "",
    veterinaryClinic: "",
    notes: "",
  });

  // Get vaccines from facility config
  const facilityVaccines = facilityConfig.vaccinationRequirements.requiredVaccinations.map(
    (v) => v.name
  );

  const commonVaccines = [
    ...facilityVaccines,
    "Canine Influenza",
    "Lyme Disease",
    "FVRCP (Cat)",
    "FeLV (Cat)",
    "Other",
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vaccineName.trim()) {
      newErrors.vaccineName = "Vaccine name is required";
    }
    if (formData.vaccineName === "Other" && !formData.customVaccineName.trim()) {
      newErrors.vaccineName = "Please enter the vaccine name";
    }

    if (!formData.administeredDate) {
      newErrors.administeredDate = "Administered date is required";
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = "Expiry date is required";
    }

    if (formData.administeredDate && formData.expiryDate) {
      const adminDate = new Date(formData.administeredDate);
      const expiryDate = new Date(formData.expiryDate);
      if (expiryDate <= adminDate) {
        newErrors.expiryDate = "Expiry date must be after administered date";
      }
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
      // TODO: Handle file upload
      const documentUrl = uploadedFile ? await uploadFile(uploadedFile) : undefined;

      const vaccination: Omit<VaccinationRecord, "id"> = {
        petId,
        vaccineName: formData.vaccineName === "Other" ? formData.customVaccineName : formData.vaccineName,
        administeredDate: formData.administeredDate,
        expiryDate: formData.expiryDate,
        veterinarianName: formData.veterinarianName || undefined,
        veterinaryClinic: formData.veterinaryClinic || undefined,
        documentUrl,
        notes: formData.notes || undefined,
        status: "pending_review", // New uploads require facility review
      };

      await onSave(vaccination);
      toast.success("Vaccination record added successfully!");
      
      // Reset form
      setFormData({
        vaccineName: "",
        customVaccineName: "",
        administeredDate: "",
        expiryDate: "",
        veterinarianName: "",
        veterinaryClinic: "",
        notes: "",
      });
      setUploadedFile(null);
      setErrors({});
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add vaccination record");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a PDF or image file");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setUploadedFile(file);
    }
  };

  // Placeholder function - replace with actual API call
  const uploadFile = async (file: File): Promise<string> => {
    // TODO: Implement file upload
    await new Promise((resolve) => setTimeout(resolve, 500));
    return URL.createObjectURL(file); // Temporary URL for demo
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle>Upload Vaccination Record</DialogTitle>
          <DialogDescription>
            Upload a vaccination record for {petName}. This will be reviewed by the facility before approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vaccineName">
                Vaccine Name <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.vaccineName}
                onValueChange={(value) => {
                  setFormData({ ...formData, vaccineName: value, customVaccineName: "" });
                  if (errors.vaccineName) setErrors({ ...errors, vaccineName: "" });
                }}
              >
                <SelectTrigger id="vaccineName">
                  <SelectValue placeholder="Select vaccine" />
                </SelectTrigger>
                <SelectContent>
                  {commonVaccines.map((vaccine) => (
                    <SelectItem key={vaccine} value={vaccine}>
                      {vaccine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.vaccineName === "Other" && (
                <Input
                  placeholder="Enter vaccine name"
                  value={formData.customVaccineName}
                  onChange={(e) => {
                    setFormData({ ...formData, customVaccineName: e.target.value });
                    if (errors.vaccineName) setErrors({ ...errors, vaccineName: "" });
                  }}
                />
              )}
              {errors.vaccineName && (
                <p className="text-sm text-destructive">{errors.vaccineName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="administeredDate">
                Administered Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="administeredDate"
                type="date"
                value={formData.administeredDate}
                onChange={(e) => {
                  setFormData({ ...formData, administeredDate: e.target.value });
                  if (errors.administeredDate) setErrors({ ...errors, administeredDate: "" });
                }}
                max={new Date().toISOString().split("T")[0]}
                aria-invalid={errors.administeredDate ? "true" : "false"}
              />
              {errors.administeredDate && (
                <p className="text-sm text-destructive">{errors.administeredDate}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">
                Expiry Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => {
                  setFormData({ ...formData, expiryDate: e.target.value });
                  if (errors.expiryDate) setErrors({ ...errors, expiryDate: "" });
                }}
                min={formData.administeredDate || undefined}
                aria-invalid={errors.expiryDate ? "true" : "false"}
              />
              {errors.expiryDate && (
                <p className="text-sm text-destructive">{errors.expiryDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="veterinarianName">Veterinarian Name</Label>
              <Input
                id="veterinarianName"
                value={formData.veterinarianName}
                onChange={(e) =>
                  setFormData({ ...formData, veterinarianName: e.target.value })
                }
                placeholder="Dr. Smith"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="veterinaryClinic">Veterinary Clinic</Label>
            <Input
              id="veterinaryClinic"
              value={formData.veterinaryClinic}
              onChange={(e) =>
                setFormData({ ...formData, veterinaryClinic: e.target.value })
              }
              placeholder="Animal Hospital"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">Upload Document (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {uploadedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{uploadedFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a PDF or image of the vaccination certificate (max 10MB)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this vaccination"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload for Review
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
