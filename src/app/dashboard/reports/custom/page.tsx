import { CustomReportsClient } from "./_components/custom-reports-client";

export default function CustomReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Report Builder</h1>
        <p className="text-muted-foreground">
          Build, run, save and schedule custom reports from live platform data
        </p>
      </div>

      <CustomReportsClient />
    </div>
  );
}
