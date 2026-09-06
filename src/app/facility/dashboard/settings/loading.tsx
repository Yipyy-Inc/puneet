import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// A settings section on its way in.
//
// §5d2's ladder has two loading rungs and this is the second one:
//
//   Loading · first paint      `loading` pose   a whole view with no data yet
//   Loading · refresh over data  — none —       skeletons and the sticky header
//
// The chrome is already on screen — `settings/layout.tsx` renders the rail,
// the header naming the section and "← All settings" — so this is never the
// first rung. A pose here would be a mascot appearing over a page that is
// mostly already drawn, which §5d1 rules out ("never over data already on
// screen").
//
// The shape is the shape a section actually has: cards down a column. It is
// deliberately not a spinner — a skeleton says how much is coming.
// ============================================================================
export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Two cards is the median section. Three would over-promise on the
          short ones and under-promise on nothing. */}
      {[0, 1].map((card) => (
        <div
          key={card}
          className="border-line bg-card shadow-card space-y-4 rounded-2xl border p-[22px]"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
                <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
