import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================================================
// The shell every auth screen sits in.
//
// Eight pages had eight copies of this markup, which is how the customer login
// and the groomer login drifted into using different padding, different icon
// offsets and different error styling for the same job. One shell, one set of
// spacing decisions.
//
// No "use client": this is presentational, so a Server Component page can use
// it directly and only the interactive form inside pays for hydration.
// ============================================================================

export function AuthBrandLogo() {
  return (
    <Image
      src="/yipyy-transparent.png"
      alt="Yipyy"
      width={120}
      height={48}
      className="h-12 w-auto"
      // Above the fold on every auth screen, so it is the LCP element.
      priority
    />
  );
}

export function AuthCard({
  title,
  description,
  brand,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Defaults to the Yipyy wordmark; portals with their own mark pass it in. */
  brand?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            {brand ?? <AuthBrandLogo />}
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}
