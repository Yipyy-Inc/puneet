"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function SubmissionsInboxPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Submissions Inbox</h2>
        <p className="text-muted-foreground">
          Received form submissions. Process, create clients, or merge into existing profiles.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          No submissions yet. Submissions will appear here when forms are filled via shareable links.
        </CardContent>
      </Card>
    </div>
  );
}
