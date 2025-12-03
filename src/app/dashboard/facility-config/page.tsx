"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { facilityConfig } from "@/data/facility-config";
import { ServiceSettings } from "@/components/facility-config/ServiceSettings";
import { PricingSettings } from "@/components/facility-config/PricingSettings";
import { BookingRulesSettings } from "@/components/facility-config/BookingRulesSettings";
import { ScheduleSettings } from "@/components/facility-config/ScheduleSettings";
import { PoliciesSettings } from "@/components/facility-config/PoliciesSettings";
import { AdvancedSettings } from "@/components/facility-config/AdvancedSettings";
import { Save, AlertTriangle } from "lucide-react";

type FacilityConfig = typeof facilityConfig;

export default function FacilityConfigPage() {
  const [config, setConfig] = useState<FacilityConfig>(facilityConfig);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    services: true,
    pricing: false,
    booking: false,
    schedules: false,
    policies: false,
    advanced: false,
  });

  const handleSave = () => {
    // TODO: Implement save functionality
  };

  const handleSectionSave = () => {
    // TODO: Implement section-specific save functionality
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{"Facility Configuration"}</h2>
            <p className="text-muted-foreground">{"Configure global settings that apply to all facilities in the platform, including service availability, pricing structures, booking rules, and operational policies."}</p>
          </div>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {"Save All Changes"}
          </Button>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-yellow-800 font-medium">
                {"Warning"}
              </div>
              <div className="text-sm text-yellow-700">
                {"Some configuration changes may be destructive and could affect existing bookings, pricing, or facility operations. Please review changes carefully before saving."}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ServiceSettings
          config={config}
          setConfig={setConfig}
          isOpen={openSections.services}
          onToggle={() => toggleSection("services")}
          onSave={() => handleSectionSave()}
        />

        <PricingSettings
          config={config}
          setConfig={setConfig}
          isOpen={openSections.pricing}
          onToggle={() => toggleSection("pricing")}
          onSave={() => handleSectionSave()}
        />

        <BookingRulesSettings
          config={config}
          setConfig={setConfig}
          isOpen={openSections.booking}
          onToggle={() => toggleSection("booking")}
          onSave={() => handleSectionSave()}
        />

        <ScheduleSettings
          config={config}
          setConfig={setConfig}
          isOpen={openSections.schedules}
          onToggle={() => toggleSection("schedules")}
          onSave={() => handleSectionSave()}
        />

        <PoliciesSettings
          config={config}
          setConfig={setConfig}
          isOpen={openSections.policies}
          onToggle={() => toggleSection("policies")}
          onSave={() => handleSectionSave()}
        />

        <AdvancedSettings
          config={config}
          setConfig={setConfig}
          isOpen={openSections.advanced}
          onToggle={() => toggleSection("advanced")}
          onSave={() => handleSectionSave()}
        />
      </div>
    </div>
  );
}
