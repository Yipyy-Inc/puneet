"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  X,
  AlertTriangle,
  FileText,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { GroomingIntake } from "@/data/grooming";

interface GroomingIntakeFormProps {
  appointmentId: string;
  petName: string;
  initialData?: GroomingIntake;
  onSave: (intake: GroomingIntake) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function GroomingIntakeForm({
  appointmentId,
  petName,
  initialData,
  onSave,
  onCancel,
  readOnly = false,
}: GroomingIntakeFormProps) {
  const [coatCondition, setCoatCondition] = useState<
    "normal" | "matted" | "severely-matted"
  >(initialData?.coatCondition || "normal");
  const [behaviorNotes, setBehaviorNotes] = useState(
    initialData?.behaviorNotes || "",
  );
  const [allergies, setAllergies] = useState<string[]>(
    initialData?.allergies || [],
  );
  const [newAllergy, setNewAllergy] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState(
    initialData?.specialInstructions || "",
  );
  const [beforePhotos, setBeforePhotos] = useState<string[]>(
    initialData?.beforePhotos || [],
  );
  const [mattingFeeWarning, setMattingFeeWarning] = useState(
    initialData?.mattingFeeWarning || false,
  );
  const [mattingFeeAmount, setMattingFeeAmount] = useState<number>(
    initialData?.mattingFeeAmount || 0,
  );

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setAllergies(allergies.filter((a) => a !== allergy));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // In a real app, this would upload to a server and return a URL
      // For now, we'll create a local object URL
      const url = URL.createObjectURL(file);
      setBeforePhotos([...beforePhotos, url]);
    });
    toast.success("Photo(s) added");
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...beforePhotos];
    const removedUrl = newPhotos[index];
    URL.revokeObjectURL(removedUrl);
    newPhotos.splice(index, 1);
    setBeforePhotos(newPhotos);
  };

  const handleSave = () => {
    const intakeData: GroomingIntake = {
      coatCondition,
      behaviorNotes,
      allergies,
      specialInstructions,
      beforePhotos,
      mattingFeeWarning,
      mattingFeeAmount: mattingFeeWarning ? mattingFeeAmount : undefined,
      completedBy: "Current Groomer", // In real app, get from auth context
      completedAt: new Date().toISOString(),
    };

    onSave(intakeData);
    toast.success("Intake form saved successfully");
  };

  const isFormValid = () => {
    if (mattingFeeWarning && mattingFeeAmount <= 0) {
      return false;
    }
    return true;
  };

  if (readOnly && initialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Intake Form
            {initialData.completedAt && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Coat Condition</Label>
            <p className="mt-1 text-sm capitalize">
              {initialData.coatCondition.replace("-", " ")}
            </p>
          </div>
          {initialData.behaviorNotes && (
            <div>
              <Label className="text-sm font-medium">Behavior Notes</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {initialData.behaviorNotes}
              </p>
            </div>
          )}
          {initialData.allergies.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Allergies / Sensitivities</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {initialData.allergies.map((allergy, idx) => (
                  <Badge key={idx} variant="destructive">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {initialData.specialInstructions && (
            <div>
              <Label className="text-sm font-medium">Special Instructions</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {initialData.specialInstructions}
              </p>
            </div>
          )}
          {initialData.beforePhotos.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Before Photos</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {initialData.beforePhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={photo}
                      alt={`Before photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {initialData.mattingFeeWarning && (
            <div>
              <Label className="text-sm font-medium">Matting Fee</Label>
              <p className="mt-1 text-sm font-semibold text-orange-600">
                ${initialData.mattingFeeAmount?.toFixed(2)} - Fee Applied
              </p>
            </div>
          )}
          {initialData.completedBy && (
            <div className="text-xs text-muted-foreground">
              Completed by {initialData.completedBy} on{" "}
              {new Date(initialData.completedAt!).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
        Intake Form - {petName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Coat Condition */}
        <div className="space-y-2">
          <Label htmlFor="coat-condition">Coat Condition *</Label>
          <Select
            value={coatCondition}
            onValueChange={(value: "normal" | "matted" | "severely-matted") =>
              setCoatCondition(value)
            }
            disabled={readOnly}
          >
            <SelectTrigger id="coat-condition">
              <SelectValue placeholder="Select coat condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="matted">Matted</SelectItem>
              <SelectItem value="severely-matted">Severely Matted</SelectItem>
            </SelectContent>
          </Select>
          {(coatCondition === "matted" || coatCondition === "severely-matted") && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Matting detected. Consider applying a matting fee and inform the
                owner.
              </p>
            </div>
          )}
        </div>

        {/* Behavior Notes */}
        <div className="space-y-2">
          <Label htmlFor="behavior-notes">Behavior Notes</Label>
          <Textarea
            id="behavior-notes"
            placeholder="Note any behavioral concerns, anxiety, aggression, or special handling requirements..."
            value={behaviorNotes}
            onChange={(e) => setBehaviorNotes(e.target.value)}
            disabled={readOnly}
            rows={4}
          />
        </div>

        {/* Allergies / Sensitivities */}
        <div className="space-y-2">
          <Label>Allergies / Sensitivities</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add allergy or sensitivity..."
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddAllergy();
                }
              }}
              disabled={readOnly}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAllergy}
              disabled={readOnly || !newAllergy.trim()}
            >
              Add
            </Button>
          </div>
          {allergies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {allergies.map((allergy, idx) => (
                <Badge
                  key={idx}
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  {allergy}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAllergy(allergy)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="special-instructions">Special Instructions</Label>
          <Textarea
            id="special-instructions"
            placeholder="Any special instructions for this grooming session..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            disabled={readOnly}
            rows={3}
          />
        </div>

        <Separator />

        {/* Before Photos */}
        <div className="space-y-2">
          <Label>Before Photos</Label>
          <div className="grid grid-cols-3 gap-2">
            {beforePhotos.map((photo, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-lg overflow-hidden border group"
              >
                <img
                  src={photo}
                  alt={`Before photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <label className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="text-center">
                  <Camera className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Add Photo</span>
                </div>
              </label>
            )}
          </div>
        </div>

        <Separator />

        {/* Matting Fee Warning */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="matting-fee-warning">Matting Fee Warning</Label>
              <p className="text-sm text-muted-foreground">
                Enable if matting requires additional fee
              </p>
            </div>
            <Switch
              id="matting-fee-warning"
              checked={mattingFeeWarning}
              onCheckedChange={setMattingFeeWarning}
              disabled={readOnly}
            />
          </div>
          {mattingFeeWarning && (
            <div className="space-y-2">
              <Label htmlFor="matting-fee-amount">Matting Fee Amount ($)</Label>
              <Input
                id="matting-fee-amount"
                type="number"
                min="0"
                step="0.01"
                value={mattingFeeAmount}
                onChange={(e) => setMattingFeeAmount(parseFloat(e.target.value) || 0)}
                disabled={readOnly}
                placeholder="0.00"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Owner will be notified of the additional matting fee before
                  grooming begins.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!isFormValid()}>
              Save Intake Form
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
