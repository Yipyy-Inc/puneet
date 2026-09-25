"use client";

import { useState, useEffect } from "react";

import { SpaceTypeField } from "@/components/rooms/SpaceTypeField";
import { UnitNamingField } from "@/components/rooms/UnitNamingField";
import type { UnitNaming } from "@/lib/api/lodging-units";
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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { RoomCategory, RoomCategoryColor } from "@/types/rooms";
import { RoomImageUpload } from "@/components/rooms/RoomImageUpload";
import { LodgingEligibilityField } from "@/components/rooms/LodgingEligibilityField";
import {
  limitsConflict,
  weightLimitsOf,
} from "@/lib/rooms/lodging-eligibility";

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
    active: true,
    rules: [],
    defaultCapacity: 1,
    spaceType: "room",
    defaultBasePrice: undefined,
    visibleToClients: true,
    locationPricing: [],
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  editing: RoomCategory | null;
  facilityId?: number;
  /** True while the save is in flight — the button says so and refuses a second. */
  saving?: boolean;
  onClose: () => void;
  /**
   * When creating, `naming` says how many units to generate and what to call
   * them — MoéGo's quantity, prefix and starting number. Editing passes
   * `{ count: 0 }`: the units already exist and are edited one at a time.
   */
  onSave: (cat: RoomCategory, naming: UnitNaming) => void;
}

// ── Dialog ─────────────────────────────────────────────────────────────────────

export function CategoryFormDialog({
  open,
  editing,
  facilityId = 11,
  saving = false,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<RoomCategory>(() =>
    blankCategory(facilityId),
  );
  const [unitCount, setUnitCount] = useState(1);
  // MoéGo's Prefix and starting number. Empty and 1 reproduce its own
  // "1, 2, 3" example, which is the sensible default for a small facility.
  const [unitPrefix, setUnitPrefix] = useState("");
  const [unitStart, setUnitStart] = useState(1);

  useEffect(() => {
    setForm(
      editing
        ? { ...editing, rules: editing.rules.map((r) => ({ ...r })) }
        : blankCategory(facilityId),
    );
    setUnitCount(1);
  }, [editing, open, facilityId]);

  // A lowest weight above the highest admits no pet at all — refused here,
  // where the field already says why, rather than saved and discovered later.
  const valid =
    form.name.trim().length > 0 && !limitsConflict(weightLimitsOf(form.rules));

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

            {/* MoéGo asks the space type before the capacity, because the
                capacity means a different thing depending on the answer. */}
            <SpaceTypeField
              spaceType={form.spaceType ?? "room"}
              maxPetsPerArea={form.maxPetsPerArea}
              defaultCapacity={form.defaultCapacity}
              onChange={(patch) => setForm({ ...form, ...patch })}
            />

            {!editing && (
              <UnitNamingField
                count={unitCount}
                prefix={unitPrefix}
                start={unitStart}
                onChange={(patch) => {
                  if (patch.count !== undefined) setUnitCount(patch.count);
                  if (patch.prefix !== undefined) setUnitPrefix(patch.prefix);
                  if (patch.start !== undefined) setUnitStart(patch.start);
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
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

          {/* Which pets it takes, by size and by kind — written onto the
              rules the booking wizard and the kennel board read. */}
          <LodgingEligibilityField
            rules={form.rules}
            onChange={(rules) => setForm((prev) => ({ ...prev, rules }))}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {/* §5s rule 9: a button with no loading state double-submits, and
              this one waits on two writes (the category, then its units). */}
          <Button
            disabled={!valid || saving}
            onClick={() =>
              onSave(
                form,
                editing
                  ? { count: 0 }
                  : { count: unitCount, prefix: unitPrefix, start: unitStart },
              )
            }
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : editing ? (
              "Save Changes"
            ) : (
              `Create with ${unitCount} Unit${unitCount > 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
