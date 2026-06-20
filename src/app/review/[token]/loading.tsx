import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="via-background to-background flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-linear-to-b from-amber-50 px-4 dark:from-amber-950/20">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    </div>
  );
}
