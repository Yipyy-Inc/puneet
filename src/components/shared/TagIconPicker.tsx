"use client";

import { useState, createElement } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveIcon, AVAILABLE_ICONS } from "@/lib/service-registry";
import { getContrastTextColor } from "@/lib/color-utils";
import { TAG_COLOR_PRESETS } from "@/lib/tag-colors";
import { useShellText } from "@/lib/shell/use-shell-text";
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
  const t = useShellText("primitives");
  const [search, setSearch] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [hexError, setHexError] = useState(false);

  const filteredIcons = AVAILABLE_ICONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  const textColor = getContrastTextColor(selectedColor);

  // TAG_COLOR_PRESETS is a module constant, so its labels are English. Six
  // fixed names, resolved by key; anything the catalogue does not know keeps
  // the constant's own word rather than showing a raw key.
  const presetLabel = (label: string | undefined) => {
    if (!label) return undefined;
    // french-ok: a catalogue key built from the constant's own word, never read
    const key = `tagColour${label}`;
    const translated = t(key);
    return translated === key ? label : translated;
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm"
          style={{ backgroundColor: selectedColor, color: textColor }}
        >
          {createElement(resolveIcon(selectedIcon), {
            className: "size-6",
          })}
        </div>
        <div>
          <p className="text-sm font-medium">{selectedIcon}</p>
          <p className="text-muted-foreground text-xs">
            {presetLabel(
              TAG_COLOR_PRESETS.find((c) => c.hex === selectedColor)?.label,
            ) ?? selectedColor}
          </p>
        </div>
      </div>

      {/* Color selector */}
      <div>
        <Label className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
          {t("colour")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLOR_PRESETS.map((opt) => {
            const isSelected = opt.hex === selectedColor;
            return (
              <button
                key={opt.hex}
                type="button"
                onClick={() => onColorChange(opt.hex)}
                title={presetLabel(opt.label)}
                aria-label={presetLabel(opt.label)}
                className={cn(
                  `focus:ring-ring relative size-9 rounded-lg shadow-sm transition-transform hover:scale-110 focus:ring-2 focus:ring-offset-1 focus:outline-none`,
                  isSelected && "ring-ring ring-2 ring-offset-1",
                )}
                style={{ backgroundColor: opt.hex }}
              >
                {isSelected && (
                  <Check
                    className="absolute inset-0 m-auto size-3.5"
                    style={{ color: getContrastTextColor(opt.hex) }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* Custom hex input */}
        <div className="mt-2 flex items-center gap-2">
          <Input
            aria-label={t("customHexColour")}
            placeholder="#RRGGBB"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              setHexError(false);
            }}
            className={cn("h-7 w-28 text-xs", hexError && "border-destructive")}
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
            className="text-primary text-xs hover:underline"
          >
            {t("applyColour")}
          </button>
          {hexError && (
            <span className="text-destructive text-[10px]">
              {t("invalidHex")}
            </span>
          )}
        </div>
      </div>

      {/* Icon search */}
      <div>
        <Label className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
          {t("icon")}
        </Label>
        <div className="relative mb-3">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder={t("searchIcons")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8">
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
                  `hover:bg-accent focus:ring-ring flex size-10 items-center justify-center rounded-lg border transition-all focus:ring-2 focus:outline-none`,
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground",
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
          {filteredIcons.length === 0 && (
            <div className="text-muted-foreground col-span-6 py-4 text-center text-sm sm:col-span-8">
              {t("noIconsMatch").replace("{query}", search)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
