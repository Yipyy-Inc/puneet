"use client";

import { useState } from "react";

import { YipyyGoSettings } from "@/components/yipyygo/YipyyGoSettings";
import { getYipyyGoConfig } from "@/data/yipyygo-config";

// YipyyGo Settings Wrapper Component
export function YipyyGoSettingsWrapper() {
  const facilityId = 11; // TODO: Get from auth context
  const [config, setConfig] = useState(() => getYipyyGoConfig(facilityId)!);

  return (
    <YipyyGoSettings
      config={config}
      onConfigChange={setConfig}
      facilityId={facilityId}
    />
  );
}
