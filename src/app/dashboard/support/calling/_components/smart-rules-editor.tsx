"use client";

import { useState } from "react";
import { GripVertical, Pencil, Plus, Trash2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SmartRoutingRule } from "@/types/support-ivr";
import { moveItem, useDragReorder } from "./use-drag-reorder";

export function SmartRulesEditor({
  rules,
  onChange,
}: {
  rules: SmartRoutingRule[];
  onChange: (rules: SmartRoutingRule[]) => void;
}) {
  const drag = useDragReorder((from, to) =>
    onChange(moveItem(rules, from, to)),
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  function update(id: string, patch: Partial<SmartRoutingRule>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: string) {
    onChange(rules.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
  }
  function add() {
    const id = `rule-${Date.now()}`;
    onChange([
      ...rules,
      {
        id,
        name: "New Rule",
        condition: "Define a condition → Route to …",
        enabled: true,
      },
    ]);
    setEditingId(id);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Zap className="size-4 text-amber-500" />
            Smart Routing Rules
          </h3>
          <p className="text-muted-foreground text-xs">
            Evaluated in order, before the IVR menu plays.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1.5 size-4" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-2">
        {rules.map((r, i) => (
          <div
            key={r.id}
            {...drag.getRowProps(i)}
            className={cn(
              "bg-card rounded-xl border p-3 transition-colors",
              drag.over === i && drag.from !== i && "border-primary",
              drag.from === i && "opacity-50",
              !r.enabled && "opacity-70",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                {...drag.getHandleProps(i)}
                className="text-muted-foreground/40 cursor-grab"
                aria-label="Drag to reorder"
              >
                <GripVertical className="size-4" />
              </span>
              <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                {editingId === r.id ? (
                  <div className="space-y-2">
                    <Input
                      value={r.name}
                      onChange={(e) => update(r.id, { name: e.target.value })}
                      placeholder="Rule name"
                      className="h-8"
                    />
                    <Input
                      value={r.condition}
                      onChange={(e) =>
                        update(r.id, { condition: e.target.value })
                      }
                      placeholder="Condition → destination"
                      className="h-8 text-xs"
                    />
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {r.condition}
                    </p>
                  </>
                )}
              </div>
              <Switch
                checked={r.enabled}
                onCheckedChange={(v) => update(r.id, { enabled: v })}
                aria-label="Rule enabled"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                aria-label="Edit rule"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground/50 hover:text-destructive size-8"
                onClick={() => remove(r.id)}
                aria-label="Delete rule"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-muted-foreground rounded-xl border border-dashed py-6 text-center text-sm">
            No smart rules yet.
          </p>
        )}
      </div>
    </div>
  );
}
