"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createForm, type FormType, type FormAppliesTo, type FormSettings } from "@/data/forms";
import { Checkbox } from "@/components/ui/checkbox";

const FORM_TYPES: { value: FormType; label: string }[] = [
  { value: "intake", label: "Intake" },
  { value: "pet", label: "Pet" },
  { value: "owner", label: "Customer" },
  { value: "service", label: "Service" },
  { value: "internal", label: "Internal" },
];

const PET_TYPES = ["Dog", "Cat", "Other"];
const SERVICE_TYPES = ["Boarding", "Daycare", "Grooming", "Training", "Custom"];
const THEME_COLORS = [
  { value: "default", label: "Default" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#22c55e", label: "Green" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#f59e0b", label: "Amber" },
];

export interface CreateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
}

export function CreateFormModal({
  open,
  onOpenChange,
  facilityId,
}: CreateFormModalProps) {
  const router = useRouter();
  const [formType, setFormType] = useState<FormType>("intake");
  const [name, setName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [themeColor, setThemeColor] = useState("");
  const [petTypes, setPetTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [locationIds, setLocationIds] = useState<string[]>([]);

  const togglePetType = (p: string) => {
    setPetTypes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };
  const toggleServiceType = (s: string) => {
    setServiceTypes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const settings: FormSettings = {};
    if (welcomeMessage.trim()) settings.welcomeMessage = welcomeMessage.trim();
    if (themeColor) settings.themeColor = themeColor;
    const appliesTo: FormAppliesTo = {};
    if (petTypes.length) appliesTo.petTypes = petTypes.map((p) => p.toLowerCase());
    if (serviceTypes.length) appliesTo.serviceTypes = serviceTypes.map((s) => s.toLowerCase());
    if (locationIds.length) appliesTo.locationIds = locationIds;

    const form = createForm({
      facilityId,
      name: name.trim(),
      slug: "",
      type: formType,
      internal: formType === "internal",
      audience: formType === "internal" ? "staff" : "customer",
      status: "draft",
      questions: [],
      fieldMapping: [],
      appliesTo: Object.keys(appliesTo).length ? appliesTo : undefined,
      settings: Object.keys(settings).length ? settings : undefined,
    });
    onOpenChange(false);
    router.push(`/facility/dashboard/forms/builder?id=${form.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Form</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Form Type</Label>
            <Select value={formType} onValueChange={(v) => setFormType(v as FormType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Form Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New Client Intake"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Welcome Message (optional)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Brief intro shown at the top of the form"
            />
          </div>
          <div className="space-y-2">
            <Label>Theme Color (optional)</Label>
            <Select value={themeColor || "default"} onValueChange={(v) => setThemeColor(v === "default" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {THEME_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      {c.value && (
                        <span
                          className="h-4 w-4 rounded border"
                          style={{ backgroundColor: c.value }}
                        />
                      )}
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Applies To — Pet types (optional)</Label>
            <div className="flex flex-wrap gap-3">
              {PET_TYPES.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={petTypes.includes(p)}
                    onCheckedChange={() => togglePetType(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Applies To — Service types (optional)</Label>
            <div className="flex flex-wrap gap-3">
              {SERVICE_TYPES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={serviceTypes.includes(s)}
                    onCheckedChange={() => toggleServiceType(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create & Open Builder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
