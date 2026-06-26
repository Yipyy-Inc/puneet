import { BusinessHealthTiles } from "./_components/business-health-tiles";
import { NeedsAttention } from "./_components/needs-attention";
import { ActivityFeed } from "./_components/activity-feed";
import { QuickActions } from "./_components/quick-actions";

export default function PlatformDashboardPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Command Center
        </h1>
        <p className="text-muted-foreground text-sm">
          Platform-wide health, priorities, and live activity at a glance.
        </p>
      </header>

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
