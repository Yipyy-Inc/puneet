import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
      <div className="space-y-4 text-center">
        <Loader2 className="text-primary mx-auto h-12 w-12 animate-spin" />
        <h2 className="text-xl font-semibold">Loading...</h2>
        <p className="text-muted-foreground">
          Please wait while we fetch your content.
        </p>
      </div>
    </div>
  );
}
