import { LocationAccessGuard } from "@/components/hq/LocationAccessGuard";
import { HqSidebarNav } from "@/components/hq/HqSidebarNav";

export default function HQLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocationAccessGuard requireHq>
      <div className="flex min-h-full items-stretch">
        <HqSidebarNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </LocationAccessGuard>
  );
}
