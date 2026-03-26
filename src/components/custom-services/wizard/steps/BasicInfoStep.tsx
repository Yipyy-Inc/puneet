"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { IconPicker } from "../IconPicker";
import { CategorySelector } from "../CategorySelector";
import { generateSlug } from "@/lib/service-registry";
import type { CustomServiceModule, CustomServiceCategory } from "@/lib/types";

interface BasicInfoStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  // Auto-generate slug from name (only if slug hasn't been manually changed)
  const handleNameChange = (name: string) => {
    const autoSlug = generateSlug(name);
    onChange({ name, slug: autoSlug });
  };

  const handleSlugChange = (slug: string) => {
    onChange({ slug: generateSlug(slug) });
  };

  const handleCategoryChange = (category: CustomServiceCategory) => {
    // Set category defaults
    const updates: Partial<CustomServiceModule> = { category };

    if (category === "stay_based") {
      updates.stayBased = { ...data.stayBased, enabled: true };
      updates.onlineBooking = { ...data.onlineBooking, enabled: true };
    } else if (category === "addon_only") {
      updates.onlineBooking = { ...data.onlineBooking, enabled: false };
      updates.stayBased = { ...data.stayBased, enabled: false };
    } else if (category === "transport") {
      updates.calendar = { ...data.calendar, assignedTo: "resource" };
    }

    onChange(updates);
  };

  return (
    <div className="space-y-6">
      {/* First-time hint — only when name is empty (new module) */}
      {!data.name && (
        <div className="border-primary/20 bg-primary/5 dark:bg-primary/10 rounded-lg border p-4">
          <p className="text-foreground text-sm font-medium">
            Name it, categorize it, and the wizard will configure everything
            else.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Pick a category first — it sets smart defaults for scheduling,
            check-in, pricing, and staffing so you can skip what doesn&apos;t
            apply.
          </p>
        </div>
      )}

      {/* Category selection */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Service Category</Label>
        <p className="text-muted-foreground text-xs">
          The category determines default settings and how the service
          integrates with your workflows.
        </p>
        <CategorySelector
          selected={data.category}
          onChange={handleCategoryChange}
        />
      </div>

      <Separator />

      {/* Name + Slug */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="service-name">
            Service Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="service-name"
            placeholder="e.g. Yoda's Splash"
            value={data.name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Shown to clients on booking pages.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-slug">URL Slug</Label>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground shrink-0 text-sm">
              /services/
            </span>
            <Input
              id="service-slug"
              placeholder="yodas-splash"
              value={data.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Auto-generated. Only lowercase letters, numbers, hyphens.
          </p>
        </div>
      </div>

      {/* Icon Picker */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Icon & Color</Label>
        <p className="text-muted-foreground text-xs">
          Choose an icon and gradient color shown on cards and the sidebar.
        </p>
        <div className="border-border bg-card rounded-xl border p-4">
          <IconPicker
            selectedIcon={data.icon}
            selectedColorFrom={data.iconColor}
            selectedColorTo={data.iconColorTo}
            onIconChange={(icon) => onChange({ icon })}
            onColorChange={(iconColor, iconColorTo) =>
              onChange({ iconColor, iconColorTo })
            }
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="service-description">
          Public Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="service-description"
          placeholder="Describe what clients will experience during this service..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="resize-none"
        />
        <p className="text-muted-foreground text-xs">
          Displayed to clients on the online booking page.
        </p>
      </div>

      {/* Internal Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="service-notes">Internal Notes</Label>
        <Textarea
          id="service-notes"
          placeholder="Notes visible only to staff, e.g. setup requirements..."
          value={data.internalNotes ?? ""}
          onChange={(e) => onChange({ internalNotes: e.target.value })}
          rows={2}
          className="resize-none"
        />
        <p className="text-muted-foreground text-xs">
          Not visible to clients. Only staff and admins can see this.
        </p>
      </div>
    </div>
  );
}
