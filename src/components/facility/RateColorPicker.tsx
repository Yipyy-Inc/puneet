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
      <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
        {BRAND_COLOR_PALETTE.map((color) => (
          <TooltipProvider key={color.hex} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(color.hex)}
                  className={cn(
                    "size-7 rounded-lg transition-all duration-200 flex items-center justify-center",
                    "hover:scale-110 active:scale-95 ring-1",
                    value === color.hex
                      ? "ring-2 ring-offset-2 ring-slate-900 shadow-md"
                      : "ring-slate-200/60 hover:ring-slate-300 shadow-sm hover:shadow-md",
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
