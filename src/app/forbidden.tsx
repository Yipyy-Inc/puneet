import Link from "next/link";
import { ShieldX } from "lucide-react";

// Rendered (with HTTP 403) whenever a server component calls forbidden().
// Currently only the facility Owner Account section uses it.
export default function Forbidden() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
        <ShieldX className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">403 — Access denied</h1>
        <p className="text-muted-foreground text-sm">
          This section is only accessible to the facility owner.
        </p>
      </div>
      <Link
        href="/facility/dashboard"
        className="text-primary text-sm font-medium underline-offset-4 hover:underline"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
