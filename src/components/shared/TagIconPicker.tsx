"use client";

import { useState, createElement } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveIcon, AVAILABLE_ICONS } from "@/lib/service-registry";
import { getContrastTextColor } from "@/lib/color-utils";
import { TAG_COLOR_PRESETS } from "@/data/tags-notes";
import { cn } from "@/lib/utils";

interface TagIconPickerProps {
  selectedIcon: string;
  selectedColor: string; // hex
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

export function TagIconPicker({
  selectedIcon,
  selectedColor,
  onIconChange,
  onColorChange,
}: TagIconPickerProps) {
  const [search, setSearch] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [hexError, setHexError] = useState(false);

  const filteredIcons = AVAILABLE_ICONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  const textColor = getContrastTextColor(selectedColor);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm shrink-0"
          style={{ backgroundColor: selectedColor, color: textColor }}
        >
          {createElement(resolveIcon(selectedIcon), {
            className: "h-6 w-6",
          })}
        </div>
        <div>
          <p className="text-sm font-medium">{selectedIcon}</p>
          <p className="text-xs text-muted-foreground">
            {TAG_COLOR_PRESETS.find((c) => c.hex === selectedColor)?.label ??
              selectedColor}
          </p>
        </div>
      </div>

      {/* Color selector */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Color
        </Label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLOR_PRESETS.map((opt) => {
            const isSelected = opt.hex === selectedColor;
            return (
              <button
                key={opt.hex}
                type="button"
                onClick={() => onColorChange(opt.hex)}
                title={opt.label}
                aria-label={opt.label}
                className={cn(
                  "h-9 w-9 rounded-lg shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 relative",
                  isSelected && "ring-2 ring-ring ring-offset-1",
                )}
                style={{ backgroundColor: opt.hex }}
              >
                {isSelected && (
                  <Check
                    className="h-3.5 w-3.5 absolute inset-0 m-auto"
                    style={{ color: getContrastTextColor(opt.hex) }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* Custom hex input */}
        <div className="flex items-center gap-2 mt-2">
          <Input
            aria-label="Custom hex color"
            placeholder="#RRGGBB"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              setHexError(false);
            }}
            className={cn("h-7 text-xs w-28", hexError && "border-destructive")}
          />
          <button
            type="button"
            onClick={() => {
              if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
                onColorChange(customColor);
                setCustomColor("");
                setHexError(false);
              } else {
                setHexError(true);
              }
            }}
            className="text-xs text-primary hover:underline"
          >
            Apply
          </button>
          {hexError && (
            <span className="text-[10px] text-destructive">Invalid hex</span>
          )}
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

        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto">
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
                  "flex h-10 w-10 items-center justify-center rounded-lg border transition-all hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
          {filteredIcons.length === 0 && (
            <div className="col-span-6 sm:col-span-8 py-4 text-center text-sm text-muted-foreground">
              No icons match &quot;{search}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
