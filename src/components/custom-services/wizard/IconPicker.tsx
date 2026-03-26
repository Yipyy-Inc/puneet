"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveIcon, AVAILABLE_ICONS } from "@/lib/service-registry";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
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

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
          style={selectedGradient}
        >
          <DynamicIcon name={selectedIcon} className="size-7" />
        </div>
        <div>
          <p className="text-sm font-medium">{selectedIcon}</p>
          <p className="text-muted-foreground text-xs">
            {COLOR_GRADIENT_OPTIONS.find(
              (c) => c.from === selectedColorFrom && c.to === selectedColorTo,
            )?.label ?? "Custom"}{" "}
            gradient
          </p>
        </div>
      </div>

      {/* Color selector */}
      <div>
        <Label className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
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
                  `focus:ring-ring relative h-11 w-11 rounded-lg shadow-sm transition-transform hover:scale-110 focus:ring-2 focus:ring-offset-1 focus:outline-none`,
                  isSelected && "ring-ring ring-2 ring-offset-1",
                )}
                style={getGradientStyle(opt.from, opt.to)}
              >
                {isSelected && (
                  <Check className="absolute inset-0 m-auto size-3.5 text-white" />
                )}
                <span className="sr-only">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon search */}
      <div>
        <Label className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
          Icon
        </Label>
        <div className="relative mb-3">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="grid max-h-52 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8">
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
                  `hover:bg-accent focus:ring-ring flex h-11 w-11 items-center justify-center rounded-lg border transition-all focus:ring-2 focus:outline-none`,
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="sr-only">{name}</span>
              </button>
            );
          })}
          {filteredIcons.length === 0 && (
            <div className="text-muted-foreground col-span-6 py-6 text-center text-sm sm:col-span-8">
              No icons match &quot;{search}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
