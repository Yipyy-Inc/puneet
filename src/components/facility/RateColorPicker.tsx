"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { BRAND_COLOR_PALETTE } from "@/lib/operations-calendar";

interface RateColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

export function RateColorPicker({
  value,
  onChange,
  label,
}: RateColorPickerProps) {
  // The default was `label = "Color"` — a DEFAULT PARAMETER, which is exactly
  // the shape check:ui-french calls out in its header as how the global search
  // read as translated while it was not. Four of the eight call sites pass a
  // label; the other four got the English word.
  const t = useSettingsText().section("service-modules");
  return (
    <div className="space-y-2">
      <Label>{label ?? t("colour")}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
        {BRAND_COLOR_PALETTE.map((color) => (
          <TooltipProvider key={color.hex} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(color.hex)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg transition-all duration-200 max-lg:size-12",
                    "ring-1",
                    value === color.hex
                      ? "shadow-md ring-2 ring-slate-900 ring-offset-2"
                      : "shadow-sm ring-slate-200/60 hover:shadow-md hover:ring-slate-300",
                  )}
                  style={{ backgroundColor: color.hex }}
                >
                  {value === color.hex && (
                    <Check className="size-3.5 text-white drop-shadow-md max-lg:size-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-medium">
                {color.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
