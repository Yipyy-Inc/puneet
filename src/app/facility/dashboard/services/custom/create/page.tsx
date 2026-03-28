"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateCustomServicePage() {
  const router = useRouter();

  useEffect(() => {
    // Custom module creation is now managed by super admin only
    router.replace("/facility/dashboard/services/custom");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground text-sm">
        Redirecting... Custom module creation is managed by your platform
        administrator.
      </p>
    </div>
  );
}
