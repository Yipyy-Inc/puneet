"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { usePortalHref } from "@/lib/nav/use-portal-href";
import { useStaffText } from "@/lib/staff/use-staff-text";

/**
 * Said under a kennel class that no active boarding service can be booked
 * into — see `lodgingTypesNoServiceCanBook`. The class still exists and can
 * still hold stays; what it cannot do is be chosen once a service is, so the
 * facility needs to hear it here rather than find it in the booking form.
 *
 * Its own words (`staff.areas.lodgingCoverage`) because the card it sits in
 * still carries English literals the French ratchet counts.
 */
export function NoServiceNotice() {
  const { t } = useStaffText("lodgingCoverage");
  const { href } = usePortalHref();

  return (
    <p className="text-warning mt-3 ml-10 flex items-start gap-2 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        {t("notice")}{" "}
        <Link
          href={href("/facility/dashboard/services/boarding/menu")}
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          {t("link")}
        </Link>
      </span>
    </p>
  );
}
