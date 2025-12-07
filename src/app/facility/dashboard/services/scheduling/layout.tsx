"use client";

import { Clock } from "lucide-react";

export default function SchedulingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-500">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Staff Scheduling
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage staff schedules, shifts, and coverage
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
