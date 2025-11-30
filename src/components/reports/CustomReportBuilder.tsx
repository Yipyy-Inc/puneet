"use client";

import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { reportFields, type CustomReportConfig } from "@/data/reports";
import { Plus, X, Mail, Calendar } from "lucide-react";

interface CustomReportBuilderProps {
  onClose: () => void;
  existingReport?: CustomReportConfig;
}

export function CustomReportBuilder({ onClose, existingReport }: CustomReportBuilderProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [config, setConfig] = useState<Partial<CustomReportConfig>>({
    name: existingReport?.name || "",
    description: existingReport?.description || "",
    dataSource: existingReport?.dataSource || "bookings",
    selectedFields: existingReport?.selectedFields || [],
    filters: existingReport?.filters || [],
    sortBy: existingReport?.sortBy,
    sortOrder: existingReport?.sortOrder || "asc",
    schedule: existingReport?.schedule || {
      enabled: false,
      frequency: "weekly",
      recipients: [],
    },
  });

  const [newFilter, setNewFilter] = useState({
    field: "",
    operator: "equals" as const,
    value: "",
  });

  const [newRecipient, setNewRecipient] = useState("");

  const availableFields = reportFields[config.dataSource || "bookings"];

  const handleFieldToggle = (fieldKey: string) => {
    const current = config.selectedFields || [];
    if (current.includes(fieldKey)) {
      setConfig({
        ...config,
        selectedFields: current.filter((f) => f !== fieldKey),
      });
    } else {
      setConfig({
        ...config,
        selectedFields: [...current, fieldKey],
      });
    }
  };

  const handleAddFilter = () => {
    if (newFilter.field && newFilter.value) {
      setConfig({
        ...config,
        filters: [...(config.filters || []), { ...newFilter }],
      });
      setNewFilter({ field: "", operator: "equals", value: "" });
    }
  };

  const handleRemoveFilter = (index: number) => {
    setConfig({
      ...config,
      filters: (config.filters || []).filter((_, i) => i !== index),
    });
  };

  const handleAddRecipient = () => {
    if (newRecipient && config.schedule) {
      setConfig({
        ...config,
        schedule: {
          ...config.schedule,
          recipients: [...config.schedule.recipients, newRecipient],
        },
      });
      setNewRecipient("");
    }
  };

  const handleRemoveRecipient = (email: string) => {
    if (config.schedule) {
      setConfig({
        ...config,
        schedule: {
          ...config.schedule,
          recipients: config.schedule.recipients.filter((r) => r !== email),
        },
      });
    }
  };

  const handleSave = () => {
    // In a real app, would save to backend
    console.log("Saving custom report:", config);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {existingReport ? "Edit Custom Report" : "Create Custom Report"}
        </DialogTitle>
        <DialogDescription>
          Build a custom report with your own fields, filters, and scheduling options.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Basic Info" },
            { num: 2, label: "Fields" },
            { num: 3, label: "Filters" },
            { num: 4, label: "Schedule" },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s.num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.num}
                </div>
                <div className="text-xs mt-1 text-muted-foreground">{s.label}</div>
              </div>
              {idx < 3 && (
                <div
                  className={`h-0.5 flex-1 ${
                    step > s.num ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Report Name *</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g., Weekly Revenue Summary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Brief description of what this report shows..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataSource">Data Source *</Label>
              <Select
                value={config.dataSource}
                onValueChange={(value: any) =>
                  setConfig({ ...config, dataSource: value, selectedFields: [] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bookings">Bookings</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="pets">Pets</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Select Fields */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base">Select Fields to Include</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose which fields to include in your report
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {availableFields.map((field) => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.key}
                        checked={(config.selectedFields || []).includes(field.key)}
                        onCheckedChange={() => handleFieldToggle(field.key)}
                      />
                      <label
                        htmlFor={field.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {field.label}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({field.type})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {config.selectedFields && config.selectedFields.length > 0 && (
              <div>
                <Label className="text-sm">Selected Fields ({config.selectedFields.length})</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {config.selectedFields.map((fieldKey) => {
                    const field = availableFields.find((f) => f.key === fieldKey);
                    return (
                      <Badge key={fieldKey} variant="secondary">
                        {field?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Add Filters */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base">Add Filters (Optional)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Filter your data based on specific criteria
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add New Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Field</Label>
                    <Select
                      value={newFilter.field}
                      onValueChange={(value) =>
                        setNewFilter({ ...newFilter, field: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <Select
                      value={newFilter.operator}
                      onValueChange={(value: any) =>
                        setNewFilter({ ...newFilter, operator: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="between">Between</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Value</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newFilter.value}
                        onChange={(e) =>
                          setNewFilter({ ...newFilter, value: e.target.value })
                        }
                        placeholder="Enter value..."
                      />
                      <Button onClick={handleAddFilter} size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {config.filters && config.filters.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Active Filters ({config.filters.length})</Label>
                <div className="space-y-2">
                  {config.filters.map((filter, idx) => {
                    const field = availableFields.find((f) => f.key === filter.field);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="text-sm">
                          <span className="font-medium">{field?.label}</span>
                          <span className="mx-2 text-muted-foreground">
                            {filter.operator.replace("_", " ")}
                          </span>
                          <span className="font-medium">{filter.value}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFilter(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={config.sortBy}
                  onValueChange={(value) => setConfig({ ...config, sortBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Select
                  value={config.sortOrder}
                  onValueChange={(value: any) =>
                    setConfig({ ...config, sortOrder: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base">Schedule Report (Optional)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically send this report via email on a regular schedule
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableSchedule"
                checked={config.schedule?.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    schedule: {
                      ...config.schedule!,
                      enabled: checked as boolean,
                    },
                  })
                }
              />
              <label
                htmlFor="enableSchedule"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Enable automatic scheduling
              </label>
            </div>

            {config.schedule?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="frequency">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Frequency
                  </Label>
                  <Select
                    value={config.schedule.frequency}
                    onValueChange={(value: any) =>
                      setConfig({
                        ...config,
                        schedule: { ...config.schedule!, frequency: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (Monday)</SelectItem>
                      <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipients">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email Recipients
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="recipients"
                      type="email"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      placeholder="email@example.com"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddRecipient();
                        }
                      }}
                    />
                    <Button onClick={handleAddRecipient} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  {config.schedule.recipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {config.schedule.recipients.map((email) => (
                        <Badge key={email} variant="secondary" className="pl-3 pr-1">
                          {email}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-2"
                            onClick={() => handleRemoveRecipient(email)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <div className="flex items-center justify-between w-full">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((step - 1) as any)}>
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep((step + 1) as any)}
                disabled={step === 1 && !config.name}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!config.name || !config.selectedFields?.length}
              >
                Save Report
              </Button>
            )}
          </div>
        </div>
      </DialogFooter>
    </>
  );
}

