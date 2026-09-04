import { BusinessHealthTiles } from "./_components/business-health-tiles";
import { NeedsAttention } from "./_components/needs-attention";
import { ActivityFeed } from "./_components/activity-feed";
import { QuickActions } from "./_components/quick-actions";
import { PageHeader } from "@/components/ui/page-header";

export default function PlatformDashboardPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <PageHeader
        title="Command Center"
        description="Platform-wide health, priorities, and live activity at a glance."
      />

      {/* Zone 4 — Quick actions bar */}
      <QuickActions />

      {/* Zone 1 — Business health tiles */}
      <BusinessHealthTiles />

      {/* Zone 2 — Needs attention */}
      <NeedsAttention />

      {/* Zone 3 — Activity feed */}
      <ActivityFeed />
    </div>
  );
}
