import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-primary text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          Sorry, the page you&apos;re looking for doesn&apos;t exist. It might
          have been moved or deleted.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
