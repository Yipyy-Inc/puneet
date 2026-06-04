"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LoyaltyPortalHeaderPreview } from "@/components/loyalty/LoyaltyPortalHeaderPreview";

export interface ProgramBasics {
  programName: string;
  tagline: string;
  primaryColor: string;
  programIcon: string;
}

const NAME_MAX = 40;
const TAGLINE_MAX = 80;

const COLOR_PRESETS = [
  "#6366F1",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

const ICON_PRESETS = [
  "🐾",
  "⭐",
  "🦴",
  "🎁",
  "💎",
  "🏆",
  "❤️",
  "🐶",
  "🐱",
  "✨",
  "👑",
  "🎉",
];

export function ProgramBasicsStep({
  value,
  onChange,
}: {
  value: ProgramBasics;
  onChange: (v: ProgramBasics) => void;
}) {
  const patch = (p: Partial<ProgramBasics>) => onChange({ ...value, ...p });
  const nameMissing = value.programName.trim().length === 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Form */}
      <div className="space-y-6">
        {/* Program name */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="program-name">
              Program name <span className="text-destructive">*</span>
            </Label>
            <span
              className={cn(
                "text-muted-foreground text-xs tabular-nums",
                value.programName.length >= NAME_MAX && "text-amber-600",
              )}
            >
              {value.programName.length}/{NAME_MAX}
            </span>
          </div>
          <Input
            id="program-name"
            value={value.programName}
            maxLength={NAME_MAX}
            onChange={(e) =>
              patch({ programName: e.target.value.slice(0, NAME_MAX) })
            }
            placeholder="e.g., Paws & Play Rewards"
            aria-invalid={nameMissing}
          />
          {nameMissing && (
            <p className="text-destructive text-xs">
              A program name is required.
            </p>
          )}
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="program-tagline">Tagline (optional)</Label>
            <span
              className={cn(
                "text-muted-foreground text-xs tabular-nums",
                value.tagline.length >= TAGLINE_MAX && "text-amber-600",
              )}
            >
              {value.tagline.length}/{TAGLINE_MAX}
            </span>
          </div>
          <Input
            id="program-tagline"
            value={value.tagline}
            maxLength={TAGLINE_MAX}
            onChange={(e) =>
              patch({ tagline: e.target.value.slice(0, TAGLINE_MAX) })
            }
            placeholder="Earn points on every visit and redeem them for rewards"
          />
        </div>

        {/* Primary color */}
        <div className="space-y-2">
          <Label>Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick primary color"
              value={value.primaryColor}
              onChange={(e) => patch({ primaryColor: e.target.value })}
              className="size-9 cursor-pointer rounded-md border bg-transparent p-0.5"
            />
            <Input
              value={value.primaryColor}
              onChange={(e) => patch({ primaryColor: e.target.value })}
              className="w-32 font-mono"
              aria-label="Primary color hex"
            />
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use color ${c}`}
                  onClick={() => patch({ primaryColor: c })}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform hover:scale-110",
                    value.primaryColor.toLowerCase() === c.toLowerCase()
                      ? "border-foreground"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Program icon */}
        <div className="space-y-2">
          <Label>Program icon</Label>
          <div className="flex flex-wrap gap-2">
            {ICON_PRESETS.map((icon) => (
              <button
                key={icon}
                type="button"
                aria-label={`Use icon ${icon}`}
                onClick={() => patch({ programIcon: icon })}
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg border text-xl transition-all hover:scale-105",
                  value.programIcon === icon
                    ? "border-primary ring-primary/30 ring-2"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <span aria-hidden="true">{icon}</span>
              </button>
            ))}
          </div>
          <Input
            value={value.programIcon}
            onChange={(e) => patch({ programIcon: e.target.value.slice(0, 4) })}
            className="w-24 text-center text-lg"
            aria-label="Custom icon"
            placeholder="🐾"
          />
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Live preview · customer portal
        </p>
        <div className="lg:sticky lg:top-40">
          <LoyaltyPortalHeaderPreview
            programName={value.programName}
            tagline={value.tagline}
            primaryColor={value.primaryColor || "#6366F1"}
            programIcon={value.programIcon}
          />
        </div>
      </div>
    </div>
  );
}
