import type { Metadata } from "next";

import { FacilityOnboardingView } from "./_components/facility-onboarding-view";

export const metadata: Metadata = {
  title: "Setup Guide — Yipyy",
};

export default function FacilityOnboardingPage() {
  return <FacilityOnboardingView />;
}
