"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-destructive text-6xl font-bold">Oops!</h1>
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred. Our team has been notified.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
