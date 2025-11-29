"use client";

import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Lead,
  LeadSource,
  PipelineStage,
  ServiceType,
  ExpectedTier,
  leadSourceLabels,
  pipelineStageLabels,
  serviceTypeLabels,
  expectedTierLabels,
  pipelineStageOrder,
} from "@/data/crm/leads";
import { salesTeamMembers } from "@/data/crm/sales-team";

export interface LeadFormData {
  facilityName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  source: LeadSource;
  businessSize: number;
  servicesOffered: ServiceType[];
  notes: string;
  status: PipelineStage;
  assignedTo: string;
  expectedTier: ExpectedTier;
  modulesInterested: string[];
  estimatedMonthlyValue: number;
  estimatedAnnualValue: number;
  expectedCloseDate: string;
  probability: number;
}

interface LeadFormProps {
  initialData?: Partial<Lead>;
  onSubmit: (data: LeadFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const availableModules = [
  { id: "module-booking", name: "Booking & Scheduling" },
  { id: "module-staff-scheduling", name: "Staff Scheduling" },
  { id: "module-customer-management", name: "Customer Management" },
  { id: "module-financial-reporting", name: "Financial Reporting" },
  { id: "module-communication", name: "Communication" },
  { id: "module-grooming-management", name: "Grooming Management" },
  { id: "module-inventory-management", name: "Inventory Management" },
  { id: "module-training-education", name: "Training & Education" },
];

const tierPricing: Record<ExpectedTier, { monthly: number; annual: number }> = {
  beginner: { monthly: 29, annual: 299 },
  pro: { monthly: 79, annual: 849 },
  enterprise: { monthly: 199, annual: 2149 },
  custom: { monthly: 149, annual: 1599 },
};

export function LeadForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: LeadFormProps) {
  const defaultCloseDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  }, []);

  const [formData, setFormData] = useState<LeadFormData>({
    facilityName: initialData?.facilityName || "",
    contactPerson: initialData?.contactPerson || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    source: initialData?.source || "website",
    businessSize: initialData?.businessSize || 0,
    servicesOffered: initialData?.servicesOffered || [],
    notes: initialData?.notes || "",
    status: initialData?.status || "new_lead",
    assignedTo: initialData?.assignedTo || "",
    expectedTier: initialData?.expectedTier || "beginner",
    modulesInterested: initialData?.modulesInterested || [],
    estimatedMonthlyValue:
      initialData?.estimatedMonthlyValue || tierPricing.beginner.monthly,
    estimatedAnnualValue:
      initialData?.estimatedAnnualValue || tierPricing.beginner.annual,
    expectedCloseDate: initialData?.expectedCloseDate || defaultCloseDate,
    probability: initialData?.probability || 25,
  });

  const handleChange = (
    field: keyof LeadFormData,
    value: string | number | string[],
  ) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-update pricing when tier changes
      if (field === "expectedTier") {
        const tier = value as ExpectedTier;
        newData.estimatedMonthlyValue = tierPricing[tier].monthly;
        newData.estimatedAnnualValue = tierPricing[tier].annual;
      }

      return newData;
    });
  };

  const handleServiceToggle = (service: ServiceType) => {
    setFormData((prev) => {
      const services = prev.servicesOffered.includes(service)
        ? prev.servicesOffered.filter((s) => s !== service)
        : [...prev.servicesOffered, service];
      return { ...prev, servicesOffered: services };
    });
  };

  const handleModuleToggle = (moduleId: string) => {
    setFormData((prev) => {
      const modules = prev.modulesInterested.includes(moduleId)
        ? prev.modulesInterested.filter((m) => m !== moduleId)
        : [...prev.modulesInterested, moduleId];
      return { ...prev, modulesInterested: modules };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
          Basic Information
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="facilityName">
              Facility/Business Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="facilityName"
              value={formData.facilityName}
              onChange={(e) => handleChange("facilityName", e.target.value)}
              placeholder="Happy Paws Pet Resort"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson">
              Owner/Contact Person <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => handleChange("contactPerson", e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@happypaws.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Business Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Pet Lane, Austin, TX 78701"
            />
          </div>
        </div>
      </div>

      {/* Lead Details */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
          Lead Details
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="source">Lead Source</Label>
            <Select
              value={formData.source}
              onValueChange={(value) => handleChange("source", value)}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(leadSourceLabels) as LeadSource[]).map(
                  (source) => (
                    <SelectItem key={source} value={source}>
                      {leadSourceLabels[source]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessSize">
              Current Business Size (approx. pets handled)
            </Label>
            <Input
              id="businessSize"
              type="number"
              min="0"
              value={formData.businessSize}
              onChange={(e) =>
                handleChange("businessSize", parseInt(e.target.value) || 0)
              }
              placeholder="50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Pipeline Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {pipelineStageOrder.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {pipelineStageLabels[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) => handleChange("assignedTo", value)}
            >
              <SelectTrigger id="assignedTo">
                <SelectValue placeholder="Select sales rep" />
              </SelectTrigger>
              <SelectContent>
                {salesTeamMembers
                  .filter((m) => m.status === "active")
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Services Offered */}
        <div className="space-y-2">
          <Label>Services They Offer</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(serviceTypeLabels) as ServiceType[]).map(
              (service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service}`}
                    checked={formData.servicesOffered.includes(service)}
                    onCheckedChange={() => handleServiceToggle(service)}
                  />
                  <Label
                    htmlFor={`service-${service}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {serviceTypeLabels[service]}
                  </Label>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Deal Information */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
          Deal Information
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expectedTier">Expected Subscription Tier</Label>
            <Select
              value={formData.expectedTier}
              onValueChange={(value) => handleChange("expectedTier", value)}
            >
              <SelectTrigger id="expectedTier">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(expectedTierLabels) as ExpectedTier[]).map(
                  (tier) => (
                    <SelectItem key={tier} value={tier}>
                      {expectedTierLabels[tier]} - ${tierPricing[tier].monthly}
                      /mo
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="probability">Probability of Closing (%)</Label>
            <Input
              id="probability"
              type="number"
              min="0"
              max="100"
              value={formData.probability}
              onChange={(e) =>
                handleChange(
                  "probability",
                  Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                )
              }
              placeholder="25"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedMonthlyValue">
              Estimated Monthly Value ($)
            </Label>
            <Input
              id="estimatedMonthlyValue"
              type="number"
              min="0"
              value={formData.estimatedMonthlyValue}
              onChange={(e) =>
                handleChange(
                  "estimatedMonthlyValue",
                  parseInt(e.target.value) || 0,
                )
              }
              placeholder="79"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedAnnualValue">
              Estimated Annual Value ($)
            </Label>
            <Input
              id="estimatedAnnualValue"
              type="number"
              min="0"
              value={formData.estimatedAnnualValue}
              onChange={(e) =>
                handleChange(
                  "estimatedAnnualValue",
                  parseInt(e.target.value) || 0,
                )
              }
              placeholder="849"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) =>
                handleChange("expectedCloseDate", e.target.value)
              }
            />
          </div>
        </div>

        {/* Modules Interested */}
        <div className="space-y-2">
          <Label>Modules Interested In</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableModules.map((module) => (
              <div key={module.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`module-${module.id}`}
                  checked={formData.modulesInterested.includes(module.id)}
                  onCheckedChange={() => handleModuleToggle(module.id)}
                />
                <Label
                  htmlFor={`module-${module.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {module.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
          Notes & Comments
        </h3>

        <div className="space-y-2">
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Add any relevant notes about this lead..."
            rows={4}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : initialData?.id
              ? "Update Lead"
              : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}
