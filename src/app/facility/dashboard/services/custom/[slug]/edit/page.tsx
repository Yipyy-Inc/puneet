"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditCustomServicePage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    // Module structure editing is now managed by super admin only
    // Facility admin can still manage operational aspects (rates, tasks, bookings)
    router.replace(`/facility/dashboard/services/custom/${slug}`);
  }, [router, slug]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground text-sm">
        Redirecting... Module configuration is managed by your platform
        administrator.
      </p>
    </div>
  );
}
