"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface AccessDeniedProps {
  message?: string;
  showBackButton?: boolean;
}

export function AccessDenied({
  message = "You don't have permission to access this page.",
  showBackButton = true,
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          {showBackButton && (
            <Button
              onClick={() => router.push("/facility/dashboard")}
              variant="outline"
            >
              Go to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
