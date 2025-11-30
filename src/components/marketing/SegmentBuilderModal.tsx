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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Users } from "lucide-react";

interface SegmentBuilderModalProps {
  onClose: () => void;
}

export function SegmentBuilderModal({ onClose }: SegmentBuilderModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    filters: [] as {
      field: string;
      operator: string;
      value: string;
    }[],
  });

  const [newFilter, setNewFilter] = useState({
    field: "",
    operator: "equals",
    value: "",
  });

  const filterFields = [
    { value: "totalSpent", label: "Total Spent" },
    { value: "totalBookings", label: "Total Bookings" },
    { value: "lastBookingDate", label: "Last Booking Date" },
    { value: "status", label: "Customer Status" },
    { value: "petType", label: "Pet Type" },
    { value: "city", label: "City" },
  ];

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "contains", label: "Contains" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
    { value: "in_range", label: "In Range" },
  ];

  const handleAddFilter = () => {
    if (newFilter.field && newFilter.value) {
      setFormData({
        ...formData,
        filters: [...formData.filters, { ...newFilter }],
      });
      setNewFilter({ field: "", operator: "equals", value: "" });
    }
  };

  const handleRemoveFilter = (index: number) => {
    setFormData({
      ...formData,
      filters: formData.filters.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    console.log("Saving segment:", formData);
    onClose();
  };

  const estimatedCount = Math.floor(Math.random() * 100) + 20; // Mock estimate

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Customer Segment</DialogTitle>
        <DialogDescription>
          Build targeted customer groups based on specific criteria
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Segment Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Segment Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., VIP Customers"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this segment..."
            rows={3}
          />
        </div>

        {/* Add Filter Section */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base">Add Filter Criteria</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Field</Label>
                <Select
                  value={newFilter.field}
                  onValueChange={(value) => setNewFilter({ ...newFilter, field: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterFields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
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
                  onValueChange={(value) => setNewFilter({ ...newFilter, operator: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Value</Label>
                <div className="flex gap-2">
                  <Input
                    value={newFilter.value}
                    onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
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

        {/* Active Filters */}
        {formData.filters.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Active Filters ({formData.filters.length})</Label>
            <div className="space-y-2">
              {formData.filters.map((filter, idx) => {
                const fieldLabel = filterFields.find((f) => f.value === filter.field)?.label;
                const operatorLabel = operators.find((o) => o.value === filter.operator)?.label;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="text-sm">
                      <span className="font-medium">{fieldLabel}</span>
                      <span className="mx-2 text-muted-foreground">{operatorLabel}</span>
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

        {/* Estimated Count */}
        {formData.filters.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-muted-foreground">Estimated Customers</Label>
                  <div className="text-2xl font-bold mt-1">{estimatedCount}</div>
                </div>
                <Users className="h-12 w-12 text-muted-foreground opacity-20" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.name || formData.filters.length === 0}
        >
          <Users className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </DialogFooter>
    </>
  );
}

