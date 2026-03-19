"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveIcon, AVAILABLE_ICONS } from "@/lib/service-registry";
import { getGradientStyle } from "@/data/custom-services";
import { cn } from "@/lib/utils";

const COLOR_GRADIENT_OPTIONS: { label: string; from: string; to: string }[] = [
  { label: "Blue", from: "blue-500", to: "indigo-500" },
  { label: "Cyan", from: "cyan-500", to: "blue-500" },
  { label: "Green", from: "green-500", to: "emerald-500" },
  { label: "Purple", from: "purple-500", to: "indigo-500" },
  { label: "Pink", from: "pink-500", to: "orange-500" },
  { label: "Orange", from: "orange-500", to: "yellow-500" },
  { label: "Red", from: "red-500", to: "pink-500" },
  { label: "Teal", from: "teal-500", to: "cyan-500" },
  { label: "Gray", from: "gray-500", to: "gray-400" },
];

interface IconPickerProps {
  selectedIcon: string;
  selectedColorFrom: string;
  selectedColorTo: string;
  onIconChange: (icon: string) => void;
  onColorChange: (from: string, to: string) => void;
}

export function IconPicker({
  selectedIcon,
  selectedColorFrom,
  selectedColorTo,
  onIconChange,
  onColorChange,
}: IconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredIcons = AVAILABLE_ICONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedGradient = getGradientStyle(selectedColorFrom, selectedColorTo);
  const SelectedIcon = resolveIcon(selectedIcon);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-md shrink-0"
          style={selectedGradient}
        >
          <SelectedIcon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-medium">{selectedIcon}</p>
          <p className="text-xs text-muted-foreground">
            {COLOR_GRADIENT_OPTIONS.find(
              (c) => c.from === selectedColorFrom && c.to === selectedColorTo,
            )?.label ?? "Custom"}{" "}
            gradient
          </p>
        </div>
      </div>

      {/* Color selector */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Gradient Color
        </Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_GRADIENT_OPTIONS.map((opt) => {
            const isSelected =
              opt.from === selectedColorFrom && opt.to === selectedColorTo;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onColorChange(opt.from, opt.to)}
                title={opt.label}
                aria-label={opt.label}
                className={cn(
                  "h-11 w-11 rounded-lg shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 relative",
                  isSelected && "ring-2 ring-ring ring-offset-1",
                )}
                style={getGradientStyle(opt.from, opt.to)}
              >
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-white absolute inset-0 m-auto" />
                )}
                <span className="sr-only">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon search */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Icon
        </Label>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-52 overflow-y-auto">
          {filteredIcons.map((name) => {
            const Icon = resolveIcon(name);
            const isSelected = name === selectedIcon;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onIconChange(name)}
                title={name}
                aria-label={name}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg border transition-all hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="sr-only">{name}</span>
              </button>
            );
          })}
          {filteredIcons.length === 0 && (
            <div className="col-span-6 sm:col-span-8 py-6 text-center text-sm text-muted-foreground">
              No icons match &quot;{search}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
