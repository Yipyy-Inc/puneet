import { Suspense } from "react";

import { SystemConfiguration } from "@/components/system-admin/SystemConfiguration";

export default function SystemConfigPage() {
  return (
    <div className="bg-gradient-mesh bg-background min-h-screen flex-1 p-6 lg:p-8">
      {/* Suspense boundary required: SystemConfiguration reads ?tab via
          useSearchParams for deep-linking (e.g. from the Platform Health tile). */}
      <Suspense fallback={null}>
        <SystemConfiguration />
      </Suspense>
    </div>
  );
}
