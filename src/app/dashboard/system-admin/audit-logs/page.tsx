import { AuditLogsManager } from "@/components/system-admin/AuditLogsManager";

export default function AuditLogsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      <AuditLogsManager />
    </div>
  );
}
