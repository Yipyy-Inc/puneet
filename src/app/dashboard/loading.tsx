export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-56 animate-pulse rounded-sm" />
        <div className="bg-muted h-4 w-80 animate-pulse rounded-sm" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-[76px] animate-pulse rounded-xl" />
        ))}
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted h-[92px] animate-pulse rounded-xl" />
        ))}
      </div>

      {/* Needs attention */}
      <div className="bg-muted h-72 animate-pulse rounded-xl" />

      {/* Activity feed */}
      <div className="bg-muted h-96 animate-pulse rounded-xl" />
    </div>
  );
}
