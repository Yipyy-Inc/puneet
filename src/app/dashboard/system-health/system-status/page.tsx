import { SystemStatus } from "@/components/system-health/SystemStatus";

export default function SystemStatusPage() {
  return (
    <div className="from-background via-background to-muted/20 min-h-screen bg-linear-to-br p-6">
      <SystemStatus />
    </div>
  );
}
