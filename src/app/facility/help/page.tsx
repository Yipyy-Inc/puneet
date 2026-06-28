import type { Metadata } from "next";

import { HelpCenterClient } from "./_components/help-center-client";

export const metadata: Metadata = {
  title: "Help Center — Yipyy",
};

export default function FacilityHelpPage() {
  return <HelpCenterClient />;
}
