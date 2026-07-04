import type { Metadata } from "next";

import { ChangePlanView } from "./_components/change-plan-view";

export const metadata: Metadata = {
  title: "Change Plan — Yipyy",
};

// Owner-only via ../../layout.tsx (requireFacilityOwner → 403 for non-owners).
export default function ChangePlanPage() {
  return <ChangePlanView />;
}
