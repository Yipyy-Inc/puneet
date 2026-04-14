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
import { BRAND_COLOR_PALETTE } from "@/lib/operations-calendar";

interface RateColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

export function RateColorPicker({
  value,
  onChange,
  label = "Color",
}: RateColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
        {BRAND_COLOR_PALETTE.map((color) => (
          <TooltipProvider key={color.hex} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(color.hex)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg transition-all duration-200",
                    "ring-1 hover:scale-110 active:scale-95",
                    value === color.hex
                      ? "shadow-md ring-2 ring-slate-900 ring-offset-2"
                      : "shadow-sm ring-slate-200/60 hover:shadow-md hover:ring-slate-300",
                  )}
                  style={{ backgroundColor: color.hex }}
                >
                  {value === color.hex && (
                    <Check className="size-3.5 text-white drop-shadow-md" />
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
