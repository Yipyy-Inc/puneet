"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, Users, Star, Layers, Zap } from "lucide-react";
import type {
  CustomerSegment,
  FilterGroup,
  SegmentFilter,
  SegmentFilterCategory,
  SegmentFilterOperator,
  SegmentFilterFieldDef,
} from "@/data/marketing";
import {
  SEGMENT_FILTER_FIELDS,
  SEGMENT_CATEGORY_LABELS,
  FIELD_DEF_MAP,
  customerSegments,
} from "@/data/marketing";

interface SegmentBuilderModalProps {
  segment?: CustomerSegment | null;
  onClose: () => void;
}

function genId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

const OPERATOR_LABELS: Record<SegmentFilterOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  greater_than: "greater than",
  less_than: "less than",
  in: "is one of",
  not_in: "is not one of",
  between: "is between",
  contains: "contains",
  is_true: "is true",
  is_false: "is false",
};

function getFieldDef(field: string): SegmentFilterFieldDef | undefined {
  return FIELD_DEF_MAP.get(field);
}

function formatFilterValue(filter: SegmentFilter): string {
  const def = getFieldDef(filter.field);
  if (filter.operator === "is_true") return "Yes";
  if (filter.operator === "is_false") return "No";
  if (Array.isArray(filter.value)) {
    return (filter.value as string[]).join(", ");
  }
  const suffix = def?.unit ? ` ${def.unit}` : "";
  return `${filter.value}${suffix}`;
}

// Pre-built segments for quick-apply
const SUGGESTED_SEGMENTS = customerSegments
  .filter((s) => s.isBuiltIn)
  .slice(0, 8);

export function SegmentBuilderModal({
  segment,
  onClose,
}: SegmentBuilderModalProps) {
  const isEditing = !!segment;

  const [name, setName] = useState(segment?.name || "");
  const [description, setDescription] = useState(segment?.description || "");
  const [isFavorite, setIsFavorite] = useState(segment?.isFavorite || false);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(
    segment?.filterGroups || [{ id: genId("fg"), filters: [] }],
  );
  const [groupLogicOperator, setGroupLogicOperator] = useState<"AND" | "OR">(
    segment?.groupLogicOperator || "AND",
  );

  // New filter state per group
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [newFilterCategory, setNewFilterCategory] = useState<
    SegmentFilterCategory | ""
  >("");
  const [newFilterField, setNewFilterField] = useState("");
  const [newFilterOperator, setNewFilterOperator] =
    useState<SegmentFilterOperator>("equals");
  const [newFilterValue, setNewFilterValue] = useState<string>("");
  const [newFilterMultiValues, setNewFilterMultiValues] = useState<string[]>(
    [],
  );

  const fieldsForCategory = newFilterCategory
    ? SEGMENT_FILTER_FIELDS.filter((f) => f.category === newFilterCategory)
    : [];

  const selectedFieldDef = getFieldDef(newFilterField);

  const operatorsForField = selectedFieldDef?.operators || [];

  const resetNewFilter = () => {
    setNewFilterCategory("");
    setNewFilterField("");
    setNewFilterOperator("equals");
    setNewFilterValue("");
    setNewFilterMultiValues([]);
    setActiveGroupId(null);
  };

  const handleAddFilter = (groupId: string) => {
    if (!newFilterField) return;
    const def = selectedFieldDef;
    if (!def) return;

    let value: SegmentFilter["value"];
    if (newFilterOperator === "is_true") value = true;
    else if (newFilterOperator === "is_false") value = false;
    else if (
      def.valueType === "multi_select" ||
      newFilterOperator === "in" ||
      newFilterOperator === "not_in"
    ) {
      value =
        newFilterMultiValues.length > 0
          ? newFilterMultiValues
          : [newFilterValue];
    } else if (def.valueType === "number") {
      value = Number(newFilterValue) || 0;
    } else {
      value = newFilterValue;
    }

    const filter: SegmentFilter = {
      id: genId("f"),
      category: def.category,
      field: def.field,
      operator: newFilterOperator,
      value,
    };

    setFilterGroups((prev: FilterGroup[]) =>
      prev.map((g: FilterGroup) =>
        g.id === groupId ? { ...g, filters: [...g.filters, filter] } : g,
      ),
    );
    resetNewFilter();
  };

  const handleRemoveFilter = (groupId: string, filterId: string) => {
    setFilterGroups((prev: FilterGroup[]) =>
      prev.map((g: FilterGroup) =>
        g.id === groupId
          ? {
              ...g,
              filters: g.filters.filter(
                (f: SegmentFilter) => f.id !== filterId,
              ),
            }
          : g,
      ),
    );
  };

  const handleAddGroup = () => {
    setFilterGroups((prev: FilterGroup[]) => [
      ...prev,
      { id: genId("fg"), filters: [] },
    ]);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (filterGroups.length <= 1) return;
    setFilterGroups((prev: FilterGroup[]) =>
      prev.filter((g: FilterGroup) => g.id !== groupId),
    );
  };

  const handleApplySuggestion = (seg: CustomerSegment) => {
    setName(seg.name);
    setDescription(seg.description);
    setFilterGroups(
      seg.filterGroups.map((g) => ({
        ...g,
        id: genId("fg"),
        filters: g.filters.map((f) => ({ ...f, id: genId("f") })),
      })),
    );
    setGroupLogicOperator(seg.groupLogicOperator);
  };

  const totalFilters = filterGroups.reduce(
    (sum, g) => sum + g.filters.length,
    0,
  );
  // More realistic mock: randomize within a range based on filter count
  const estimatedCount = Math.max(
    3,
    Math.round(150 * Math.pow(0.7, totalFilters) + totalFilters * 2),
  );

  const handleSave = () => {
    console.log("Saving segment:", {
      name,
      description,
      isFavorite,
      filterGroups,
      groupLogicOperator,
      estimatedCount,
    });
    onClose();
  };

  const toggleMultiValue = (val: string) => {
    setNewFilterMultiValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Edit" : "Create"} Customer Segment
        </DialogTitle>
        <DialogDescription>
          Build targeted customer groups using AND/OR filter logic
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-6 py-4 pr-4">
          {/* Name + Favorite */}
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="seg-name">Segment Name *</Label>
              <Input
                id="seg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Overdue Grooming - Large Dogs"
              />
            </div>
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="icon"
              onClick={() => setIsFavorite(!isFavorite)}
              aria-label={
                isFavorite ? "Remove from favorites" : "Mark as favorite"
              }
            >
              <Star className={`size-4 ${isFavorite ? "fill-current" : ""} `} />
            </Button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="seg-desc">Description</Label>
            <Textarea
              id="seg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this segment..."
              rows={2}
            />
          </div>

          {/* Quick-Apply Suggestions */}
          {!isEditing && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <Zap className="size-3.5" />
                Quick Start from Pre-Built Segment
              </Label>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Pre-built segment suggestions"
              >
                {SUGGESTED_SEGMENTS.map((seg) => (
                  <Button
                    key={seg.id}
                    variant="outline"
                    size="sm"
                    className="h-auto px-3 py-1.5 text-xs font-normal"
                    onClick={() => handleApplySuggestion(seg)}
                  >
                    {seg.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Filter Groups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-base">
                <Layers className="size-4" />
                Filter Groups
              </Label>
              {filterGroups.length > 1 && (
                <div
                  className="flex items-center gap-2 text-sm"
                  role="radiogroup"
                  aria-label="Group logic operator"
                >
                  <span className="text-muted-foreground">Between groups:</span>
                  <Button
                    variant={
                      groupLogicOperator === "AND" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setGroupLogicOperator("AND")}
                    aria-pressed={groupLogicOperator === "AND"}
                  >
                    AND
                  </Button>
                  <Button
                    variant={
                      groupLogicOperator === "OR" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setGroupLogicOperator("OR")}
                    aria-pressed={groupLogicOperator === "OR"}
                  >
                    OR
                  </Button>
                </div>
              )}
            </div>

            {filterGroups.map((group, groupIdx) => (
              <div key={group.id}>
                {/* AND/OR divider between groups */}
                {groupIdx > 0 && (
                  <div
                    className="flex items-center justify-center py-2"
                    aria-hidden="true"
                  >
                    <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                      {groupLogicOperator}
                    </span>
                  </div>
                )}

                <Card>
                  <CardHeader className="px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Group {groupIdx + 1}
                        <span className="text-muted-foreground ml-2 font-normal">
                          (filters are AND-ed within this group)
                        </span>
                      </CardTitle>
                      {filterGroups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => handleRemoveGroup(group.id)}
                          aria-label={`Remove filter group ${groupIdx + 1}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    {/* Existing filters in this group */}
                    {group.filters.map((filter) => {
                      const def = getFieldDef(filter.field);
                      return (
                        <div
                          key={filter.id}
                          className="bg-muted/50 flex items-center justify-between rounded-lg p-2.5 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                              {SEGMENT_CATEGORY_LABELS[filter.category]}
                            </span>
                            <span className="font-medium">
                              {def?.label || filter.field}
                            </span>
                            <span className="text-muted-foreground">
                              {OPERATOR_LABELS[filter.operator]}
                            </span>
                            <span className="font-medium">
                              {formatFilterValue(filter)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-6 p-0"
                            onClick={() =>
                              handleRemoveFilter(group.id, filter.id)
                            }
                            aria-label={`Remove filter: ${def?.label || filter.field}`}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}

                    {/* Add filter inline form */}
                    {activeGroupId === group.id ? (
                      <div className="space-y-3 rounded-lg border border-dashed p-3">
                        {/* Row 1: Category + Field */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Select
                              value={newFilterCategory}
                              onValueChange={(val) => {
                                setNewFilterCategory(
                                  val as SegmentFilterCategory,
                                );
                                setNewFilterField("");
                                setNewFilterOperator("equals");
                                setNewFilterValue("");
                                setNewFilterMultiValues([]);
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select category..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  Object.keys(
                                    SEGMENT_CATEGORY_LABELS,
                                  ) as SegmentFilterCategory[]
                                ).map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {SEGMENT_CATEGORY_LABELS[cat]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Field</Label>
                            <Select
                              value={newFilterField}
                              onValueChange={(val) => {
                                setNewFilterField(val);
                                const fieldDef = SEGMENT_FILTER_FIELDS.find(
                                  (f) => f.field === val,
                                );
                                if (fieldDef && fieldDef.operators.length > 0) {
                                  setNewFilterOperator(fieldDef.operators[0]);
                                }
                                setNewFilterValue("");
                                setNewFilterMultiValues([]);
                              }}
                              disabled={!newFilterCategory}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select field..." />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldsForCategory.map((f) => (
                                  <SelectItem key={f.field} value={f.field}>
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Row 2: Operator + Value */}
                        {selectedFieldDef && (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Condition</Label>
                              <Select
                                value={newFilterOperator}
                                onValueChange={(val) =>
                                  setNewFilterOperator(
                                    val as SegmentFilterOperator,
                                  )
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {operatorsForField.map((op) => (
                                    <SelectItem key={op} value={op}>
                                      {OPERATOR_LABELS[op]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Value</Label>
                              {/* Boolean fields */}
                              {selectedFieldDef.valueType === "boolean" ||
                              newFilterOperator === "is_true" ||
                              newFilterOperator === "is_false" ? (
                                <div className="bg-muted/30 flex h-9 items-center rounded-md border px-3 text-sm">
                                  {newFilterOperator === "is_true"
                                    ? "Yes"
                                    : newFilterOperator === "is_false"
                                      ? "No"
                                      : "Auto"}
                                </div>
                              ) : selectedFieldDef.valueType === "select" &&
                                selectedFieldDef.options ? (
                                <Select
                                  value={newFilterValue}
                                  onValueChange={setNewFilterValue}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedFieldDef.options.map((opt) => (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : selectedFieldDef.valueType ===
                                  "multi_select" && selectedFieldDef.options ? (
                                <div className="space-y-1.5">
                                  <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto rounded-md border p-1.5">
                                    {newFilterMultiValues.length === 0 && (
                                      <span className="text-muted-foreground text-xs">
                                        Click to select...
                                      </span>
                                    )}
                                    {newFilterMultiValues.map((v) => (
                                      <Button
                                        key={v}
                                        variant="default"
                                        size="sm"
                                        className="h-auto px-2 py-0.5 text-xs"
                                        onClick={() => toggleMultiValue(v)}
                                        aria-label={`Remove ${v}`}
                                      >
                                        {v} <X className="ml-1 h-2.5 w-2.5" />
                                      </Button>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedFieldDef.options
                                      .filter(
                                        (opt) =>
                                          !newFilterMultiValues.includes(
                                            opt.value,
                                          ),
                                      )
                                      .slice(0, 12)
                                      .map((opt) => (
                                        <Button
                                          key={opt.value}
                                          variant="outline"
                                          size="sm"
                                          className="h-auto px-2 py-0.5 text-xs font-normal"
                                          onClick={() =>
                                            toggleMultiValue(opt.value)
                                          }
                                        >
                                          {opt.label}
                                        </Button>
                                      ))}
                                    {selectedFieldDef.options.length -
                                      newFilterMultiValues.length >
                                      12 && (
                                      <span className="text-muted-foreground self-center text-xs">
                                        +
                                        {selectedFieldDef.options.length -
                                          12 -
                                          newFilterMultiValues.length}{" "}
                                        more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : selectedFieldDef.valueType ===
                                "pet_select" ? (
                                <Input
                                  className="h-9"
                                  value={newFilterValue}
                                  onChange={(e) =>
                                    setNewFilterValue(e.target.value)
                                  }
                                  placeholder="Enter pet name or ID..."
                                />
                              ) : (
                                <Input
                                  className="h-9"
                                  type={
                                    selectedFieldDef.valueType === "number"
                                      ? "number"
                                      : "text"
                                  }
                                  value={newFilterValue}
                                  onChange={(e) =>
                                    setNewFilterValue(e.target.value)
                                  }
                                  placeholder={
                                    selectedFieldDef.placeholder ||
                                    `Enter ${selectedFieldDef.unit || "value"}...`
                                  }
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetNewFilter}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAddFilter(group.id)}
                            disabled={
                              !newFilterField ||
                              (selectedFieldDef?.valueType !== "boolean" &&
                                newFilterOperator !== "is_true" &&
                                newFilterOperator !== "is_false" &&
                                !newFilterValue &&
                                newFilterMultiValues.length === 0)
                            }
                          >
                            <Plus className="mr-1 size-3.5" />
                            Add Filter
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() => {
                          resetNewFilter();
                          setActiveGroupId(group.id);
                        }}
                      >
                        <Plus className="mr-1 size-3.5" />
                        Add Filter
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Add Group button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddGroup}
              className="w-full border-dashed"
            >
              <Plus className="mr-1 size-3.5" />
              Add Filter Group
            </Button>
          </div>

          {/* Estimated Count */}
          {totalFilters > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Estimated Customers
                    </Label>
                    <div className="mt-0.5 text-2xl font-bold">
                      ~{estimatedCount}
                    </div>
                  </div>
                  <Users
                    className="text-primary/20 size-10"
                    aria-hidden="true"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name || totalFilters === 0}>
          <Users className="mr-2 size-4" />
          {isEditing ? "Update" : "Create"} Segment
        </Button>
      </DialogFooter>
    </>
  );
}
