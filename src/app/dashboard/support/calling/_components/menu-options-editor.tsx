"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";

import { DESTINATIONS } from "@/data/support-ivr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { IVRDestination, IVRMenuOption } from "@/types/support-ivr";
import { moveItem, useDragReorder } from "./use-drag-reorder";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

function targetPlaceholder(d: IVRDestination): string {
  switch (d) {
    case "route_staff":
      return "e.g. Available Agent";
    case "route_department":
      return "e.g. Technical Team";
    case "send_sms":
      return "Link to text the caller";
    case "play_recording":
      return "Recording name";
  }
}

export function MenuOptionsEditor({
  menu,
  onChange,
}: {
  menu: IVRMenuOption[];
  onChange: (menu: IVRMenuOption[]) => void;
}) {
  const drag = useDragReorder((from, to) => onChange(moveItem(menu, from, to)));

  function update(id: string, patch: Partial<IVRMenuOption>) {
    onChange(menu.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function remove(id: string) {
    onChange(menu.filter((o) => o.id !== id));
  }
  function add() {
    const used = new Set(menu.map((o) => o.key));
    const key = KEYS.find((k) => !used.has(k)) ?? "1";
    onChange([
      ...menu,
      {
        id: `opt-${Date.now()}`,
        key,
        label: "New Option",
        destination: "route_department",
        target: "",
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Menu Options</h3>
        <Button size="sm" onClick={add}>
          <Plus className="mr-1.5 size-4" />
          Add Option
        </Button>
      </div>

      <div className="space-y-2">
        {menu.map((o, i) => (
          <div
            key={o.id}
            {...drag.getRowProps(i)}
            className={cn(
              "bg-card rounded-xl border p-3 transition-colors",
              drag.over === i && drag.from !== i && "border-primary",
              drag.from === i && "opacity-50",
            )}
          >
            <div className="flex items-start gap-2">
              <span
                {...drag.getHandleProps(i)}
                className="text-muted-foreground/40 mt-2 cursor-grab"
                aria-label="Drag to reorder"
              >
                <GripVertical className="size-4" />
              </span>
              <Select
                value={o.key}
                onValueChange={(v) => update(o.id, { key: v })}
              >
                <SelectTrigger className="h-9 w-14 shrink-0 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  value={o.label}
                  onChange={(e) => update(o.id, { label: e.target.value })}
                  placeholder="Option label"
                  className="h-9"
                />
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={o.destination}
                    onValueChange={(v) =>
                      update(o.id, { destination: v as IVRDestination })
                    }
                  >
                    <SelectTrigger className="h-9 min-w-40 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DESTINATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={o.target}
                    onChange={(e) => update(o.id, { target: e.target.value })}
                    placeholder={targetPlaceholder(o.destination)}
                    className="h-9 min-w-40 flex-1"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground/50 hover:text-destructive size-8 shrink-0"
                onClick={() => remove(o.id)}
                aria-label="Delete option"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {menu.length === 0 && (
          <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
            No menu options. Add one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
