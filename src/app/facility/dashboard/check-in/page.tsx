import { Suspense } from "react";

import { CheckInKiosk } from "@/components/yipyygo/kiosk/check-in-kiosk";

export default function FacilityCheckInPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <Suspense>
        <CheckInKiosk />
      </Suspense>
    </div>
  );
}
