import { Suspense } from "react";

import { RequireAnyPermission } from "@/components/employee/AccessRestricted";
import { CheckInKiosk } from "@/components/yipyygo/kiosk/check-in-kiosk";
import { ANY_CHECK_IN_PERMISSION } from "@/lib/yipyy-go/check-in-writer";

// The check-in desk in the staff portal. Every member who can check any
// service in reaches it; each service’s own write still decides the arrival.
export default function EmployeeCheckInPage() {
  return (
    <RequireAnyPermission permKeys={ANY_CHECK_IN_PERMISSION}>
      <div className="container mx-auto p-4 md:p-6">
        <Suspense>
          <CheckInKiosk />
        </Suspense>
      </div>
    </RequireAnyPermission>
  );
}
