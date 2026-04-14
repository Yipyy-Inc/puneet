"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Info } from "lucide-react";
import type {
  RoomCategory,
  RoomRule,
  RoomCategoryColor,
  RoomRuleType,
} from "@/types/rooms";
import { RoomImageUpload } from "@/components/rooms/RoomImageUpload";

// ── Color picker ───────────────────────────────────────────────────────────────

const COLORS: { key: RoomCategoryColor; dot: string }[] = [
  { key: "amber", dot: "bg-amber-400" },
  { key: "violet", dot: "bg-violet-400" },
  { key: "blue", dot: "bg-blue-400" },
  { key: "emerald", dot: "bg-emerald-400" },
  { key: "rose", dot: "bg-rose-400" },
  { key: "orange", dot: "bg-orange-400" },
  { key: "indigo", dot: "bg-indigo-400" },
  { key: "slate", dot: "bg-slate-400" },
];

// ── Rule type definitions ──────────────────────────────────────────────────────

type RuleConfig = {
  value: RoomRuleType;
  label: string;
  valueType: "number" | "select" | "none";
  unit?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

const RULE_TYPES: RuleConfig[] = [
  {
    value: "max_weight",
    label: "Max Weight",
    valueType: "number",
    unit: "lbs",
    placeholder: "e.g. 60",
  },
  {
    value: "min_weight",
    label: "Min Weight",
    valueType: "number",
    unit: "lbs",
    placeholder: "e.g. 40",
  },
  {
    value: "max_pets",
    label: "Max Pets per Booking",
    valueType: "number",
    placeholder: "e.g. 2",
  },
  { value: "single_pet_only", label: "Single Pet Only", valueType: "none" },
  {
    value: "pet_type",
    label: "Pet Type Restriction",
    valueType: "select",
    options: [
      { value: "dog", label: "Dogs only" },
      { value: "cat", label: "Cats only" },
      { value: "dog,cat", label: "Dogs & Cats" },
    ],
  },
  {
    value: "size_restriction",
    label: "Size Group",
    valueType: "select",
    options: [
      { value: "small", label: "Small  (under 20 lbs)" },
      { value: "medium", label: "Medium (20–50 lbs)" },
      { value: "large", label: "Large  (50–90 lbs)" },
      { value: "giant", label: "Giant  (90+ lbs)" },
    ],
  },
];

// ── Factories ──────────────────────────────────────────────────────────────────

function blankCategory(facilityId: number): RoomCategory {
  return {
    id: `cat-${Date.now()}`,
    facilityId,
    service: "boarding",
    name: "",
    description: "",
    color: "blue",
    sortOrder: 99,
    rules: [],
    defaultCapacity: 1,
    defaultBasePrice: undefined,
    visibleToClients: true,
  };
}

function blankRule(type: RoomRuleType): RoomRule {
  const defaults: Record<RoomRuleType, number | string> = {
    max_weight: 60,
    min_weight: 40,
    max_pets: 2,
    single_pet_only: 1,
    pet_type: "dog",
    size_restriction: "medium",
  };
  return {
    id: `rule-${Date.now()}`,
    type,
    value: defaults[type],
    clientMessage: "",
    enabled: true,
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  editing: RoomCategory | null;
  facilityId?: number;
  onClose: () => void;
  /** When creating, unitCount is the number of units to auto-generate */
  onSave: (cat: RoomCategory, unitCount: number) => void;
}

// ── Dialog ─────────────────────────────────────────────────────────────────────

export function CategoryFormDialog({
  open,
  editing,
  facilityId = 11,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<RoomCategory>(() =>
    blankCategory(facilityId),
  );
  const [addType, setAddType] = useState<RoomRuleType | "">("");
  const [unitCount, setUnitCount] = useState(1);

  useEffect(() => {
    setForm(
      editing
        ? { ...editing, rules: editing.rules.map((r) => ({ ...r })) }
        : blankCategory(facilityId),
    );
    setAddType("");
    setUnitCount(1);
  }, [editing, open, facilityId]);

  const addRule = () => {
    if (!addType) return;
    setForm((p) => ({
      ...p,
      rules: [...p.rules, blankRule(addType as RoomRuleType)],
    }));
    setAddType("");
  };

  const patchRule = (id: string, patch: Partial<RoomRule>) =>
    setForm((p) => ({
      ...p,
      rules: p.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));

  const removeRule = (id: string) =>
    setForm((p) => ({ ...p, rules: p.rules.filter((r) => r.id !== id) }));

  const valid = form.name.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editing ? "Edit Room Category" : "Create Room Category"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Basic info */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Private Care Suite, Deluxe, Condominium…"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief description shown to staff and clients…"
                rows={2}
                className="resize-none"
              />
            </div>

            <RoomImageUpload
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              label="Cover Photo"
              hint="Shown to clients when browsing room categories during booking"
            />

            <div
              className={
                editing ? "grid grid-cols-2 gap-4" : "grid grid-cols-3 gap-4"
              }
            >
              {!editing && (
                <div className="space-y-1.5">
                  <Label>
                    Number of Units <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={unitCount}
                    onChange={(e) =>
                      setUnitCount(
                        Math.max(
                          1,
                          Math.min(50, parseInt(e.target.value) || 1),
                        ),
                      )
                    }
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Auto-creates {unitCount} room{unitCount > 1 ? "s" : ""}{" "}
                    named {form.name ? `"${form.name} 01"` : '"Room 01"'}
                    {unitCount > 1
                      ? ` – "${form.name || "Room"} ${String(unitCount).padStart(2, "0")}"`
                      : ""}
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Capacity / Unit</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.defaultCapacity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      defaultCapacity: Math.max(
                        1,
                        parseInt(e.target.value) || 1,
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Base Price ($/night)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.defaultBasePrice ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      defaultBasePrice: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="55"
                />
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>Accent Color</Label>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {COLORS.map(({ key, dot }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, color: key })}
                    className={`size-7 rounded-full ${dot} transition-all ${
                      form.color === key
                        ? "ring-foreground scale-110 ring-2 ring-offset-2"
                        : "opacity-60 hover:scale-105 hover:opacity-100"
                    }`}
                    title={key}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Switch
                checked={form.visibleToClients}
                onCheckedChange={(v) =>
                  setForm({ ...form, visibleToClients: v })
                }
              />
              <Label className="cursor-pointer text-sm font-normal">
                Visible to clients in the booking flow
              </Label>
            </div>
          </div>

          <Separator />

          {/* Rules builder */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Booking Rules</p>
              <p className="text-muted-foreground mt-0.5 flex items-start gap-1 text-xs">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Rules are enforced during client booking. When a rule is
                triggered, the custom message is shown to the client and the
                room is greyed out.
              </p>
            </div>

            {form.rules.length > 0 && (
              <div className="space-y-2">
                {form.rules.map((rule) => {
                  const cfg = RULE_TYPES.find((r) => r.value === rule.type)!;
                  return (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      config={cfg}
                      onPatch={(p) => patchRule(rule.id, p)}
                      onRemove={() => removeRule(rule.id)}
                    />
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Select
                value={addType}
                onValueChange={(v) => setAddType(v as RoomRuleType)}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Select rule type to add…" />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((rt) => (
                    <SelectItem
                      key={rt.value}
                      value={rt.value}
                      className="text-xs"
                    >
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!addType}
                onClick={addRule}
                className="h-8 shrink-0 px-3"
              >
                <Plus className="mr-1 size-3" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => onSave(form, editing ? 0 : unitCount)}
          >
            {editing
              ? "Save Changes"
              : `Create with ${unitCount} Unit${unitCount > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Rule row ───────────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  config,
  onPatch,
  onRemove,
}: {
  rule: RoomRule;
  config: RuleConfig;
  onPatch: (p: Partial<RoomRule>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-muted/20 space-y-2.5 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{config.label}</span>
        <div className="flex items-center gap-2">
          <Switch
            checked={rule.enabled}
            onCheckedChange={(v) => onPatch({ enabled: v })}
            className="scale-75"
          />
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {config.valueType === "number" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={typeof rule.value === "number" ? rule.value : ""}
            onChange={(e) =>
              onPatch({ value: parseFloat(e.target.value) || 0 })
            }
            placeholder={config.placeholder}
            className="h-7 w-24 text-xs"
          />
          {config.unit && (
            <span className="text-muted-foreground text-xs">{config.unit}</span>
          )}
        </div>
      )}

      {config.valueType === "select" && config.options && (
        <Select
          value={String(rule.value)}
          onValueChange={(v) => onPatch({ value: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {config.options.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="space-y-1">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Client message when blocked
        </p>
        <Input
          value={rule.clientMessage}
          onChange={(e) => onPatch({ clientMessage: e.target.value })}
          placeholder="Message shown to clients when this rule blocks their booking…"
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}
