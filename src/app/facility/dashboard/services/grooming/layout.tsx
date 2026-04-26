import { Scissors } from "lucide-react";
import { GroomingNav } from "@/components/facility/grooming/grooming-nav";

export default function GroomingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-pink-500 to-rose-500">
              <Scissors className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Grooming Module
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage appointments, stylists, and grooming services
              </p>
            </div>
          </div>
        </div>
        <GroomingNav />
      </div>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
