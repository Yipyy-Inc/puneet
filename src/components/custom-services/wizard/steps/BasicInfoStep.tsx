"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Building } from "lucide-react";
import { IconPicker } from "../IconPicker";
import { CategorySelector } from "../CategorySelector";
import { FacilityMultiSelect } from "../FacilityMultiSelect";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { generateSlug } from "@/lib/service-registry";
import { getCategoryMeta } from "@/data/custom-services";
import { cn } from "@/lib/utils";
import type {
  CustomServiceModule,
  CustomServiceCategory,
} from "@/types/facility";

interface BasicInfoStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
  /** Show facility selector (super admin only) */
  showFacilitySelector?: boolean;
}

export function BasicInfoStep({
  data,
  onChange,
  showFacilitySelector = false,
}: BasicInfoStepProps) {
  // Auto-generate slug from name (only if slug hasn't been manually changed)
  const handleNameChange = (name: string) => {
    const autoSlug = generateSlug(name);
    onChange({ name, slug: autoSlug });
  };

  const handleSlugChange = (slug: string) => {
    onChange({ slug: generateSlug(slug) });
  };

  const selectedMeta = getCategoryMeta(data.category);

  // Live preview of the sidebar entry: custom label falls back to full name.
  const sidebarPreviewLabel = data.sidebarLabel?.trim() || data.name;

  // Keep facilityId (primary) in sync with the first selected facility.
  const handleFacilitiesChange = (facilityIds: number[]) => {
    onChange({ facilityIds, facilityId: facilityIds[0] ?? 0 });
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

      {/* Facility selector — super admin only */}
      {showFacilitySelector && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            <Building className="mr-1.5 inline size-4" />
            Assign to Facilities <span className="text-destructive">*</span>
          </Label>
          <p className="text-muted-foreground text-xs">
            Select one or more facilities this custom module will be available
            to. Modules like Pet Taxi can apply to several facilities at once.
          </p>
          <FacilityMultiSelect
            value={data.facilityIds ?? [data.facilityId]}
            onChange={handleFacilitiesChange}
          />
        </div>
      )}

      {showFacilitySelector && <Separator />}

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

        {/* Module Type indicator — auto-set from the selected category */}
        {selectedMeta && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              selectedMeta.tintClass,
              "border-border/60",
            )}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md",
                selectedMeta.iconContainerClass,
              )}
            >
              <DynamicIcon name={selectedMeta.icon} className="size-4" />
            </div>
            <div className="space-y-0.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Module Type
                </span>
                <span className={selectedMeta.textClass}>
                  {selectedMeta.name}
                </span>
              </p>
              <p className="text-muted-foreground text-xs/snug">
                {selectedMeta.practiceExplanation}
              </p>
            </div>
          </div>
        )}
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

      {/* Preview (sidebar) name */}
      <div className="space-y-1.5">
        <Label htmlFor="service-sidebar-label">Preview Name</Label>
        <Input
          id="service-sidebar-label"
          placeholder={data.name || "e.g. Pool Sessions"}
          value={data.sidebarLabel ?? ""}
          onChange={(e) => onChange({ sidebarLabel: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground text-xs">
            How this module appears in the facility sidebar navigation. Leave
            empty to use the full service name.
          </p>
          {sidebarPreviewLabel && (
            <span className="border-border bg-muted/40 text-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
              <DynamicIcon name={data.icon} className="size-3.5" />
              {sidebarPreviewLabel}
            </span>
          )}
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
