import { CustomReportsClient } from "./_components/custom-reports-client";
import { PageHeader } from "@/components/ui/page-header";

export default function CustomReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Report Builder"
        description="Build, run, save and schedule custom reports from live platform data"
      />

      <CustomReportsClient />
    </div>
  );
}
