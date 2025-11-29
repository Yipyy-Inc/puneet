import { SystemStatus } from "@/components/system-health/SystemStatus";

export default function SystemStatusPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 p-6">
      <SystemStatus />
    </div>
  );
}
